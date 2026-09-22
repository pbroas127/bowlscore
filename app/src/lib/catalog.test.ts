/// <reference types="node" />
// Run with: node --experimental-strip-types src/lib/catalog.test.ts
import assert from 'node:assert/strict'
import { allergyHits, formOf, proteinOf, recommend, topRated, verdict, whyBetter, closestProducts } from './recommend.ts'
import { SAMPLE_CATALOG, SAMPLE_GOOD, SAMPLE_POOR } from './sample.ts'
import { bornAtFor } from './fit.ts'
import type { CatalogProduct, Flag, Pet } from './types.ts'

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

// The pet's age and size beat the stage picked in onboarding: a 9 month old Bernese is a large breed puppy.
const bear: Pet = { id: 'p', name: 'Bear', species: 'dog', stage: 'adult', breed: 'Bernese Mountain Dog', bornAt: bornAtFor(9), weightLb: 72, concerns: [], allergies: [], treatScanIds: [] }
const noBigPups = make('nobigpups99', 99, { label: { foodForm: 'dry', aafco: 'complete', ingredients: ['Lamb'], lifeStageClaim: 'all', largeSizeGrowth: 'excluded' } })
const forBear = ids(recommend([...catalog, noBigPups], { species: 'dog', form: 'dry', currentScore: 10, pet: bear }))
assert.ok(!forBear.includes('adult91') && !forBear.includes('nobigpups99') && forBear.includes('puppy98'))
assert.ok(ids(recommend([...catalog, noBigPups], { species: 'dog', form: 'dry', currentScore: 10 })).includes('nobigpups99'))
assert.ok(!ids(topRated(catalog, 'dog', undefined, 20, bear)).includes('adult91'))
assert.ok(ids(topRated(catalog, 'dog', undefined, 20)).includes('adult91'))
assert.ok(ids(topRated(catalog, 'dog', undefined, 20, bear)).includes('treat97')) // treats are not made for a life stage

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

// The main protein: first animal named, skipping fats, oils, broths and flavors; fish species read as Fish; bison is not beef.
assert.equal(proteinOf(SAMPLE_GOOD.label.ingredients), 'Chicken')
assert.equal(proteinOf(['Chicken fat (preserved with mixed tocopherols)', 'Lamb meal', 'Rice']), 'Lamb')
assert.equal(proteinOf(['Turkey broth', 'Natural chicken flavor', 'Deboned salmon', 'Chicken meal']), 'Fish')
assert.equal(proteinOf(['Whitefish meal', 'Peas']), 'Fish')
assert.equal(proteinOf(['Bison', 'Buffalo', 'Peas']), undefined)
assert.equal(proteinOf(['Ground yellow corn', 'Meat and bone meal', 'Animal fat (preserved with BHA)', 'Animal digest']), undefined) // no animal named
assert.equal(proteinOf(['Beef liver']), 'Beef')
// Same protein comes first only among foods within 5 points: chick88 passes 91, 90 and 90, not 99.
const rex: Pet = { id: 'r', name: 'Rex', species: 'dog', stage: 'adult', protein: 'Chicken', concerns: [], allergies: [], treatScanIds: [] }
assert.deepEqual(ids(recommend([...catalog, make('chick88', 88, {}, ['Chicken meal', 'Rice'])], { species: 'dog', stage: 'adult', form: 'dry', currentScore: 10, pet: rex })), ['chicken99', 'chick88', 'adult91', 'b90cheap', 'a90', 'c80'])
assert.deepEqual(ids(recommend([...catalog, make('chick88', 88, {}, ['Chicken meal', 'Rice'])], { species: 'dog', stage: 'adult', form: 'dry', currentScore: 10, pet: { ...rex, protein: undefined } })), ['chicken99', 'adult91', 'b90cheap', 'a90', 'chick88', 'c80'])

// The preview fixture is a valid catalog with no hyphens or dashes in anything a person reads, and shows both protein tags.
assert.equal(SAMPLE_CATALOG.products.length, 5)
for (const p of SAMPLE_CATALOG.products) assert.ok(!/[-\u2013\u2014]/.test(`${p.brand} ${p.name} ${whyBetter(p)}`), p.id)
assert.equal(proteinOf(SAMPLE_CATALOG.products[0].label.ingredients), 'Chicken')
const sample = (id: string) => SAMPLE_CATALOG.products.find((p) => p.id === id)!
assert.equal(proteinOf(sample('sample-dog-wet').label.ingredients), 'Turkey')
assert.equal(proteinOf(sample('sample-dog-puppy').label.ingredients), 'Lamb')
assert.equal(sample('sample-dog-puppy').line, sample('sample-dog-dry').line) // the preview shows the Version picker

// Linking a scanned food to the catalog: brand must match, and the closest name wins.
const pro = make('pro', 80, { brand: 'Purina Pro Plan', name: 'Complete Essentials Chicken and Rice' })
const one = make('one', 70, { brand: 'Purina ONE', name: 'Chicken and Rice Formula' })
const blue = make('blue', 85, { brand: 'Blue Buffalo', name: 'Life Protection Chicken and Brown Rice' })
assert.deepEqual(ids(closestProducts([blue, one, pro], { foodForm: 'dry', aafco: 'complete', ingredients: [], brand: 'Purina', productName: 'Pro Plan Chicken & Rice Formula' }, 'dog')), ['pro', 'one'])
assert.deepEqual(closestProducts([pro], { foodForm: 'dry', aafco: 'complete', ingredients: [] }, 'dog'), [])
assert.deepEqual(closestProducts([pro], { foodForm: 'dry', aafco: 'complete', ingredients: [], brand: 'Purina', productName: 'Pro Plan Chicken' }, 'cat'), [])

console.log('catalog tests passed')
