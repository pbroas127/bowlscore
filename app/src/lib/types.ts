// Shapes returned by the scan API. The scoring logic lives on the server (site/src/lib/rubric.ts); only types are mirrored here.
import type { Grade } from '@/theme'

export type Species = 'dog' | 'cat'
export type LifeStage = 'growth' | 'adult' | 'senior'
export type Severity = 'good' | 'info' | 'caution' | 'warning' | 'critical'

export interface LabelData {
  productName?: string
  brand?: string
  foodForm: 'dry' | 'wet' | 'semi_moist' | 'freeze_dried' | 'raw' | 'unknown'
  isTreat?: boolean
  ingredients: string[]
  analysis?: { proteinMin?: number; fatMin?: number; fiberMax?: number; moistureMax?: number; ashMax?: number; taurineMin?: number }
  aafco: 'complete' | 'supplemental' | 'not_found'
  lifeStageClaim?: 'all' | 'growth' | 'adult' | 'unknown' // what the AAFCO statement says the food is for
  largeSizeGrowth?: 'included' | 'excluded' | 'unknown' // the large size dog (70 lb or more as an adult) growth wording
  calories?: { kcalPerKg?: number; kcalPerCup?: number; kcalPerUnit?: number; unit?: string }
}

export interface Flag { severity: Severity; title: string; detail: string; ingredient?: string }

export interface ScoreResult {
  rubricVersion: number
  score: number
  grade: Grade
  complete: boolean
  components: { ingredients: number; nutrition: number | null; additives: number }
  dryMatter: { protein?: number; fat?: number; fiber?: number; carbs?: number; moistureUsed: number }
  flags: Flag[]
  cap?: { limit: number; reason: string }
}

export interface Pet {
  id: string
  name: string
  species: Species
  stage: LifeStage
  size?: string // Small, Medium, Large, Giant from onboarding; weight and breed win when present
  breed?: string // a name from lib/breeds.ts, or whatever the person typed
  look?: string // a head from components/PetHead.tsx picked by hand; unset means the breed decides
  bornAt?: number // ms timestamp, estimated from the age they entered
  weightLb?: number
  meals?: number // per day, default 2
  weighedAt?: number // when the weight was last entered; growing pets get a monthly nudge
  weighInId?: string // the scheduled weigh in reminder
  bag?: Bag
  foodType?: string
  protein?: string // the main meat in the current food, one of PROTEINS in lib/recommend.ts
  concerns: string[]
  allergies: string[]
  currentScanId?: string
  treatScanIds: string[]
  switchPlan?: SwitchPlan
}

// The open bag of the main food. Days left are worked out from the feeding guide, see bagStatus in lib/fit.ts.
export interface Bag { lb: number; openedAt: number; scanId: string; notificationIds: string[]; link?: string } // link: the person's own reorder link, already tagged

export interface SwitchPlan { productId: string; name: string; startedAt: number; notificationIds: string[] }

export interface Scan {
  id: string
  petId: string
  createdAt: number
  source: 'label' | 'barcode' | 'web' | 'sample'
  sourceUrl?: string
  label: LabelData
  result: ScoreResult
  photoUri?: string
  productId?: string // set when the scan matched a catalog product
  image?: string // that product's photo
}

export type FoodForm = 'dry' | 'wet' | 'freeze_dried' | 'raw' | 'treat'

export interface CatalogProduct {
  id: string
  brand: string
  name: string
  species: Species
  form: FoodForm
  lifeStage: 'all' | LifeStage
  priceTier: 1 | 2 | 3
  image: string | null
  label: LabelData
  result: ScoreResult
  sourceUrl?: string
  links: { amazon: string; chewy?: string }
  sizes?: BagSize[] // what it sells in, small to large, each with its own shop link
  line?: string // shared by the flavors and life stage versions of one product line
  formula?: string // within a line: Adult, Puppy, Large Breed Puppy, Senior
  flavor?: string // within a line: Chicken, Lamb and Rice
}

export interface BagSize { label: string; lb: number; url: string }

export interface Catalog { version: string; products: CatalogProduct[] }
export interface Recall { id: string; date: string; brand: string; product: string; reason: string; url: string }
