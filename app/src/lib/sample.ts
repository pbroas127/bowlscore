// Canned results. The onboarding demo scan uses SAMPLE_POOR (zero API cost), and the app falls back to these
// when no API URL is configured so every screen can be previewed without a backend.
import { bornAtFor } from './fit.ts'
import type { Catalog, CatalogProduct, Flag, LabelData, ScoreResult } from './types'

// The preview pet when onboarding skipped breed, age and weight: a large breed puppy, the case where fit matters most.
// On chicken, so the preview catalog shows both the same protein and the new protein tags.
export const SAMPLE_PET = { breed: 'Bernese Mountain Dog', bornAt: bornAtFor(9), weightLb: 72, protein: 'Chicken' }

export const SAMPLE_POOR: { label: LabelData; result: ScoreResult } = {
  label: {
    productName: 'Complete Adult Chicken Flavor',
    brand: 'Sample kibble',
    foodForm: 'dry',
    aafco: 'complete',
    ingredients: ['Ground yellow corn', 'Meat and bone meal', 'Corn gluten meal', 'Animal fat (preserved with BHA)', 'Soybean meal', 'Chicken byproduct meal', 'Animal digest', 'Salt', 'Red 40', 'Yellow 5'],
    analysis: { proteinMin: 21, fatMin: 10, fiberMax: 4.5, moistureMax: 12 },
    lifeStageClaim: 'adult',
    largeSizeGrowth: 'unknown',
    calories: { kcalPerKg: 3400, kcalPerCup: 340 },
  },
  result: {
    rubricVersion: 1,
    score: 26,
    grade: 'Poor',
    complete: true,
    components: { ingredients: 0, nutrition: 17, additives: 9 },
    dryMatter: { protein: 23.9, fat: 11.4, fiber: 5.1, carbs: 51.7, moistureUsed: 12 },
    flags: [
      { severity: 'warning', title: 'Synthetic preservative', detail: 'BHA, BHT and ethoxyquin are legal but controversial. Better foods preserve with vitamin E instead.', ingredient: 'Animal fat (preserved with BHA)' },
      { severity: 'caution', title: 'No meat in first place', detail: 'The main ingredient is Ground yellow corn, not an animal protein.', ingredient: 'Ground yellow corn' },
      { severity: 'caution', title: 'Plant protein boosters', detail: 'Corn gluten meal, Soybean meal can raise the protein number on the label without adding meat.' },
      { severity: 'caution', title: 'Artificial color', detail: 'Dyes are there for the human buying the bag. Your pet does not care what color the food is.', ingredient: 'Red 40' },
      { severity: 'caution', title: 'Unnamed animal ingredients', detail: 'Meat and bone meal, Animal fat, Animal digest: the label does not say which animal.' },
    ],
  },
}

export const SAMPLE_GOOD: { label: LabelData; result: ScoreResult } = {
  label: {
    productName: 'Free Run Chicken and Brown Rice',
    brand: 'Sample premium',
    foodForm: 'dry',
    aafco: 'complete',
    ingredients: ['Deboned chicken', 'Chicken meal', 'Brown rice', 'Oatmeal', 'Chicken fat (preserved with mixed tocopherols)', 'Salmon oil', 'Chicken liver', 'Dried chicory root', 'Taurine'],
    analysis: { proteinMin: 28, fatMin: 16, fiberMax: 4, moistureMax: 10 },
    lifeStageClaim: 'all',
    largeSizeGrowth: 'included',
    calories: { kcalPerKg: 3650, kcalPerCup: 380 },
  },
  result: {
    rubricVersion: 1,
    score: 93,
    grade: 'Excellent',
    complete: true,
    components: { ingredients: 50, nutrition: 23, additives: 20 },
    dryMatter: { protein: 31.1, fat: 17.8, fiber: 4.4, carbs: 38.9, moistureUsed: 10 },
    flags: [
      { severity: 'good', title: 'Real meat comes first', detail: 'Deboned chicken is the main ingredient.', ingredient: 'Deboned chicken' },
      { severity: 'good', title: 'High protein', detail: 'About 31.1% protein once water is removed.' },
      { severity: 'good', title: 'Omega rich oils', detail: 'Contains a named source of omega fatty acids for skin and coat.' },
      { severity: 'good', title: 'Natural preservatives', detail: 'Preserved with vitamin E or rosemary instead of synthetic chemicals.' },
    ],
  },
}

// The preview catalog: a handful of products, enough to see every catalog screen without a server.
const fixture = (id: string, brand: string, name: string, species: 'dog' | 'cat', form: CatalogProduct['form'], priceTier: 1 | 2 | 3, score: number, ingredients: string[], flags: Flag[], dm: [number, number, number], calories?: LabelData['calories']): CatalogProduct => ({
  id, brand, name, species, form, priceTier, lifeStage: 'all', image: null,
  label: { productName: name, brand, foodForm: form === 'treat' ? 'dry' : form, isTreat: form === 'treat', aafco: form === 'treat' ? 'not_found' : 'complete', ingredients, calories, lifeStageClaim: form === 'treat' ? undefined : 'all', largeSizeGrowth: form !== 'treat' && species === 'dog' ? 'included' : undefined },
  result: { rubricVersion: 1, score, grade: score >= 75 ? 'Excellent' : 'Good', complete: form !== 'treat', components: { ingredients: 45, nutrition: 22, additives: 20 }, dryMatter: { protein: dm[0], fat: dm[1], carbs: dm[2], moistureUsed: form === 'wet' ? 78 : 10 }, flags },
  links: { amazon: `https://www.amazon.com/s?k=${encodeURIComponent(`${brand} ${name}`)}&tag=bowlscore-20` },
})
const meatFirst = (first: string): Flag => ({ severity: 'good', title: 'Real meat comes first', detail: `${first} is the main ingredient.`, ingredient: first })
const naturalPreservatives: Flag = { severity: 'good', title: 'Natural preservatives', detail: 'Preserved with vitamin E or rosemary instead of synthetic chemicals.' }

const bags = [4, 15, 30, 40].map((lb) => ({ label: `${lb} lb`, lb, url: `https://www.amazon.com/s?k=sample+${lb}+lb&tag=bowlscore-20` }))

export const SAMPLE_CATALOG: Catalog = {
  version: 'preview',
  products: [
    // One line in 3 formulas and 2 flavors with bag sizes, so the preview shows the Formula, Flavor and Size pickers.
    // Large Breed Puppy comes in chicken only, so its chip fades while a lamb version is open.
    { ...fixture('sample-dog-dry', SAMPLE_GOOD.label.brand!, SAMPLE_GOOD.label.productName!, 'dog', 'dry', 2, 93, [], [], [0, 0, 0]), label: SAMPLE_GOOD.label, result: SAMPLE_GOOD.result, line: 'sample-premium-dog', formula: 'All life stages', flavor: 'Chicken', sizes: bags },
    { ...fixture('sample-dog-lamb', SAMPLE_GOOD.label.brand!, 'Lamb and Brown Rice', 'dog', 'dry', 2, 90, ['Deboned lamb', 'Lamb meal', 'Brown rice', 'Oatmeal', 'Salmon oil'], [meatFirst('Deboned lamb'), naturalPreservatives], [29, 17, 40], { kcalPerKg: 3600, kcalPerCup: 370 }), line: 'sample-premium-dog', formula: 'All life stages', flavor: 'Lamb', sizes: bags },
    { ...fixture('sample-dog-puppy', SAMPLE_GOOD.label.brand!, 'Puppy Lamb and Brown Rice', 'dog', 'dry', 2, 91, ['Deboned lamb', 'Lamb meal', 'Brown rice', 'Oatmeal', 'Salmon oil'], [meatFirst('Deboned lamb'), naturalPreservatives], [30, 18, 38], { kcalPerKg: 3700, kcalPerCup: 400 }), lifeStage: 'growth', line: 'sample-premium-dog', formula: 'Puppy', flavor: 'Lamb', sizes: bags },
    { ...fixture('sample-dog-puppy-chicken', SAMPLE_GOOD.label.brand!, 'Puppy Chicken and Brown Rice', 'dog', 'dry', 2, 92, ['Deboned chicken', 'Chicken meal', 'Brown rice', 'Oatmeal', 'Salmon oil'], [meatFirst('Deboned chicken'), naturalPreservatives], [31, 18, 37], { kcalPerKg: 3750, kcalPerCup: 405 }), lifeStage: 'growth', line: 'sample-premium-dog', formula: 'Puppy', flavor: 'Chicken', sizes: bags },
    { ...fixture('sample-dog-large-puppy', SAMPLE_GOOD.label.brand!, 'Large Breed Puppy Chicken and Oatmeal', 'dog', 'dry', 2, 90, ['Deboned chicken', 'Chicken meal', 'Oatmeal', 'Barley', 'Salmon oil'], [meatFirst('Deboned chicken'), naturalPreservatives], [29, 14, 40], { kcalPerKg: 3500, kcalPerCup: 360 }), lifeStage: 'growth', line: 'sample-premium-dog', formula: 'Large Breed Puppy', flavor: 'Chicken', sizes: bags },
    fixture('sample-dog-wet', 'Sample pantry', 'Turkey and Pumpkin Stew', 'dog', 'wet', 3, 88, ['Turkey', 'Turkey broth', 'Turkey liver', 'Pumpkin', 'Carrots', 'Flaxseed'], [meatFirst('Turkey'), { severity: 'good', title: 'High protein', detail: 'About 42% protein once water is removed.' }], [42, 24, 18], { kcalPerKg: 1150, kcalPerUnit: 410, unit: 'can' }),
    fixture('sample-dog-treat', 'Sample bakery', 'Single Ingredient Beef Liver Bites', 'dog', 'treat', 1, 84, ['Beef liver'], [meatFirst('Beef liver'), { severity: 'info', title: 'This is a treat', detail: 'Scored on ingredients only. Treats should stay under ten percent of daily calories.' }], [62, 12, 8], { kcalPerKg: 4100, kcalPerUnit: 9, unit: 'treat' }),
    fixture('sample-cat-dry', 'Sample feline', 'Salmon and Turkey Recipe', 'cat', 'dry', 2, 86, ['Deboned salmon', 'Turkey meal', 'Peas', 'Chicken fat (preserved with mixed tocopherols)', 'Taurine'], [meatFirst('Deboned salmon'), naturalPreservatives, { severity: 'good', title: 'Taurine included', detail: 'Cats cannot make enough taurine on their own, and this food adds it.' }], [40, 18, 27], { kcalPerKg: 3900, kcalPerCup: 430 }),
  ],
}
