// Builds src/data/catalog.json from the hand written SEEDS below.
//   node --env-file=../.env scripts/build-catalog.mjs            fetch every seed that is not in the catalog yet
//   node scripts/build-catalog.mjs --check                       no network, sanity check the existing file
//   node scripts/build-catalog.mjs --add scripts/catalog-manual.json
//   node scripts/build-catalog.mjs --dry scripts/catalog-batches/x.json    validate a batch, write nothing (safe in parallel)
//   node scripts/build-catalog.mjs --patch scripts/patch.json              merge fields into existing entries by id
//        A batch item may carry its own seed (brand, name, species, form, lifeStage, priceTier) instead of being in
//        SEEDS, plus optional calories { kcalPerKg, kcalPerCup, kcalPerUnit, unit }, lifeStageClaim, largeSizeGrowth,
//        line, flavor, formula, sizes, asin.
//        no network either. Adds hand transcribed labels (from a manufacturer page or label PDF that the model could
//        not open, or when the API is unavailable) through exactly the same cleaning and checks. Each item:
//        { id, sourceUrl, ingredientsText (the list as printed, comma separated), proteinMin, fatMin, fiberMax,
//          moistureMax, ashMax, taurineMin, completeAndBalanced }
//
// Per product: one Gemini call with Google Search AND the URL context tool. Measured 2026-09-21: with search
// grounding alone (the webLabel approach in api/scan/route.ts) gemini-3.5-flash-lite returned NO grounding metadata
// for the JSON prompt and three different ingredient lists on three runs, so it was answering from memory.
// gemini-3.5-flash with url_context really opens the page (urlContextMetadata proves it), so an entry is only
// accepted when a page was retrieved and the reported sourceUrl is one of the retrieved pages.
// COST WARNING: the first full run (47 products, 2026-09-21) cost about $16, not the one to two cents per product first
// estimated: default thinking on gemini-3.5-flash bills its reasoning as output tokens, on top of whole web pages as
// input and the search fee. Thinking is now minimal, and a network run needs the explicit --paid flag.
// Prefer --add with hand transcribed labels, which is free. Resumable: ids already in the file are skipped.
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve(import.meta.dirname, '../src/data/catalog.json')
const MODEL = 'gemini-3.5-flash'

// [brand, name, species, form, lifeStage, priceTier]  priceTier: 1 budget, 2 mid, 3 premium (typical price per pound)
const SEEDS = [
  // dry dog
  ['Purina ONE', 'Chicken & Rice Formula', 'dog', 'dry', 'adult', 1],
  ['Purina Pro Plan', 'Complete Essentials Shredded Blend Chicken & Rice Formula', 'dog', 'dry', 'adult', 2],
  ['Purina Pro Plan', 'Puppy Chicken & Rice Formula', 'dog', 'dry', 'growth', 2],
  ['Purina Dog Chow', 'Complete Adult with Real Chicken', 'dog', 'dry', 'adult', 1],
  ['Pedigree', 'Complete Nutrition Adult Roasted Chicken, Rice & Vegetable Flavor', 'dog', 'dry', 'adult', 1],
  ["Kibbles 'n Bits", 'Original Savory Beef & Chicken Flavors', 'dog', 'dry', 'adult', 1],
  ['Iams', 'Proactive Health Adult Minichunks Chicken & Whole Grains Recipe', 'dog', 'dry', 'adult', 1],
  ['Kirkland Signature', 'Adult Formula Chicken, Rice & Vegetable', 'dog', 'dry', 'adult', 1],
  ['Diamond Naturals', 'Chicken & Rice Formula All Life Stages', 'dog', 'dry', 'all', 1],
  ['Rachael Ray Nutrish', 'Real Chicken & Veggies Recipe', 'dog', 'dry', 'adult', 1],
  ['Blue Buffalo', 'Life Protection Formula Adult Chicken & Brown Rice Recipe', 'dog', 'dry', 'adult', 2],
  ['Blue Buffalo', 'Wilderness Adult Chicken Recipe', 'dog', 'dry', 'adult', 2],
  ["Hill's Science Diet", 'Adult Chicken & Barley Recipe', 'dog', 'dry', 'adult', 2],
  ['Royal Canin', 'Medium Adult', 'dog', 'dry', 'adult', 2],
  ['Taste of the Wild', 'High Prairie Canine Recipe with Roasted Bison & Roasted Venison', 'dog', 'dry', 'all', 2],
  ['Wellness', 'Complete Health Adult Deboned Chicken & Oatmeal Recipe', 'dog', 'dry', 'adult', 2],
  ['Merrick', 'Grain Free Real Texas Beef + Sweet Potato Recipe', 'dog', 'dry', 'adult', 2],
  ['Nutro', 'Natural Choice Adult Chicken & Brown Rice Recipe', 'dog', 'dry', 'adult', 2],
  ['Natural Balance', 'Limited Ingredient Lamb & Brown Rice Recipe', 'dog', 'dry', 'adult', 2],
  ['Orijen', 'Original', 'dog', 'dry', 'all', 3],
  ['Acana', 'Free-Run Poultry Recipe', 'dog', 'dry', 'all', 3],
  ['Open Farm', 'Grass Fed Beef & Ancient Grains', 'dog', 'dry', 'all', 3],
  ['Instinct', 'Original Grain Free Recipe with Real Chicken', 'dog', 'dry', 'all', 3],
  ['Ziwi Peak', 'Air Dried Beef Recipe', 'dog', 'dry', 'all', 3],
  ["Stella & Chewy's", "Chewy's Chicken Dinner Patties Freeze Dried Raw", 'dog', 'freeze_dried', 'all', 3],
  // wet dog
  ['Pedigree', 'Chopped Ground Dinner with Chicken', 'dog', 'wet', 'adult', 1],
  ['Rachael Ray Nutrish', 'Chicken Paw Pie', 'dog', 'wet', 'adult', 1],
  ['Cesar', 'Classic Loaf in Sauce Filet Mignon Flavor', 'dog', 'wet', 'adult', 2],
  ['Purina Pro Plan', 'Complete Essentials Chicken & Rice Entree Classic', 'dog', 'wet', 'adult', 2],
  ['Blue Buffalo', 'Homestyle Recipe Chicken Dinner with Garden Vegetables', 'dog', 'wet', 'adult', 2],
  ["Hill's Science Diet", 'Adult Chicken & Barley Entree', 'dog', 'wet', 'adult', 2],
  ['Wellness', 'Complete Health Chicken & Sweet Potato Pate', 'dog', 'wet', 'adult', 2],
  ['Merrick', 'Grain Free Cowboy Cookout', 'dog', 'wet', 'adult', 3],
  ['Weruva', 'Paw Lickin Chicken in Gravy', 'dog', 'wet', 'adult', 3],
  ['Instinct', 'Original Real Beef Recipe', 'dog', 'wet', 'all', 3],
  // dry cat
  ['Meow Mix', 'Original Choice', 'cat', 'dry', 'adult', 1],
  ['Friskies', 'Seafood Sensations', 'cat', 'dry', 'adult', 1],
  ['Purina Cat Chow', 'Complete', 'cat', 'dry', 'all', 1],
  ['9Lives', 'Daily Essentials', 'cat', 'dry', 'adult', 1],
  ['Purina ONE', 'Tender Selects Blend with Real Chicken', 'cat', 'dry', 'adult', 1],
  ['Iams', 'Proactive Health Indoor Weight & Hairball Care', 'cat', 'dry', 'adult', 1],
  ['Kirkland Signature', 'Maintenance Cat Chicken & Rice Formula', 'cat', 'dry', 'adult', 1],
  ['Rachael Ray Nutrish', 'Real Chicken & Brown Rice Recipe', 'cat', 'dry', 'adult', 1],
  ['Purina Pro Plan', 'Complete Essentials Chicken & Rice Formula', 'cat', 'dry', 'adult', 2],
  ['Purina Pro Plan', 'Kitten Chicken & Rice Formula', 'cat', 'dry', 'growth', 2],
  ['Blue Buffalo', 'Wilderness Adult Chicken Recipe', 'cat', 'dry', 'adult', 2],
  ['Blue Buffalo', 'Tastefuls Indoor Natural Adult Chicken & Brown Rice Recipe', 'cat', 'dry', 'adult', 2],
  ["Hill's Science Diet", 'Adult Indoor Chicken Recipe', 'cat', 'dry', 'adult', 2],
  ['Taste of the Wild', 'Rocky Mountain Feline Recipe with Roasted Venison & Smoked Salmon', 'cat', 'dry', 'all', 2],
  ['Wellness', 'Complete Health Adult Deboned Chicken, Chicken Meal & Rice Recipe', 'cat', 'dry', 'adult', 2],
  ['Nutro', 'Wholesome Essentials Indoor Adult Chicken & Brown Rice Recipe', 'cat', 'dry', 'adult', 2],
  ['Natural Balance', 'Limited Ingredient Green Pea & Chicken Recipe', 'cat', 'dry', 'adult', 2],
  ['Royal Canin', 'Indoor Adult', 'cat', 'dry', 'adult', 3],
  ['Orijen', 'Original Cat', 'cat', 'dry', 'all', 3],
  ['Acana', 'Bountiful Catch', 'cat', 'dry', 'adult', 3],
  ['Open Farm', 'Wild Caught Salmon Recipe', 'cat', 'dry', 'all', 3],
  ['Instinct', 'Original Grain Free Recipe with Real Chicken', 'cat', 'dry', 'all', 3],
  ["Stella & Chewy's", 'Chick Chick Chicken Dinner Morsels Freeze Dried Raw', 'cat', 'freeze_dried', 'all', 3],
  // wet cat
  ['Friskies', 'Classic Pate Turkey & Giblets Dinner', 'cat', 'wet', 'all', 1],
  ['Fancy Feast', 'Classic Pate Tender Beef Feast', 'cat', 'wet', 'all', 2],
  ['Fancy Feast', 'Gravy Lovers Chicken Feast in Grilled Chicken Flavor Gravy', 'cat', 'wet', 'adult', 2],
  ['Sheba', 'Perfect Portions Pate Roasted Chicken Entree', 'cat', 'wet', 'adult', 2],
  ['Blue Buffalo', 'Tastefuls Chicken Entree Pate', 'cat', 'wet', 'adult', 2],
  ["Hill's Science Diet", 'Adult Savory Chicken Entree', 'cat', 'wet', 'adult', 2],
  ['Wellness', 'Complete Health Pate Chicken Entree', 'cat', 'wet', 'adult', 2],
  ['Royal Canin', 'Adult Instinctive Thin Slices in Gravy', 'cat', 'wet', 'adult', 3],
  ['Tiki Cat', 'Puka Puka Luau Succulent Chicken in Chicken Consomme', 'cat', 'wet', 'all', 3],
  ['Weruva', 'Paw Lickin Chicken in Gravy', 'cat', 'wet', 'adult', 3],
  ['Ziwi Peak', 'Wet Chicken Recipe', 'cat', 'wet', 'all', 3],
  ['Instinct', 'Original Real Chicken Recipe Pate', 'cat', 'wet', 'all', 3],
  // treats
  ['Milk-Bone', 'Original Dog Biscuits', 'dog', 'treat', 'adult', 1],
  ["Beggin'", 'Strips Original with Bacon', 'dog', 'treat', 'adult', 1],
  ['Pup-Peroni', 'Original Beef Flavor', 'dog', 'treat', 'adult', 1],
  ['Greenies', 'Original Regular Dental Dog Treats', 'dog', 'treat', 'adult', 2],
  ['Blue Buffalo', 'Blue Bits Tender Beef Recipe Training Treats', 'dog', 'treat', 'all', 2],
  ["Zuke's", 'Mini Naturals Chicken Recipe', 'dog', 'treat', 'all', 2],
  ['Temptations', 'Classic Tasty Chicken Flavor', 'cat', 'treat', 'adult', 1],
  ['Greenies', 'Feline Dental Treats Oven Roasted Chicken Flavor', 'cat', 'treat', 'adult', 2],
  ['Inaba', 'Churu Tuna Recipe', 'cat', 'treat', 'all', 2],
  ['Wellness', 'Soft Puppy Bites Lamb & Salmon Recipe', 'dog', 'treat', 'growth', 2],
  ['Old Mother Hubbard', 'Classic P-Nuttier Mini Biscuits', 'dog', 'treat', 'adult', 2],
  ['Blue Buffalo', 'Nudges Grillers Steak', 'dog', 'treat', 'all', 2],
  ['Full Moon', 'Chicken Jerky', 'dog', 'treat', 'all', 3],
  ['Stewart', 'Freeze Dried Beef Liver', 'dog', 'treat', 'all', 3],
  ['PureBites', 'Chicken Breast Freeze Dried', 'dog', 'treat', 'all', 3],
  ['PureBites', 'Chicken Breast Freeze Dried', 'cat', 'treat', 'all', 3],
  ['Vital Essentials', 'Freeze Dried Minnows', 'cat', 'treat', 'all', 3],
].map(([brand, name, species, form, lifeStage, priceTier]) => ({ brand, name, species, form, lifeStage, priceTier }))

const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const idOf = (s) => slug(`${s.brand} ${s.name} ${s.species}`)
const KIND = { dry: 'dry', wet: 'wet', freeze_dried: 'freeze dried', raw: 'raw' }
const amazonQuery = (s) => `${s.brand} ${s.name} ${s.form === 'treat' ? `${s.species} treats` : `${KIND[s.form]} ${s.species} food`}`

// "Vitamins [A, B (x), C]" sometimes comes back split on its inner commas. Glue pieces until brackets balance.
const depth = (s) => [...s].reduce((d, c) => d + ('([{'.includes(c) ? 1 : ')]}'.includes(c) ? -1 : 0), 0)
export function cleanIngredients(list) {
  const out = []
  for (const raw of list) {
    const item = String(raw).replace(/\s+/g, ' ').replace(/[.;,]+$/, '').trim()
    if (!item) continue
    if (out.length && depth(out[out.length - 1]) > 0) out[out.length - 1] += ', ' + item
    else out.push(item)
  }
  return out
}

// Returns a list of problems, empty when the entry is fit to publish.
export function problems(e) {
  const p = []
  const a = e.label.analysis ?? {}
  const n = e.label.ingredients.length
  const complete = e.label.aafco === 'complete' && !e.label.isTreat
  if (!e.label.ingredients[0]?.trim()) p.push('first ingredient empty')
  if (e.form !== 'treat' && !complete) p.push('complete food without a complete and balanced statement')
  if (e.form !== 'treat' && n < 8) p.push(`only ${n} ingredients`)
  // No minimum for treats: single ingredient treats (freeze dried liver, chicken breast, minnows) are real products.
  if (n > 110) p.push(`${n} ingredients`)
  if (e.label.ingredients.some((i) => depth(i) !== 0)) p.push('unbalanced brackets')
  if (new Set(e.label.ingredients.map((i) => i.toLowerCase())).size < n - 1) p.push('repeated ingredients')
  // A complete food always ends in a vitamin and mineral premix. Without one the list was cut short.
  if (complete && !e.label.ingredients.some((i) => /vitamin|supplement|sulfate|proteinate|selenite|chelate/i.test(i))) p.push('no vitamins or minerals, list looks truncated')
  if (e.form !== 'treat') {
    if (!(a.proteinMin >= 5 && a.proteinMin <= 60)) p.push(`protein ${a.proteinMin}`)
    if (!(a.fatMin >= 1 && a.fatMin <= 50)) p.push(`fat ${a.fatMin}`)
    const wet = e.form === 'wet' || e.form === 'raw'
    if (a.moistureMax != null && (wet ? a.moistureMax < 60 : a.moistureMax > 20)) p.push(`moisture ${a.moistureMax} for ${e.form}`)
    if (wet ? a.proteinMin > 25 : a.proteinMin < 15) p.push(`protein ${a.proteinMin} implausible for ${e.form}`)
  }
  if (a.fiberMax != null && a.fiberMax > 15) p.push(`fiber ${a.fiberMax}`)
  // Calories out of any real range mean a typo or the wrong unit (kcal per lb read as per kg, per bag read as per cup).
  const c = e.label.calories
  if (c) {
    const dryish = e.form === 'dry' || e.form === 'freeze_dried'
    if (c.kcalPerKg != null && !(dryish ? c.kcalPerKg >= 2500 && c.kcalPerKg <= 5800 : e.form === 'treat' ? c.kcalPerKg >= 500 && c.kcalPerKg <= 6000 : c.kcalPerKg >= 400 && c.kcalPerKg <= 2500)) p.push(`kcal per kg ${c.kcalPerKg} for ${e.form}`)
    if (c.kcalPerCup != null && !(c.kcalPerCup >= 150 && c.kcalPerCup <= 700)) p.push(`kcal per cup ${c.kcalPerCup}`)
    if (c.kcalPerUnit != null && !c.unit) p.push('kcal per unit without a unit')
  }
  if ((e.flavor || e.formula) && !e.line) p.push('flavor or formula without a line')
  if (!/^https:\/\//.test(e.sourceUrl ?? '')) p.push('no source url')
  return p
}

const prompt = (s) => `Task: transcribe the official ingredient list and guaranteed analysis of this exact US pet food product: "${s.brand} ${s.name}" (${s.form === 'treat' ? `${s.species} treat` : `${KIND[s.form]} ${s.species} food`}).
Step 1: use Google Search to find the product page on the manufacturer's US website (preferred), or on Chewy, Petco, PetSmart or Tractor Supply.
Step 2: open that page with the URL context tool and read the ingredient list and guaranteed analysis from the page itself. If the page does not show them, open another one.
Reply with ONLY a JSON object and no markdown:
{"found": boolean, "nameOnPage": string, "ingredients": string[], "proteinMin": number, "fatMin": number, "fiberMax": number or null, "moistureMax": number or null, "ashMax": number or null, "taurineMin": number or null, "species": "dog" or "cat", "foodForm": "dry" or "wet" or "semi_moist" or "freeze_dried" or "raw", "completeAndBalanced": boolean, "supplementalOnly": boolean, "isTreat": boolean, "sourceUrl": string}
Rules: ingredients in label order with the exact wording on the page, every ingredient to the very end of the list including all vitamins and minerals, parentheses and brackets kept inside one string. Numbers are as fed percentages as printed. fiberMax is CRUDE fiber only: when the page shows only "Dietary Fiber" (the newer Pet Nutrition Facts box) use null. completeAndBalanced is true only when the page says complete and balanced or names the AAFCO nutrient profiles or feeding tests. supplementalOnly is true when it says intermittent or supplemental feeding. sourceUrl is the page you actually opened and read.
If you could not open a page that lists the ingredients of this exact recipe, reply {"found": false}. Never fill in anything from memory.`

async function resolve(uri) {
  if (!uri.includes('grounding-api-redirect')) return uri
  const r = await fetch(uri, { redirect: 'manual', signal: AbortSignal.timeout(10_000) }).catch(() => null)
  return r?.headers.get('location') ?? null
}
const hostPath = (u) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/$/, '') } catch { return '' } }

async function lookup(seed) {
  if (!process.argv.includes('--paid')) throw new Error('network lookups cost real money, pass --paid to allow them')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(150_000),
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt(seed) }] }], tools: [{ google_search: {} }, { url_context: {} }], generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: 'minimal' } } }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const c = (await res.json()).candidates?.[0]
  const text = c?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text.trim()) throw new Error(`empty answer, finishReason ${c?.finishReason}`)
  const x = JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''))
  if (!x?.found || !Array.isArray(x.ingredients)) throw new Error('not found')

  const opened = (await Promise.all((c.urlContextMetadata?.urlMetadata ?? []).filter((u) => u.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS').map((u) => resolve(u.retrievedUrl)))).filter(Boolean)
  if (!opened.length) throw new Error('no page was opened, answer would be from memory')
  x.sourceUrl = (await resolve(String(x.sourceUrl ?? ''))) ?? ''
  const claimed = hostPath(x.sourceUrl)
  const sourceUrl = opened.find((u) => hostPath(u) === claimed) ?? opened.find((u) => new URL(u).hostname === (URL.canParse(x.sourceUrl) ? new URL(x.sourceUrl).hostname : ''))
  if (!sourceUrl) throw new Error(`sourceUrl ${x.sourceUrl} is not one of the opened pages: ${opened.join(' ')}`)
  if (/\/ca\/|\.ca\/|\/en-ca\//i.test(sourceUrl)) throw new Error(`${sourceUrl} is a Canadian page, the US recipe can differ`)
  if (x.supplementalOnly && seed.form !== 'treat') throw new Error('page says supplemental feeding only')
  if (x.species !== seed.species) throw new Error(`species mismatch: ${x.species}`)
  return toEntry(seed, x, sourceUrl)
}

// Optional fields a hand transcription can carry. Label ones sit on the label (the app reads them from there); the rest
// on the entry. Anything malformed is dropped rather than published.
const kcal = (v, max) => (typeof v === 'number' && v > 0 && v <= max ? Math.round(v) : undefined)
function labelExtras(x) {
  const c = x.calories ?? {}
  const calories = { kcalPerKg: kcal(c.kcalPerKg, 9000), kcalPerCup: kcal(c.kcalPerCup, 1000), kcalPerUnit: kcal(c.kcalPerUnit, 3000), unit: typeof c.unit === 'string' ? c.unit.toLowerCase().trim().slice(0, 16) : undefined }
  const out = {}
  if (calories.kcalPerKg || calories.kcalPerCup || calories.kcalPerUnit) out.calories = Object.fromEntries(Object.entries(calories).filter(([, v]) => v !== undefined))
  if (['all', 'growth', 'adult'].includes(x.lifeStageClaim)) out.lifeStageClaim = x.lifeStageClaim
  if (['included', 'excluded'].includes(x.largeSizeGrowth)) out.largeSizeGrowth = x.largeSizeGrowth
  return out
}
function extras(x) {
  const out = {}
  for (const k of ['line', 'flavor', 'formula']) if (typeof x[k] === 'string' && x[k].trim()) out[k] = x[k].trim().slice(0, 60)
  if (typeof x.asin === 'string' && /^[A-Z0-9]{10}$/.test(x.asin)) out.asin = x.asin
  if (Array.isArray(x.sizes)) out.sizes = x.sizes.filter((z) => z && typeof z.label === 'string' && z.lb > 0).map((z) => ({ label: z.label, lb: z.lb, ...(/^[A-Z0-9]{10}$/.test(z.asin ?? '') && { asin: z.asin }) })).sort((a, b) => a.lb - b.lb)
  return out
}

// x is the JSON shape the prompt asks for, from the model or from a hand transcription (--add).
function toEntry(seed, x, sourceUrl) {
  const pct = (v) => (typeof v === 'number' && v >= 0 && v <= 100 ? v : undefined)
  const forms = ['dry', 'wet', 'semi_moist', 'freeze_dried', 'raw']
  const entry = {
    id: idOf(seed),
    ...seed,
    label: {
      productName: seed.name,
      brand: seed.brand,
      foodForm: seed.form !== 'treat' ? seed.form : forms.includes(x.foodForm) ? x.foodForm : 'unknown',
      isTreat: seed.form === 'treat',
      ingredients: cleanIngredients(x.ingredients),
      analysis: { proteinMin: pct(x.proteinMin), fatMin: pct(x.fatMin), fiberMax: pct(x.fiberMax), moistureMax: pct(x.moistureMax), ashMax: pct(x.ashMax), taurineMin: pct(x.taurineMin) },
      // Every non treat seed is sold as a complete diet, and US law puts the adequacy statement on the package even
      // when the brand's web page leaves it out (Hill's, Royal Canin). So the seed decides, and a page that says
      // "supplemental feeding only" is rejected above instead of being overruled.
      aafco: seed.form !== 'treat' ? 'complete' : x.supplementalOnly ? 'supplemental' : x.completeAndBalanced ? 'complete' : 'not_found',
    },
    sourceUrl: sourceUrl.replace(/[?#].*$/, ''),
    image: null, // scripts/fetch-product-images.mjs fills this in
    amazonQuery: amazonQuery(seed),
    ...extras(x),
  }
  if (x.calories || x.lifeStageClaim || x.largeSizeGrowth) Object.assign(entry.label, labelExtras(x))
  console.log(`   ${entry.id} page says: ${x.nameOnPage}${seed.form !== 'treat' && !x.completeAndBalanced ? ' (no adequacy statement on the page)' : ''}`)
  const bad = problems(entry)
  if (bad.length) throw new Error('rejected: ' + bad.join('; '))
  return entry
}

const read = () => (fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [])
const order = new Map(SEEDS.map((s, i) => [idOf(s), i]))
const write = (list) => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(list.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)), null, 2) + '\n')
}

// "a, b (c, d), e" splits into 3: commas inside brackets stay put.
function splitList(text) {
  const out = ['']
  let d = 0
  for (const ch of text.trim().replace(/\.$/, '')) { // only a closing period; "Folic Acid" must not lose its "d"
    if ('([{'.includes(ch)) d++
    if (')]}'.includes(ch)) d--
    if (ch === ',' && d === 0) out.push('')
    else out[out.length - 1] += ch
  }
  return out
}

const SEED_KEYS = ['brand', 'name', 'species', 'form', 'lifeStage', 'priceTier']
// A batch item names its seed by id (in SEEDS) or carries the seed fields itself, so parallel batches never edit SEEDS.
function seedFor(m) {
  const listed = SEEDS.find((s) => idOf(s) === m.id)
  if (listed) return listed
  if (!SEED_KEYS.every((k) => m[k] != null)) throw new Error(`${m.id ?? m.name}: not in SEEDS and missing seed fields`)
  const seed = Object.fromEntries(SEED_KEYS.map((k) => [k, m[k]]))
  if (!['dog', 'cat'].includes(seed.species) || !['dry', 'wet', 'freeze_dried', 'raw', 'treat'].includes(seed.form) || !['all', 'growth', 'adult', 'senior'].includes(seed.lifeStage) || ![1, 2, 3].includes(seed.priceTier)) throw new Error(`${idOf(seed)}: bad seed fields`)
  return seed
}
const fromManual = (m) => { const seed = seedFor(m); return toEntry(seed, { ...m, nameOnPage: 'hand transcribed', ingredients: splitList(m.ingredientsText) }, m.sourceUrl) }

if (process.argv.includes('--add') || process.argv.includes('--dry')) {
  const dry = process.argv.includes('--dry')
  const file = process.argv[process.argv.indexOf(dry ? '--dry' : '--add') + 1]
  let failed = 0
  const seen = new Set(read().map((e) => e.id))
  for (const m of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    try {
      const entry = fromManual(m)
      if (seen.has(entry.id)) { console.log(`skip ${entry.id} (already in the catalog)`); continue }
      seen.add(entry.id)
      if (!dry) write([...read(), entry])
      console.log(`${dry ? 'good' : 'ok  '} ${entry.id} (${entry.label.ingredients.length} ingredients${entry.label.calories ? ', calories' : ''}${entry.line ? `, line ${entry.line}` : ''})`)
    } catch (e) { failed++; console.log(`FAIL ${m.id ?? m.name}: ${e.message}`) }
  }
  if (failed) process.exit(1)
} else if (process.argv.includes('--patch')) {
  // Merge fields into existing entries: calories and the label claims onto the label, the rest onto the entry.
  const list = read()
  for (const m of JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--patch') + 1], 'utf8'))) {
    const e = list.find((x) => x.id === m.id)
    if (!e) { console.log(`FAIL ${m.id}: not in the catalog`); continue }
    Object.assign(e.label, labelExtras(m))
    Object.assign(e, extras(m))
    if (typeof m.sourceUrl === 'string' && !e.sourceUrl) e.sourceUrl = m.sourceUrl
  }
  write(list)
  console.log(`patched ${list.length} entries`)
} else if (process.argv.includes('--check')) {
  let failed = 0
  for (const e of read()) for (const p of problems(e)) { failed++; console.log(`${e.id}: ${p}`) }
  console.log(`${read().length} entries, ${failed} problem(s)`)
  process.exit(failed ? 1 : 0)
} else if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing. Run with: node --env-file=../.env scripts/build-catalog.mjs')
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const todo = SEEDS.filter((s) => !read().some((e) => e.id === idOf(s)) && (!only.length || only.includes(idOf(s))))
  console.log(`${todo.length} to fetch, ${read().length} already in the catalog`)
  const worker = async () => {
    for (let seed; (seed = todo.shift()); ) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const entry = await lookup(seed)
          write([...read(), entry])
          console.log(`ok   ${entry.id} (${entry.label.ingredients.length} ingredients) ${entry.sourceUrl}`)
          break
        } catch (e) {
          console.log(`${attempt === 2 ? 'DROP' : 'miss'} ${idOf(seed)}: ${e.message}`)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker)) // ponytail: six at a time, plenty for 80 products
  console.log(`done, ${read().length} entries`)
}
