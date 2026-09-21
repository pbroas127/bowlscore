// Generic sample labels for the landing page demo. Not real brands on purpose (trademark and
// defamation risk). Scores are never hard coded: every number on the site comes from scoreFood().
import type { LabelData, Species } from './rubric.ts'

export interface Sample {
  id: string
  name: string
  kind: string
  species: Species
  label: LabelData
}

export const SAMPLES: Sample[] = [
  {
    id: 'kibble',
    name: 'Grocery store kibble',
    kind: 'Dry dog food',
    species: 'dog',
    label: {
      foodForm: 'dry',
      aafco: 'complete',
      ingredients: ['Ground yellow corn', 'Meat and bone meal', 'Corn gluten meal', 'Animal fat (preserved with BHA)', 'Soybean meal', 'Animal digest', 'Salt', 'Red 40', 'Yellow 5', 'Blue 2'],
      analysis: { proteinMin: 21, fatMin: 10, fiberMax: 4.5, moistureMax: 12 },
    },
  },
  {
    id: 'grainfree',
    name: 'Grain free premium',
    kind: 'Dry dog food',
    species: 'dog',
    label: {
      foodForm: 'dry',
      aafco: 'complete',
      ingredients: ['Deboned salmon', 'Peas', 'Pea protein', 'Lentils', 'Chickpeas', 'Salmon meal', 'Chicken fat (preserved with mixed tocopherols)', 'Canola oil', 'Dried chicory root', 'Rosemary extract'],
      analysis: { proteinMin: 25, fatMin: 14, fiberMax: 5, moistureMax: 10 },
    },
  },
  {
    id: 'fresh',
    name: 'Fresh cooked',
    kind: 'Fresh dog food',
    species: 'dog',
    label: {
      foodForm: 'wet',
      aafco: 'complete',
      ingredients: ['Turkey', 'Turkey liver', 'Sweet potato', 'Carrots', 'Spinach', 'Fish oil', 'Dried egg product', 'Vitamin E supplement'],
      analysis: { proteinMin: 11, fatMin: 6, fiberMax: 1.5, moistureMax: 72 },
    },
  },
]
