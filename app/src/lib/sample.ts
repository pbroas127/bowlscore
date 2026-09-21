// Canned results. The onboarding demo scan uses SAMPLE_POOR (zero API cost), and the app falls back to these
// when no API URL is configured so every screen can be previewed without a backend.
import type { LabelData, ScoreResult } from './types'

export const SAMPLE_POOR: { label: LabelData; result: ScoreResult } = {
  label: {
    productName: 'Complete Adult Chicken Flavor',
    brand: 'Sample kibble',
    foodForm: 'dry',
    aafco: 'complete',
    ingredients: ['Ground yellow corn', 'Meat and bone meal', 'Corn gluten meal', 'Animal fat (preserved with BHA)', 'Soybean meal', 'Chicken byproduct meal', 'Animal digest', 'Salt', 'Red 40', 'Yellow 5'],
    analysis: { proteinMin: 21, fatMin: 10, fiberMax: 4.5, moistureMax: 12 },
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

// Generic better picks shown under a low score. Links are plain store searches until the affiliate tags are approved.
export const BETTER_PICKS = [
  { name: 'Look for named meat first', why: 'Chicken, salmon or beef as ingredient one', score: 90, query: 'dry food real meat first ingredient' },
  { name: 'Preserved with vitamin E', why: 'Mixed tocopherols instead of BHA or BHT', score: 86, query: 'food preserved with mixed tocopherols' },
  { name: 'No artificial colors', why: 'Nothing added just to please human eyes', score: 82, query: 'food no artificial colors' },
]
