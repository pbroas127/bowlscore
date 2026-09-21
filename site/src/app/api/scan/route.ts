// POST /api/scan. Reads a pet food label (photos through Gemini, or a barcode through Open Pet
// Food Facts) and scores it with the deterministic rubric. The model only transcribes; rubric.ts decides.
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { unstable_cache } from 'next/cache'
import { scanMatch } from '@/lib/catalog'
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
7. lifeStageClaim: from the nutritional adequacy (AAFCO) statement. "all" for all life stages, "growth" for growth, puppies or kittens (also growth and reproduction), "adult" for adult maintenance, otherwise "unknown".
8. largeSizeGrowth: "included" when the statement says including growth of large size dogs (70 lb or more as an adult), "excluded" when it says except for growth of large size dogs, otherwise "unknown".
9. calories: from the calorie content line (ME, metabolizable energy), as printed. kcalPerKg is kcal per kg. kcalPerCup is kcal per cup. kcalPerUnit is kcal per can, pouch, tray, treat, piece or stick, with that word in caloriesUnit. Omit what is not printed.
10. readable: false when the ingredient list is missing, cut off, or too blurry to transcribe with confidence. When false, return an empty ingredients list.`

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
    lifeStageClaim: { type: 'STRING', enum: ['all', 'growth', 'adult', 'unknown'] },
    largeSizeGrowth: { type: 'STRING', enum: ['included', 'excluded', 'unknown'] },
    calories: { type: 'OBJECT', nullable: true, properties: { kcalPerKg: { type: 'NUMBER', nullable: true }, kcalPerCup: { type: 'NUMBER', nullable: true }, kcalPerUnit: { type: 'NUMBER', nullable: true }, caloriesUnit: { type: 'STRING', nullable: true } } },
  },
  required: ['readable', 'speciesOnLabel', 'foodForm', 'isTreat', 'ingredients', 'aafco'],
}

type Extracted = Omit<LabelData, 'calories'> & { readable: boolean; speciesOnLabel: 'dog' | 'cat' | 'unknown'; calories?: { kcalPerKg?: number; kcalPerCup?: number; kcalPerUnit?: number; caloriesUnit?: string; unit?: string } | null }

// Measured 2026-09-21: with default "thinking" a phone sized photo takes over 70 s, with minimal thinking about 3 s
// when the service is healthy. The free tier also stalls or returns 503 on roughly one call in three, so a single
// long wait is the wrong shape: make short attempts and move to the next model instead of hanging.
// ponytail: alternate two models inside a fixed time budget. On a paid tier (priority serving) the first attempt is usually enough.
const MODELS = [process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']
const BUDGET_MS = 50_000 // the route is capped at 60 s
const ATTEMPT_MS = 13_000

async function readLabel(images: string[], apiKey: string): Promise<Extracted> {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: PROMPT }, ...images.map((data) => ({ inlineData: { mimeType: 'image/jpeg', data } }))] }],
    generationConfig: { temperature: 0, maxOutputTokens: 4000, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, thinkingConfig: { thinkingLevel: 'minimal' } },
  })
  const deadline = Date.now() + BUDGET_MS
  let last: unknown
  for (let i = 0; Date.now() < deadline - 3_000; i++) {
    const model = MODELS[i % MODELS.length]
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(Math.min(ATTEMPT_MS, deadline - Date.now())),
        body,
      })
      if (!res.ok) {
        last = new Error(`gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`)
        // Our request, key or billing is wrong (402 is "prepaid credits depleted"): retrying cannot help, and on
        // 2026-09-21 retrying a 402 for the whole budget made the app look frozen for 50 s. Only 429 is worth a retry.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break
        throw last
      }
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
      return JSON.parse(text)
    } catch (e) {
      last = e
      console.warn('label read attempt failed:', (e as Error).message)
      await new Promise((r) => setTimeout(r, 700)) // a refused request returns instantly, so pause before the next model
    }
  }
  throw last
}

interface Product { name: string; brand?: string }

// ponytail: UPCitemdb's keyless trial endpoint, 100 lookups a day per IP. Ceiling: shared Vercel IPs will hit that
// once there are real users. Upgrade path: their paid plan, or a barcode to product cache of our own.
async function identify(barcode: string): Promise<Product | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, { signal: AbortSignal.timeout(6_000) })
    const item = res.ok ? (await res.json())?.items?.[0] : null
    if (!item?.title) return null
    // "Purina ONE ... with Chicken & Rice - 16.5lbs" names the bag size; the recipe is the same across sizes.
    const name = String(item.title).replace(/\s*[-,]\s*[\d.]+\s*(lbs?|oz|kg|g|ct|count|pack)\b.*$/i, '').trim()
    return { name: name.slice(0, 120), brand: item.brand ? String(item.brand).slice(0, 60) : undefined }
  } catch {
    return null
  }
}

// Looks up the ingredient list the manufacturer or a major retailer publishes for a named product, using Gemini with
// Google Search grounding. Needs a paid Gemini tier: the free tier answers 429 to grounded calls, and then this simply
// returns null and the app asks for a label photo instead. One attempt only, a photo is always available as plan B.
async function webLabel(product: Product, apiKey: string): Promise<{ label: LabelData; species: 'dog' | 'cat' | 'unknown'; sourceUrl?: string } | null> {
  const prompt = `Find the official ingredient list and guaranteed analysis for this exact pet food product: "${product.name}"${product.brand ? ` by ${product.brand}` : ''}. Use the manufacturer's website or a major retailer such as Chewy or Petco. Reply with ONLY a JSON object and no markdown: {"found": boolean, "ingredients": string[] (label order, keep parentheses inside each ingredient), "proteinMin": number, "fatMin": number, "fiberMax": number, "moistureMax": number, "species": "dog" or "cat", "foodForm": "dry" or "wet", "completeAndBalanced": boolean, "isTreat": boolean, "sourceUrl": string}. If you cannot find this exact product and recipe, reply {"found": false}. Never guess or fill in ingredients from memory.`
  try {
    // Measured on Purina ONE: 3.1 flash lite returned 23 of 39 ingredients, 3.5 returned all 39. The tail of the list
    // is where colors, preservatives and menadione live, so completeness beats the two seconds saved.
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: 'minimal' } } }),
    })
    if (!res.ok) return null
    const candidate = (await res.json()).candidates?.[0]
    // Measured while building the catalog (2026-09-21): this model sometimes skips the search and answers from memory,
    // and then the list changes from run to run. No retrieved page means no answer; the app asks for a label photo.
    if (!candidate?.groundingMetadata?.groundingChunks?.length) return null
    const text: string = candidate.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    const x = JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''))
    if (!x?.found || !Array.isArray(x.ingredients) || x.ingredients.length < 5) return null
    const label = toLabel({ ...x, productName: product.name, brand: product.brand, analysis: x, aafco: x.completeAndBalanced ? 'complete' : 'not_found', readable: true, speciesOnLabel: x.species })
    return { label, species: x.species === 'dog' || x.species === 'cat' ? x.species : 'unknown', sourceUrl: typeof x.sourceUrl === 'string' ? x.sourceUrl.slice(0, 300) : undefined }
  } catch {
    return null
  }
}

// The grounded lookup is the one expensive call in this route (a search fee of a few cents), and popular foods get
// scanned again and again. Remember each barcode's answer for 90 days in the Vercel data cache, so a product is paid
// for once. A miss throws so that only real answers are remembered.
const cachedWebLabel = (barcode: string, product: Product, apiKey: string) =>
  unstable_cache(async () => { const hit = await webLabel(product, apiKey); if (!hit) throw new Error('miss'); return hit }, ['web-label-v1', barcode], { revalidate: 90 * 86_400 })().catch(() => null)

// The schema allows nulls, the rubric wants undefined, and nothing from the model is trusted blindly.
function toLabel(x: Extracted): LabelData {
  const pct = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 100 ? v : undefined)
  const a = x.analysis ?? {}
  const kcal = (v: unknown, max: number) => (typeof v === 'number' && v > 0 && v <= max ? Math.round(v) : undefined)
  const c = x.calories ?? {}
  const calories = { kcalPerKg: kcal(c.kcalPerKg, 9000), kcalPerCup: kcal(c.kcalPerCup, 1000), kcalPerUnit: kcal(c.kcalPerUnit, 3000), unit: typeof (c.caloriesUnit ?? c.unit) === 'string' ? String(c.caloriesUnit ?? c.unit).toLowerCase().replace(/[^a-z ]/g, '').trim().slice(0, 16) || undefined : undefined }
  return {
    productName: x.productName || undefined,
    brand: x.brand || undefined,
    foodForm: x.foodForm ?? 'unknown',
    isTreat: !!x.isTreat,
    ingredients: (Array.isArray(x.ingredients) ? x.ingredients : []).filter((i) => typeof i === 'string' && i.trim()).slice(0, 120),
    analysis: { proteinMin: pct(a.proteinMin), fatMin: pct(a.fatMin), fiberMax: pct(a.fiberMax), moistureMax: pct(a.moistureMax), ashMax: pct(a.ashMax), taurineMin: pct(a.taurineMin) },
    aafco: ['complete', 'supplemental'].includes(x.aafco) ? x.aafco : 'not_found',
    lifeStageClaim: (['all', 'growth', 'adult'] as const).find((v) => v === x.lifeStageClaim) ?? 'unknown',
    largeSizeGrowth: (['included', 'excluded'] as const).find((v) => v === x.largeSizeGrowth) ?? 'unknown',
    calories: calories.kcalPerKg || calories.kcalPerCup || calories.kcalPerUnit ? calories : undefined,
  }
}

// When the scanned product is one of ours, the app gets its catalog id and pack shot: { productId, image }. Otherwise nothing.
// The species printed on the package wins over the pet the user picked, a cat owner can scan a dog food.
const known = (label: LabelData, onLabel: string, asked: Species) => scanMatch(label, onLabel === 'dog' || onLabel === 'cat' ? onLabel : asked)

export async function POST(req: Request) {
  const uid = await firebaseUid(req)
  if (uid === null) return json({ error: 'unauthorized' }, 401)

  let body: { species?: Species; lifeStage?: LifeStage; images?: unknown; barcode?: unknown; product?: { name?: unknown; brand?: unknown }; label?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { species, lifeStage = 'adult', images, barcode } = body ?? {}
  const short = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : undefined)
  let hint: Product | null = short(body?.product?.name) ? { name: short(body.product!.name)!, brand: short(body.product!.brand) } : null
  if (species !== 'dog' && species !== 'cat') return json({ error: 'invalid_species' }, 400)
  if (!['growth', 'adult', 'senior'].includes(lifeStage)) return json({ error: 'invalid_life_stage' }, 400)
  if (barcode != null && (typeof barcode !== 'string' || !/^\d{6,14}$/.test(barcode))) return json({ error: 'invalid_barcode' }, 400)
  if (images != null) {
    const ok = Array.isArray(images) && images.length >= 1 && images.length <= MAX_IMAGES && images.every((i) => typeof i === 'string' && i.length > 0 && i.length <= MAX_IMAGE_CHARS && /^[A-Za-z0-9+/]+={0,2}$/.test(i))
    if (!ok) return json({ error: 'invalid_images', message: `Send 1 to ${MAX_IMAGES} base64 JPEG strings without a data prefix, 4 MB each at most.` }, 400)
  }
  // Rescore: the app sends back a label it already has, to score it for another pet or after the person corrects
  // "this is a treat". No AI call, so it is free and instant. The label is cleaned exactly like a fresh read.
  if (barcode == null && images == null && body.label && typeof body.label === 'object') {
    const label = toLabel({ ...(body.label as Extracted), readable: true })
    if (label.ingredients.length < 3) return json({ error: 'invalid_label' }, 400)
    return json({ id: crypto.randomUUID(), source: 'label', label, result: scoreFood(label, species, lifeStage), speciesOnLabel: 'unknown', ...known(label, 'unknown', species) })
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
    if (mapped) return json({ id: crypto.randomUUID(), source: 'barcode', label: mapped.label, result: scoreFood(mapped.label, species, lifeStage), speciesOnLabel: mapped.speciesOnLabel, ...known(mapped.label, mapped.speciesOnLabel, species) })

    // Open Pet Food Facts is thin in the US (about 1,000 products, checked 2026-09-21), so name the product from its
    // UPC, then try the published ingredient list. Whatever happens, the app learns WHAT was scanned.
    const found = await identify(barcode)
    const key = process.env.GEMINI_API_KEY
    const web = found && key ? await cachedWebLabel(barcode, found, key) : null
    if (web) return json({ id: crypto.randomUUID(), source: 'web', sourceUrl: web.sourceUrl, label: web.label, result: scoreFood(web.label, species, lifeStage), speciesOnLabel: web.species, ...known(web.label, web.species, species) })
    // The app can send the label photos along with the barcode, so a miss is never a dead end.
    if (images == null) return json({ error: 'barcode_not_found', product: found }, 404)
    hint = found ?? hint
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
  // A close up of the ingredients panel rarely shows the product name. A barcode scanned just before does.
  if (hint) { label.productName ??= hint.name; label.brand ??= hint.brand }
  if (!extracted.readable || label.ingredients.length < 3) return json({ error: 'unreadable', message: 'That photo was too blurry to read. Try again with more light.' }, 422)

  const speciesOnLabel = ['dog', 'cat'].includes(extracted.speciesOnLabel) ? extracted.speciesOnLabel : 'unknown'
  return json({ id: crypto.randomUUID(), source: 'label', label, result: scoreFood(label, species, lifeStage), speciesOnLabel, ...known(label, speciesOnLabel, species) })
}
