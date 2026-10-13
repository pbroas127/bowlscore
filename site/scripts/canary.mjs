// Scans the live backend the way the app does and exits 1 when anything is off, so the scheduled workflow fails and
// GitHub emails the owner before users notice. Three checks: the catalog loads, a catalog barcode scores, and a label
// photo is read by Gemini (the one paid call, about a twentieth of a cent). Needs no dependencies.
// Usage: CANARY_REFRESH_TOKEN=... node scripts/canary.mjs
import { readFileSync } from 'node:fs'

const API = process.env.API_URL ?? 'https://bowlscoreapp.vercel.app'
const FIREBASE_KEY = 'AIzaSyAsdAe5xauPZHaQOOOT7e5C9C_RhlV6PIc' // the public web key the app ships with
const failures = []
const check = (name, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`); if (!ok) failures.push(name) }
const timed = async (fn) => { const t = Date.now(); const out = await fn(); return [out, ((Date.now() - t) / 1000).toFixed(1)] }

// One long lived anonymous account, so the canary does not create a new Firebase user on every run.
const auth = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${process.env.CANARY_REFRESH_TOKEN}` }).then((r) => r.json()).catch(() => ({}))
check('sign in', Boolean(auth.id_token), auth.id_token ? '' : JSON.stringify(auth).slice(0, 200))
if (!auth.id_token) process.exit(1)
const scan = (body) => fetch(`${API}/api/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.id_token}` }, body: JSON.stringify({ species: 'dog', lifeStage: 'adult', ...body }), signal: AbortSignal.timeout(70_000) })

try {
  const catalog = await fetch(`${API}/api/catalog`, { signal: AbortSignal.timeout(30_000) }).then((r) => r.json())
  const products = catalog.products ?? []
  check('catalog', products.length > 250, `${products.length} products`)

  const withUpc = products.find((p) => p.sizes?.some((s) => s.upc))
  const upc = withUpc?.sizes.find((s) => s.upc).upc.replace(/\D/g, '')
  const [res, sec] = await timed(() => scan({ barcode: upc }))
  const hit = await res.json().catch(() => ({}))
  check('barcode scan', res.status === 200 && hit.productId === withUpc?.id && typeof hit.result?.score === 'number', `${res.status} in ${sec}s`)

  const image = readFileSync(new URL('./canary-label.jpg', import.meta.url)).toString('base64')
  const [res2, sec2] = await timed(() => scan({ images: [image] }))
  const read = await res2.json().catch(() => ({}))
  // The printed label has 12 ingredients and 26 percent protein. A reason comes back when Gemini itself failed (402 is "credits ran out").
  check('label scan', res2.status === 200 && read.label?.ingredients?.length >= 10 && read.label?.analysis?.proteinMin === 26, `${res2.status} in ${sec2}s${read.reason ? `, ${read.reason}` : ''}${read.error ? `, ${read.error}` : ''}`)
} catch (e) {
  check('backend reachable', false, e.message)
}

if (failures.length) { console.error(`\nBowlScore scans are NOT healthy: ${failures.join(', ')}`); process.exit(1) }
console.log('\nBowlScore scans are healthy')
