// run: node --experimental-strip-types src/lib/openpetfoodfacts.test.ts (or npm test)
import assert from 'node:assert/strict'
import { labelFromOpff, splitIngredients } from './openpetfoodfacts.ts'
import { scoreFood } from './rubric.ts'

assert.deepEqual(splitIngredients('Ingredients: Chicken, brown rice (whole grain, milled), chicken fat (preserved with mixed tocopherols [vitamin E, a source of tocopherol]); salt.'), [
  'Chicken',
  'brown rice (whole grain, milled)',
  'chicken fat (preserved with mixed tocopherols [vitamin E, a source of tocopherol])',
  'salt',
])
assert.deepEqual(splitIngredients(''), [])
assert.deepEqual(splitIngredients('Beef, , _salmon_ (12%),'), ['Beef', 'salmon (12%)'])
assert.deepEqual(splitIngredients('Unbalanced ) paren, then corn'), ['Unbalanced ) paren', 'then corn'])

const mapped = labelFromOpff({
  product_name: 'Adult Dog Chicken Dinner',
  brands: 'Sample Brand, Parent Co',
  categories_tags: ['en:pet-food', 'en:dog-food', 'en:wet-dog-food'],
  labels: 'Complete and balanced',
  ingredients_text: 'Chicken broth, chicken, chicken liver, carrots, guar gum, salt',
  nutriments: { proteins_100g: 9, fat_100g: '5.5', fiber_100g: 1 },
})
assert.ok(mapped)
assert.equal(mapped.speciesOnLabel, 'dog')
assert.equal(mapped.label.brand, 'Sample Brand')
assert.equal(mapped.label.foodForm, 'wet')
assert.equal(mapped.label.aafco, 'complete')
assert.equal(mapped.label.isTreat, false)
assert.equal(mapped.label.ingredients.length, 6)
assert.deepEqual(mapped.label.analysis, { proteinMin: 9, fatMin: 5.5, fiberMax: 1, moistureMax: undefined, ashMax: undefined })
assert.ok(scoreFood(mapped.label, 'dog').score >= 50)

// no statement on file means not_found, and low protein with no moisture value is read as wet food
const bare = labelFromOpff({ product_name: 'Cat chunks', ingredients_text_en: 'Tuna, water, rice', nutriments: { proteins_100g: 11, fat_100g: 2 } })
assert.equal(bare?.label.aafco, 'not_found')
assert.equal(bare?.label.foodForm, 'wet')
assert.equal(bare?.speciesOnLabel, 'cat')

// crowd sourced numbers that cannot be real are dropped instead of failing the food on protein
const junk = labelFromOpff({ product_name: 'Dry cat food', ingredients_text: 'Chicken, rice, peas', nutriments: { proteins_100g: 2.87, fat_100g: 2.2 } })
assert.equal(junk?.label.analysis, undefined)

assert.equal(labelFromOpff({ product_name: 'No ingredients on file' }), null)

console.log('openpetfoodfacts ok')
