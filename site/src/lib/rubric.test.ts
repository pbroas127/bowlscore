// run: node --experimental-strip-types src/lib/rubric.test.ts (or npm test)
import assert from 'node:assert/strict'
import { scoreFood, classifyProtein, type LabelData } from './rubric.ts'

const premiumDryDog: LabelData = {
  foodForm: 'dry',
  aafco: 'complete',
  ingredients: ['Deboned chicken', 'Chicken meal', 'Brown rice', 'Oatmeal', 'Chicken fat (preserved with mixed tocopherols)', 'Salmon oil', 'Chicken liver', 'Dried chicory root', 'Taurine'],
  analysis: { proteinMin: 28, fatMin: 16, fiberMax: 4, moistureMax: 10 },
}
const cheapDryDog: LabelData = {
  foodForm: 'dry',
  aafco: 'complete',
  ingredients: ['Ground yellow corn', 'Meat and bone meal', 'Corn gluten meal', 'Animal fat (preserved with BHA)', 'Soybean meal', 'Animal digest', 'Salt', 'Red 40', 'Yellow 5', 'Blue 2'],
  analysis: { proteinMin: 21, fatMin: 10, fiberMax: 4.5, moistureMax: 12 },
}
const wetCat: LabelData = {
  foodForm: 'wet',
  aafco: 'complete',
  ingredients: ['Chicken broth', 'Chicken', 'Chicken liver', 'Turkey', 'Dried egg product', 'Guar gum', 'Salmon oil', 'Taurine'],
  analysis: { proteinMin: 10, fatMin: 5, fiberMax: 1, moistureMax: 78 },
}

const a = scoreFood(premiumDryDog, 'dog')
const b = scoreFood(cheapDryDog, 'dog')
const c = scoreFood(wetCat, 'cat')
console.log({ premiumDryDog: a.score, cheapDryDog: b.score, wetCat: c.score })

assert.ok(a.score >= 75, `premium dog food should be Excellent, got ${a.score}`)
assert.ok(b.score < 35, `corn and dye dog food should score low, got ${b.score}`)
assert.ok(a.score - b.score >= 40, 'good and bad foods must be far apart')

// wet food: 10% protein as fed is about 45% on a dry matter basis, so it must NOT be punished
assert.ok(c.dryMatter.protein! > 44 && c.dryMatter.protein! < 47, `dry matter protein was ${c.dryMatter.protein}`)
assert.ok(c.score >= 75, `meaty wet cat food should be Excellent, got ${c.score}`)
assert.ok(c.flags.some((f) => f.title === 'Taurine included'))
assert.ok(!c.flags.some((f) => f.title === 'No meat in first place'), 'broth must be skipped when finding the first ingredient')

// the same kibble judged for a cat: 21/88 = 23.9% dry matter protein is under the 26% cat minimum
const asCat = scoreFood(cheapDryDog, 'cat')
assert.ok(asCat.flags.some((f) => f.title === 'Protein below the minimum'))
assert.ok(asCat.flags.some((f) => f.title === 'No taurine listed'))
assert.ok(asCat.score <= b.score, 'cat rubric must be stricter than dog rubric on plant heavy food')
// but it passes the 18% dog minimum
assert.ok(!b.flags.some((f) => f.title === 'Protein below the minimum'))

// propylene glycol: prohibited for cats (hard cap), only a penalty for dogs
const pg: LabelData = { ...premiumDryDog, foodForm: 'semi_moist', ingredients: [...premiumDryDog.ingredients, 'Propylene glycol'] }
assert.ok(scoreFood(pg, 'cat').score <= 15)
assert.equal(scoreFood(pg, 'cat').cap?.reason, 'Propylene glycol')
assert.ok(scoreFood(pg, 'dog').score > 60)

// onion caps both species, xylitol is near zero for dogs
assert.ok(scoreFood({ ...premiumDryDog, ingredients: [...premiumDryDog.ingredients, 'Onion powder'] }, 'dog').score <= 30)
assert.ok(scoreFood({ ...premiumDryDog, ingredients: [...premiumDryDog.ingredients, 'Xylitol'] }, 'dog').score <= 5)

// supplemental foods and treats are scored on ingredients only and say so
const topper = scoreFood({ ...wetCat, aafco: 'supplemental' }, 'cat')
assert.equal(topper.complete, false)
assert.equal(topper.components.nutrition, null)
assert.ok(topper.flags.some((f) => f.title === 'Not a complete meal'))

// missing nutrition panel still produces a score
const noPanel = scoreFood({ ...premiumDryDog, analysis: undefined }, 'dog')
assert.ok(noPanel.score >= 70 && noPanel.components.nutrition === null)

// puppies need more protein than adults: 19% as fed kibble passes adult, fails growth
const lowProtein: LabelData = { ...premiumDryDog, analysis: { proteinMin: 19, fatMin: 10, fiberMax: 4, moistureMax: 10 } }
assert.ok(!scoreFood(lowProtein, 'dog', 'adult').flags.some((f) => f.title === 'Protein below the minimum'))
assert.ok(scoreFood(lowProtein, 'dog', 'growth').flags.some((f) => f.title === 'Protein below the minimum'))

assert.equal(classifyProtein('Chicken fat'), 'none')
assert.equal(classifyProtein('Chicken by-product meal'), 'named_byproduct')
assert.equal(classifyProtein('Poultry by-product meal'), 'generic')
assert.equal(classifyProtein('Meat and bone meal'), 'generic')
assert.equal(classifyProtein('Salmon meal'), 'named_meal')

// deterministic: same label, same score, every time
assert.deepEqual(scoreFood(cheapDryDog, 'dog'), scoreFood(cheapDryDog, 'dog'))

// no hyphens or em dashes in anything a user can read
for (const r of [a, b, c, asCat, topper, scoreFood(pg, 'cat')])
  for (const f of r.flags) assert.ok(!/[-–—]/.test(f.title + f.detail), `dash in copy: ${f.title} / ${f.detail}`)

console.log('rubric ok')
