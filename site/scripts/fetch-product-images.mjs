// Downloads a real pack shot for every catalog product that has none yet, from the MANUFACTURER's own product
// page (og:image, else the JSON LD Product image), and writes public/products/<id>.webp, 600 px on the long side,
// under 80 KB. Products without a trustworthy image keep "image": null. Never a placeholder, never a hotlink.
//   node --env-file=../.env scripts/fetch-product-images.mjs          (the key is only used to FIND the product page)
//   node scripts/fetch-product-images.mjs --sync                      no network, only make catalog.json agree with the files on disk
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const CATALOG = path.resolve(import.meta.dirname, '../src/data/catalog.json')
const OUT = path.resolve(import.meta.dirname, '../public/products')
const RETAILERS = /chewy|petco|petsmart|amazon|walmart|target|tractorsupply|costco|kroger|instacart|ebay|samsclub|petflow|google|youtube|facebook|reddit|dogfoodadvisor|catfooddb|pawdiet/
// Found by hand where the search below came up empty. id: manufacturer product page.
const PAGES = {}
// Brands whose og:image is a banner or a packaging change graphic, not a pack shot. They go to the retailer source.
const SKIP_OG = /diamondpet|nutrish/

const BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
}
const get = (url, headers = BROWSER) => fetch(url, { headers, signal: AbortSignal.timeout(25_000) })
const host = (u) => { try { return new URL(u).hostname } catch { return '' } }
const tokens = (s) => [...new Set(s.toLowerCase().replace(/&amp;|&/g, ' and ').replace(/['’]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['and', 'with', 'the', 'for', 'recipe', 'formula', 'food', 'dog', 'cat', 'dry', 'wet'].includes(w)))]
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#0?38;/g, '&')

// Asks Gemini (search grounding, natural language so it really searches) for the brand's own product page.
async function findPages(e) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return []
  const q = `Search the web for the official product page of "${e.brand} ${e.name}" (${e.species} ${e.form === 'treat' ? 'treat' : 'food'}) on the ${e.brand} brand's own US website, not a retailer. Reply with the full URL only.`
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: q }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0 } }),
  }).catch(() => null)
  if (!res?.ok) return []
  const c = (await res.json()).candidates?.[0]
  const said = (c?.content?.parts?.map((p) => p.text ?? '').join('') ?? '').match(/https?:\/\/[^\s)\]"'<>*`]+/g) ?? []
  const chunks = await Promise.all((c?.groundingMetadata?.groundingChunks ?? []).slice(0, 6).map(async (g) => (await fetch(g.web.uri, { redirect: 'manual' }).catch(() => null))?.headers.get('location')))
  return [...said, ...chunks].filter(Boolean)
}

// The product image a page declares, but only when the page is clearly about this product.
async function imageOn(pageUrl, e) {
  const res = await get(pageUrl).catch(() => null)
  if (!res?.ok || !/html/.test(res.headers.get('content-type') ?? '')) return null
  const html = await res.text()
  const title = decode((html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1] ?? '') + ' ' + (html.match(/<title[^>]*>([^<]+)/i)?.[1] ?? ''))
  const want = tokens(e.name)
  const seen = new Set(tokens(title + ' ' + decodeURIComponent(new URL(res.url).pathname)))
  if (want.filter((t) => seen.has(t)).length / want.length < 0.6) return null
  const meta = html.match(/property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)/i)?.[1] ?? html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1]
  const ld = html.match(/"@type"\s*:\s*"Product"[\s\S]{0,3000}?"image"\s*:\s*\[?\s*"([^"]+)"/)?.[1]
  const found = SKIP_OG.test(host(pageUrl)) ? null : (meta ?? ld)
  if (!found || /logo|default|placeholder|favicon/i.test(found)) return null
  return new URL(decode(found).replace(/\\\//g, '/'), res.url).href
}

async function save(imageUrl, pageUrl, file) {
  const res = await get(imageUrl, { ...BROWSER, Accept: 'image/avif,image/webp,image/png,image/*;q=0.8', 'Sec-Fetch-Dest': 'image', 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Site': 'same-origin', Referer: pageUrl }).catch(() => null)
  if (!res?.ok) return false
  const input = Buffer.from(await res.arrayBuffer())
  const meta = await sharp(input).metadata().catch(() => null)
  if (!meta || Math.max(meta.width ?? 0, meta.height ?? 0) < 300) return false // thumbnails and tracking pixels
  for (const quality of [84, 76, 68, 58, 48]) {
    const out = await sharp(input).trim().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).webp({ quality, alphaQuality: 80 }).toBuffer()
    if (out.length < 80 * 1024) return fs.writeFileSync(file, out), true
  }
  return false
}

// Second source: the UPCitemdb trial search, which lists retailer pack shots for a product title. Amazon hosted
// images are skipped (Associates terms only allow those through their own API). The trial allows a few calls a minute.
let lastUpc = 0
async function upcImages(e, query = `${e.brand} ${e.name}`) {
  const wait = lastUpc + 11_000 - Date.now()
  lastUpc = Date.now() + Math.max(wait, 0)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  const res = await fetch(`https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(query)}&type=product&match_mode=0`, { signal: AbortSignal.timeout(25_000) }).catch(() => null)
  if (!res?.ok) return []
  const want = tokens(e.name)
  const brand = tokens(e.brand)
  const items = ((await res.json()).items ?? []).filter((i) => {
    const seen = new Set(tokens(`${i.brand ?? ''} ${i.title ?? ''}`))
    const other = new RegExp((e.species === 'dog' ? '\bcats?\b|kitten' : '\bdogs?\b|pupp') + (e.form === 'treat' ? '' : '|biscuit|treat|variety|bundle'), 'i')
    return brand.every((t) => seen.has(t)) && !other.test(i.title ?? '') && want.filter((t) => seen.has(t)).length / want.length >= 0.6
  })
  const rank = (u) => (/target.scene7|walmartimages|petco|chewy/.test(u) ? 0 : 1)
  return items.slice(0, 3).flatMap((i) => i.images ?? []).filter((u) => !/amazon|shld.net/.test(u)).sort((a, b) => rank(a) - rank(b)).slice(0, 6)
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
fs.mkdirSync(OUT, { recursive: true })
const sync = process.argv.includes('--sync')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const todo = catalog.filter((e) => !fs.existsSync(path.join(OUT, `${e.id}.webp`)) && (!only.length || only.includes(e.id)))
const worker = async () => {
  for (let e; !sync && (e = todo.shift()); ) {
    const file = path.join(OUT, `${e.id}.webp`)
    const own = (u) => u && !RETAILERS.test(host(u)) && !/\.pdf($|\?)/i.test(u)
    let done = false
    for (const find of [() => [PAGES[e.id], e.sourceUrl], () => findPages(e)]) {
      for (const page of [...new Set((await find()).filter(own))].slice(0, 5)) {
        const img = await imageOn(page, e).catch(() => null)
        if (img && (await save(img, page, file).catch(() => false))) { console.log(`ok   ${e.id}\n     ${img}`); done = true; break }
      }
      if (done) break
    }
    if (!done) for (const img of [...(await upcImages(e).catch(() => [])), ...(await upcImages(e, e.amazonQuery).catch(() => []))]) {
      if (await save(img, img, file).catch(() => false)) { console.log(`ok   ${e.id} (retailer shot)
     ${img}`); done = true; break }
    }
    if (!done) console.log(`none ${e.id}`)
  }
}
await Promise.all(Array.from({ length: 4 }, worker))

for (const e of catalog) e.image = fs.existsSync(path.join(OUT, `${e.id}.webp`)) ? `/products/${e.id}.webp` : null
fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n')
console.log(`${catalog.filter((e) => e.image).length} of ${catalog.length} products have an image`)
