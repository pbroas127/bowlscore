/// <reference types="node" />
// Run with: node --experimental-strip-types src/lib/catalog.test.ts
import assert from 'node:assert/strict'
import { allergyHits, formOf, recommend, topRated, verdict, whyBetter } from './recommend.ts'
import { SAMPLE_CATALOG, SAMPLE_GOOD, SAMPLE_POOR } from './sample.ts'
import type { CatalogProduct, Flag } from './types.ts'

const good = (title: string): Flag => ({ severity: 'good', title, detail: '' })
const make = (id: string, score: number, over: Partial<CatalogProduct> = {}, ingredients = ['Lamb', 'Peas'], flags: Flag[] = []): CatalogProduct => ({
  id, brand: 'Brand', name: id, species: 'dog', form: 'dry', lifeStage: 'all', priceTier: 2, image: null, links: { amazon: 'https://www.amazon.com/dp/x' },
  label: { foodForm: 'dry', aafco: 'complete', ingredients },
  result: { rubricVersion: 1, score, grade: 'Good', complete: true, components: { ingredients: 0, nutrition: 0, additives: 0 }, dryMatter: { moistureUsed: 10 }, flags },
  ...over,
})
const ids = (list: CatalogProduct[]) => list.map((p) => p.id)

const catalog = [
  make('a90', 90, { priceTier: 3 }),
  make('b90cheap', 90, { priceTier: 1 }),
  make('c80', 80),
  make('d60', 60),
  make('cat95', 95, { species: 'cat' }),
  make('wet96', 96, { form: 'wet' }),
  make('treat97', 97, { form: 'treat' }),
  make('chicken99', 99, {}, ['Deboned chicken', 'Rice']),
  make('puppy98', 98, { lifeStage: 'growth' }),
  make('adult91', 91, { lifeStage: 'adult' }),
]

// Same species and form, stage compatible, allergens out, score desc then price asc.
assert.deepEqual(ids(recommend(catalog, { species: 'dog', stage: 'adult', form: 'dry', allergies: ['Chicken'], currentScore: 26 })), ['adult91', 'b90cheap', 'a90', 'c80'])
// The bar is max(75, current + 15): at 70 only 85 and up qualify.
assert.deepEqual(ids(recommend(catalog, { species: 'dog', stage: 'adult', form: 'dry', allergies: ['Chicken'], currentScore: 70 })), ['adult91', 'b90cheap', 'a90'])
// Nothing clears the bar, so fall back to anything higher than the current score.
assert.deepEqual(ids(recommend(catalog, { species: 'dog', stage: 'adult', form: 'dry', allergies: ['Chicken'], currentScore: 89 })), ['adult91', 'b90cheap', 'a90'])
assert.deepEqual(recommend(catalog, { species: 'dog', stage: 'adult', form: 'dry', allergies: ['Chicken'], currentScore: 99 }), [])
// Treats only match treats, and an unknown form never gets a treat.
assert.deepEqual(ids(recommend(catalog, { species: 'dog', form: 'treat', currentScore: 10 })), ['treat97'])
assert.ok(!ids(recommend(catalog, { species: 'dog', currentScore: 10 })).includes('treat97'))
// Life stage: puppies get growth or all stages food, seniors may eat adult food, excludeId is honored, max 6.
assert.equal(ids(recommend(catalog, { species: 'dog', stage: 'growth', form: 'dry', currentScore: 10 }))[0], 'chicken99')
assert.ok(!ids(recommend(catalog, { species: 'dog', stage: 'growth', form: 'dry', currentScore: 10 })).includes('adult91'))
assert.ok(ids(recommend(catalog, { species: 'dog', stage: 'senior', form: 'dry', currentScore: 10 })).includes('adult91'))
assert.ok(!ids(recommend(catalog, { species: 'dog', form: 'dry', currentScore: 10, excludeId: 'a90' })).includes('a90'))
assert.ok(recommend([...catalog, ...catalog, ...catalog], { species: 'dog', form: 'dry' }).length <= 6)
assert.deepEqual(ids(topRated(catalog, 'dog', ['Chicken'], 3)), ['puppy98', 'treat97', 'wet96'])

assert.deepEqual(allergyHits(['Chicken', 'Fish', 'Nonsense'], ['Chicken meal', 'Rice']), ['Chicken'])
assert.equal(formOf({ foodForm: 'semi_moist', aafco: 'complete', ingredients: [] }), undefined)
assert.equal(formOf({ foodForm: 'dry', isTreat: true, aafco: 'not_found', ingredients: [] }), 'treat')

// whyBetter is built from real flag differences, worst watch out first.
assert.equal(whyBetter(SAMPLE_GOOD, SAMPLE_POOR), 'No synthetic preservative and real meat comes first')
assert.equal(whyBetter(SAMPLE_GOOD), 'Real meat comes first and high protein')
assert.equal(whyBetter(make('x', 80, {}, [], [good('High protein')]), make('y', 70, {}, [], [good('High protein')])), 'Scores 10 points higher')
assert.equal(whyBetter(make('x', 80)), 'No watch outs found')
assert.equal(verdict({ name: 'New', ...SAMPLE_GOOD }, { name: 'Old', ...SAMPLE_POOR }), 'New wins by 67 points. No synthetic preservative and real meat comes first.')
assert.equal(verdict({ name: 'A', ...SAMPLE_GOOD }, { name: 'B', ...SAMPLE_GOOD }), 'These two score the same. Let the ingredients decide.')

// The preview fixture is a valid catalog with no hyphens or dashes in anything a person reads.
assert.equal(SAMPLE_CATALOG.products.length, 4)
for (const p of SAMPLE_CATALOG.products) assert.ok(!/[-\u2013\u2014]/.test(`${p.brand} ${p.name} ${whyBetter(p)}`), p.id)

console.log('catalog tests passed')
