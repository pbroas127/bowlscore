// POST /api/scan. Reads a pet food label (photos through Gemini, or a barcode through Open Pet
// Food Facts) and scores it with the deterministic rubric. The model only transcribes; rubric.ts decides.
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { labelFromOpff } from '@/lib/openpetfoodfacts'
import { scoreFood, type LabelData, type LifeStage, type Species } from '@/lib/rubric'

export const runtime = 'nodejs'
export const maxDuration = 60

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS })

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })

const MAX_IMAGES = 3
const MAX_IMAGE_CHARS = 4 * 1024 * 1024 // 4 MB of base64 text per image
const DAILY_LIMIT = 30

// ponytail: in memory counter, per server instance. Ceiling: it resets on every cold start and each
// serverless instance counts separately, so the real cap is 30 times the number of warm instances.
// Upgrade path: a Firestore counter document per uid (or Upstash) once abuse shows up in the Gemini bill.
const usage = new Map<string, number>()
let usageDay = ''
function overLimit(key: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== usageDay) {
    usage.clear()
    usageDay = today
  }
  const count = (usage.get(key) ?? 0) + 1
  usage.set(key, count)
  return count > DAILY_LIMIT
}

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))

// Returns the Firebase uid, null when the token is bad, or undefined in dev mode (no project configured).
async function firebaseUid(req: Request): Promise<string | null | undefined> {
  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId) return undefined
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId, algorithms: ['RS256'] })
    return payload.sub || null
  } catch {
    return null
  }
}

const PROMPT = `You are reading photos of a pet food package. Transcribe only what is printed on the label. Never guess, never fill in from memory of a brand, and leave a field out when it is not clearly visible.

Rules:
1. ingredients: every ingredient in the exact order printed. Keep any parenthetical text inside the ingredient string, for example "Chicken fat (preserved with mixed tocopherols)". Do not split vitamins or minerals out of their parentheses. Do not translate, reorder, merge or drop anything.
2. analysis: numbers from the guaranteed analysis panel as printed, as fed, in percent. proteinMin is crude protein minimum, fatMin is crude fat minimum, fiberMax is crude fiber maximum, moistureMax is moisture maximum, ashMax is ash maximum, taurineMin is taurine minimum. Omit any value that is not printed. Do not convert to dry matter.
3. aafco: "complete" when the label says complete and balanced, or formulated to meet AAFCO nutrient profiles, or that feeding tests substantiate complete nutrition. "supplemental" when it says intermittent or supplemental feeding only. Otherwise "not_found".
4. isTreat: true when the package is a treat, chew, snack or topper rather than a meal.
5. foodForm: dry for kibble, wet for cans, pouches and trays, semi_moist for soft chewy pieces, freeze_dried, raw, or unknown.
6. speciesOnLabel: dog or cat when the package says so, otherwise unknown.
7. readable: false when the ingredient list is missing, cut off, or too blurry to transcribe with confidence. When false, return an empty ingredients list.`

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    readable: { type: 'BOOLEAN' },
    speciesOnLabel: { type: 'STRING', enum: ['dog', 'cat', 'unknown'] },
    productName: { type: 'STRING', nullable: true },
    brand: { type: 'STRING', nullable: true },
    foodForm: { type: 'STRING', enum: ['dry', 'wet', 'semi_moist', 'freeze_dried', 'raw', 'unknown'] },
    isTreat: { type: 'BOOLEAN' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
    analysis: {
      type: 'OBJECT',
      nullable: true,
      properties: Object.fromEntries(['proteinMin', 'fatMin', 'fiberMax', 'moistureMax', 'ashMax', 'taurineMin'].map((k) => [k, { type: 'NUMBER', nullable: true }])),
    },
    aafco: { type: 'STRING', enum: ['complete', 'supplemental', 'not_found'] },
  },
  required: ['readable', 'speciesOnLabel', 'foodForm', 'isTreat', 'ingredients', 'aafco'],
}

type Extracted = LabelData & { readable: boolean; speciesOnLabel: 'dog' | 'cat' | 'unknown' }

// Measured 2026-09-21: with default "thinking" a phone sized photo takes over 70 s, with minimal thinking about 3 s
// when the service is healthy. The free tier also stalls or returns 503 on roughly one call in three, so a single
// long wait is the wrong shape: make short attempts and move to the next model instead of hanging.
// ponytail: fixed attempt list. If the key moves to a paid tier (priority serving) one attempt is usually enough.
const ATTEMPTS: [model: string, timeoutMs: number][] = [
  [process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite', 13_000],
  ['gemini-3.5-flash-lite', 15_000],
  [process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite', 18_000],
]

async function readLabel(images: string[], apiKey: string): Promise<Extracted> {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: PROMPT }, ...images.map((data) => ({ inlineData: { mimeType: 'image/jpeg', data } }))] }],
    generationConfig: { temperature: 0, maxOutputTokens: 4000, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, thinkingConfig: { thinkingLevel: 'minimal' } },
  })
  let last: unknown
  for (const [model, timeoutMs] of ATTEMPTS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(timeoutMs),
        body,
      })
      if (!res.ok) throw new Error(`gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
      return JSON.parse(text)
    } catch (e) {
      last = e
      console.warn('label read attempt failed:', (e as Error).message)
    }
  }
  throw last
}

// The schema allows nulls, the rubric wants undefined, and nothing from the model is trusted blindly.
function toLabel(x: Extracted): LabelData {
  const pct = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 100 ? v : undefined)
  const a = x.analysis ?? {}
  return {
    productName: x.productName || undefined,
    brand: x.brand || undefined,
    foodForm: x.foodForm ?? 'unknown',
    isTreat: !!x.isTreat,
    ingredients: (Array.isArray(x.ingredients) ? x.ingredients : []).filter((i) => typeof i === 'string' && i.trim()).slice(0, 120),
    analysis: { proteinMin: pct(a.proteinMin), fatMin: pct(a.fatMin), fiberMax: pct(a.fiberMax), moistureMax: pct(a.moistureMax), ashMax: pct(a.ashMax), taurineMin: pct(a.taurineMin) },
    aafco: ['complete', 'supplemental'].includes(x.aafco) ? x.aafco : 'not_found',
  }
}

export async function POST(req: Request) {
  const uid = await firebaseUid(req)
  if (uid === null) return json({ error: 'unauthorized' }, 401)

  let body: { species?: Species; lifeStage?: LifeStage; images?: unknown; barcode?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { species, lifeStage = 'adult', images, barcode } = body ?? {}
  if (species !== 'dog' && species !== 'cat') return json({ error: 'invalid_species' }, 400)
  if (!['growth', 'adult', 'senior'].includes(lifeStage)) return json({ error: 'invalid_life_stage' }, 400)
  if (barcode != null && (typeof barcode !== 'string' || !/^\d{6,14}$/.test(barcode))) return json({ error: 'invalid_barcode' }, 400)
  if (images != null) {
    const ok = Array.isArray(images) && images.length >= 1 && images.length <= MAX_IMAGES && images.every((i) => typeof i === 'string' && i.length > 0 && i.length <= MAX_IMAGE_CHARS && /^[A-Za-z0-9+/]+={0,2}$/.test(i))
    if (!ok) return json({ error: 'invalid_images', message: `Send 1 to ${MAX_IMAGES} base64 JPEG strings without a data prefix, 4 MB each at most.` }, 400)
  }
  if (barcode == null && images == null) return json({ error: 'missing_input', message: 'Send images or a barcode.' }, 400)

  const who = uid ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (overLimit(who)) return json({ error: 'rate_limited', message: 'Daily scan limit reached. Try again tomorrow.' }, 429)

  if (typeof barcode === 'string') {
    const res = await fetch(`https://world.openpetfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers: { 'User-Agent': 'BowlScore/1.0 (pbroas127+bowlscore@gmail.com)' },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null)
    const product = res?.ok ? (await res.json().catch(() => null))?.product : null
    const mapped = product ? labelFromOpff(product) : null
    if (mapped) return json({ id: crypto.randomUUID(), source: 'barcode', label: mapped.label, result: scoreFood(mapped.label, species, lifeStage), speciesOnLabel: mapped.speciesOnLabel })
    // The app can send the label photos along with the barcode, so a miss is never a dead end.
    if (images == null) return json({ error: 'barcode_not_found' }, 404)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return json({ error: 'not_configured' }, 503)

  let extracted: Extracted
  try {
    extracted = await readLabel(images as string[], apiKey)
  } catch (err) {
    console.error('scan: label read failed', err)
    return json({ error: 'vision_failed', message: 'We could not read that label right now. Try again in a moment.' }, 502)
  }
  const label = toLabel(extracted)
  if (!extracted.readable || label.ingredients.length < 3) return json({ error: 'unreadable', message: 'That photo was too blurry to read. Try again with more light.' }, 422)

  const speciesOnLabel = ['dog', 'cat'].includes(extracted.speciesOnLabel) ? extracted.speciesOnLabel : 'unknown'
  return json({ id: crypto.randomUUID(), source: 'label', label, result: scoreFood(label, species, lifeStage), speciesOnLabel })
}
