// usage: node scripts/fetch-upcs.mjs [max searches, default 90]
// Finds the printed barcode (UPC) of every bag size in the catalog through the free UPCitemdb trial search, so a barcode
// scan returns the full label from our own catalog. The trial allows about 100 searches a day: run it once a day until
// "0 left". Progress lives in catalog-batches/upc-progress.json, results merge through build-catalog.mjs --patch.
// A wrong barcode would show the wrong food, so matching is strict and anything doubtful is skipped:
//   1. the title must carry the brand and nearly every word of the product name,
//   2. any life stage, breed size or protein word in the title must also be in our name, flavor or formula,
//   3. the bag weight in the title must equal one of our sizes (within 0.3 lb), multipacks are skipped,
//   4. a barcode claimed by two different products is dropped from both.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = import.meta.dirname
const CATALOG = path.resolve(HERE, '../src/data/catalog.json')
const PROGRESS = path.resolve(HERE, 'catalog-batches/upc-progress.json')
const PATCH = path.resolve(HERE, 'catalog-batches/upc-patch.json')
const max = Number(process.argv[2]) || 90

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const progress = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : { searched: {}, found: {} }

const words = (s) => (s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').split(/[^a-z0-9]+/).filter(Boolean)
const FILLER = new Set(['and', 'with', 'the', 'for', 'recipe', 'formula', 'food', 'dog', 'dogs', 'cat', 'cats', 'dry', 'wet', 'real', 'natural', 'flavor', 'in', 'of', 'a'])
const CRITICAL = new Set(['puppy', 'kitten', 'adult', 'senior', 'mature', 'large', 'small', 'toy', 'giant', 'weight', 'indoor', 'hairball', 'sensitive', 'chicken', 'beef', 'lamb', 'duck', 'salmon', 'turkey', 'fish', 'whitefish', 'pork', 'venison', 'rabbit', 'bison', 'trout', 'tuna', 'grain', 'free'])

// Pounds printed in a title: "30 lb", "15LB", "4.5 Pound", "13 oz". Undefined for multipacks ("12 x 13 oz") or no weight.
function pounds(title) {
  if (/\d\s*(x|pack|ct|count)\b|\bpack of\b|\bcase\b/i.test(title)) return undefined
  const m = /(\d+(?:\.\d+)?)\s*(lbs?|pounds?|oz|ounces?)\b/i.exec(title)
  if (!m) return undefined
  const n = Number(m[1])
  return /^o/i.test(m[2]) ? n / 16 : n
}

function matches(entry, title) {
  const seen = new Set(words(title))
  const brand = words(entry.brand).filter((w) => !FILLER.has(w))
  if (!brand.length || !brand.every((w) => seen.has(w))) return false
  const want = words(entry.name).filter((w) => !FILLER.has(w))
  if (!want.length || want.filter((w) => seen.has(w)).length / want.length < 0.85) return false
  const ours = new Set(words(`${entry.brand} ${entry.name} ${entry.flavor ?? ''} ${entry.formula ?? ''}`))
  if ([...seen].some((w) => CRITICAL.has(w) && !ours.has(w))) return false
  const other = entry.species === 'dog' ? /\b(cats?|kitten)\b/i : /\b(dogs?|puppy)\b/i
  return !other.test(title)
}

if (process.argv.includes('--selftest')) {
  const { default: assert } = await import('node:assert/strict')
  const gold = { brand: 'Fromm', name: 'Gold Large Breed Puppy', flavor: 'Chicken', species: 'dog' }
  assert.equal(matches(gold, 'FROMM PET FOODS GOLD LARGE BREED PUPPY 15LB'), true)
  assert.equal(matches(gold, 'Fromm Heartland Gold Large Breed Puppy Beef, Pork & Lamb Adult Dry Dog Food, 26 Lb'), false)
  assert.equal(matches(gold, 'Fromm Gold Recipe Duck & Chicken Large Breed Puppy Dry Dog Food, 33 lb'), false)
  assert.equal(matches(gold, 'Fromm Gold Puppy Dry Dog Food 30 lb'), false)
  assert.deepEqual([pounds('GOLD 15LB'), pounds('4.5 Pound Bag'), pounds('Pate 13 oz'), pounds('12 x 13 oz cans')], [15, 4.5, 13 / 16, undefined])
  console.log('selftest passed')
  process.exit(0)
}

const todo = catalog.filter((e) => e.sizes?.length && !progress.searched[e.id])
let used = 0
for (const e of todo) {
  if (used >= max) break
  used++
  let items = []
  try {
    const q = encodeURIComponent(`${e.brand} ${e.name}`)
    const out = execFileSync('curl', ['-s', '--max-time', '20', `https://api.upcitemdb.com/prod/trial/search?s=${q}&type=product&match_mode=0`], { encoding: 'utf8' })
    const res = JSON.parse(out)
    if (res.code === 'TOO_FAST') { await new Promise((r) => setTimeout(r, 12_000)); used--; continue }
    if (res.code && res.code !== 'OK') { console.log(`stop: ${res.code} ${res.message ?? ''}`); break }
    items = res.items ?? []
  } catch { console.log(`skip ${e.id}: request failed`); continue }
  progress.searched[e.id] = true
  const hits = []
  for (const it of items) {
    if (!/^\d{8,14}$/.test(it.upc ?? '') || !matches(e, it.title ?? '')) continue
    const lb = pounds(it.title)
    const size = lb && e.sizes.filter((z) => Math.abs(z.lb - lb) <= 0.3)
    if (size?.length === 1) hits.push({ lb: size[0].lb, upc: it.upc })
  }
  if (hits.length) progress.found[e.id] = hits
  console.log(`${hits.length ? 'ok  ' : 'none'} ${e.id}${hits.map((h) => ` ${h.lb}lb:${h.upc}`).join('')}`)
  await new Promise((r) => setTimeout(r, 11_000)) // the trial answers TOO_FAST under about 6 a minute
}
fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 1))

// Rule 4, then one patch with every size that got a barcode.
const owners = new Map()
for (const [id, hits] of Object.entries(progress.found)) for (const h of hits) owners.set(h.upc, new Set([...(owners.get(h.upc) ?? []), id]))
const patch = []
for (const e of catalog) {
  const hits = (progress.found[e.id] ?? []).filter((h) => owners.get(h.upc).size === 1)
  if (!hits.length) continue
  patch.push({ id: e.id, sizes: e.sizes.map((z) => ({ ...z, ...(z.upc ? {} : hits.find((h) => h.lb === z.lb) && { upc: hits.find((h) => h.lb === z.lb).upc }) })) })
}
fs.writeFileSync(PATCH, JSON.stringify(patch, null, 1))
const left = catalog.filter((e) => e.sizes?.length && !progress.searched[e.id]).length
console.log(`${used} searched now, ${patch.length} products with barcodes, ${patch.reduce((n, p) => n + p.sizes.filter((z) => z.upc).length, 0)} sizes, ${left} left`)
console.log('merge with: node scripts/build-catalog.mjs --patch scripts/catalog-batches/upc-patch.json')
