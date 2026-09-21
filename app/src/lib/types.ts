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
  size?: string
  foodType?: string
  concerns: string[]
  allergies: string[]
  currentScanId?: string
}

export interface Scan {
  id: string
  petId: string
  createdAt: number
  source: 'label' | 'barcode' | 'web' | 'sample'
  sourceUrl?: string
  label: LabelData
  result: ScoreResult
  photoUri?: string
}
