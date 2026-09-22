// run: node --experimental-strip-types src/lib/catalog.test.ts (or npm test)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CATALOG, CATALOG_VERSION, PRODUCTS, matchCatalog, scanMatch } from './catalog.ts'
import { problems } from '../../scripts/build-catalog.mjs'

assert.ok(CATALOG.length >= 40, `catalog has ${CATALOG.length} products`)
assert.equal(new Set(CATALOG.map((e) => e.id)).size, CATALOG.length, 'ids are unique')
assert.ok(CATALOG_VERSION)

const pub = path.resolve(import.meta.dirname, '../../public')
for (const e of CATALOG) {
  assert.deepEqual(problems(e), [], `${e.id} passes the sanity checks`)
  assert.match(e.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, e.id)
  if (e.image != null) {
    assert.equal(e.image, `/products/${e.id}.webp`)
    const file = path.join(pub, e.image)
    assert.ok(fs.existsSync(file), `${e.image} exists on disk`)
    assert.ok(fs.statSync(file).size < 80 * 1024, `${e.image} is under 80 KB`)
  }
}

// Every product scores without throwing, and the score comes from the rubric.
for (const p of PRODUCTS) {
  assert.ok(Number.isInteger(p.result.score) && p.result.score >= 1 && p.result.score <= 100, `${p.id} scored ${p.result.score}`)
  assert.equal(p.result.complete, p.form !== 'treat', `${p.id} complete flag`)
  if (p.form !== 'treat') assert.notEqual(p.result.components.nutrition, null, `${p.id} has a nutrition score`)
  const search = /^https:\/\/www\.amazon\.com\/s\?k=[^&]+&tag=bowlscore-20$/
  const dp = (asin: string) => `https://www.amazon.com/dp/${asin}?tag=bowlscore-20`
  if (p.asin) assert.equal(p.links.amazon, dp(p.asin))
  else assert.match(p.links.amazon, search)
  for (const [i, s] of (p.sizes ?? []).entries()) {
    assert.ok(s.label && s.lb > 0, `${p.id} size ${s.label}`)
    if (i) assert.ok(s.lb >= p.sizes![i - 1].lb, `${p.id} sizes sorted small to large`)
    if (s.asin) assert.equal(s.url, dp(s.asin))
    // No listing for this size: the nearest size that has one, else the product's own listing, else a search.
    else if (p.sizes!.some((o) => o.asin) || p.asin) assert.match(s.url, /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}\?tag=bowlscore-20$/)
    else assert.match(s.url, search)
  }
  assert.ok(!('amazonQuery' in p))
  assert.ok(p.image === null || /^https:\/\/.+\/products\/.+\.webp$/.test(p.image))
}

// ASINs are real Amazon ids, and a line only exists to link siblings.
for (const e of CATALOG) for (const a of [e.asin, ...(e.sizes ?? []).map((s) => s.asin)]) if (a) assert.match(a, /^[A-Z0-9]{10}$/, `${e.id} asin ${a}`)
const lines = Map.groupBy(CATALOG.filter((e) => e.line), (e) => e.line!)
for (const [line, members] of lines) assert.ok(members.length >= 2, `line ${line} has only one member`)

// Matching: strong matches only. A wrong match is worse than none.
const id = (scan: Parameters<typeof matchCatalog>[0]) => matchCatalog(scan)?.id ?? null
const has = (x: string) => CATALOG.some((e) => e.id === x)
if (has('purina-one-chicken-and-rice-formula-dog')) {
  const want = 'purina-one-chicken-and-rice-formula-dog'
  assert.equal(id({ brand: 'Purina ONE', name: 'Purina ONE Natural Dry Dog Food, Chicken & Rice Formula', species: 'dog' }), want, 'a verbose UPC database title')
  assert.equal(id({ name: 'Purina ONE Chicken and Rice Formula Adult Dry Dog Food 16.5 lb Bag', species: 'unknown' }), want, 'brand inside the name, species unknown')
  assert.equal(id({ brand: 'Purina ONE', name: 'Lamb & Rice Formula', species: 'dog' }), null, 'a different protein')
  assert.equal(id({ brand: 'Purina ONE', name: 'Chicken & Rice Formula Small Bites', species: 'dog' }), null, 'a different kibble variant')
  assert.equal(id({ brand: 'Purina ONE', name: 'Healthy Puppy Chicken & Rice Formula', species: 'dog' }), null, 'a different life stage')
  assert.equal(id({ brand: 'Purina ONE', name: 'Chicken & Rice Formula', species: 'cat' }), null, 'the wrong species')
  assert.equal(id({ brand: 'Purina Pro Plan', name: 'Chicken & Rice Formula', species: 'dog', form: 'wet' }), null, 'the wrong form')
  assert.equal(id({ brand: 'Pedigree', name: 'Chicken & Rice Formula', species: 'dog' }), null, 'the wrong brand')
  assert.equal(scanMatch({ brand: 'Purina ONE', productName: 'Chicken & Rice Formula', foodForm: 'dry', isTreat: false, ingredients: [], aafco: 'complete' }, 'dog').productId, want)
}
if (has('orijen-original-dog') && has('orijen-original-cat-cat')) {
  assert.equal(id({ brand: 'Orijen', name: 'Original Dry Dog Food', species: 'dog' }), 'orijen-original-dog')
  assert.equal(id({ brand: 'Orijen', name: 'Original', species: 'unknown' }), null, 'a one word recipe name needs a known species')
  assert.equal(id({ brand: 'Orijen', name: 'Six Fish Dry Dog Food', species: 'dog' }), null)
}
assert.equal(id({ name: '' }), null)
assert.deepEqual(scanMatch({ foodForm: 'dry', ingredients: [], aafco: 'not_found' }, 'dog'), {})

console.log(`catalog: ${CATALOG.length} products, all checks passed`)
