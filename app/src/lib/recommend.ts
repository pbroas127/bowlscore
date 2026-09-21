// Pure catalog logic: swap recommendations that suit the pet, and the "why it is better" line. Allergen matching lives in allergens.ts.
// No react-native imports here, so catalog.test.ts runs in plain node.
import { allergyHits } from './allergens.ts'
import { suitsPet } from './fit.ts'
import type { CatalogProduct, Flag, FoodForm, LabelData, LifeStage, Pet, ScoreResult, Species } from './types'

export { ALLERGENS, allergyHits } from './allergens.ts'

const FORMS: readonly string[] = ['dry', 'wet', 'freeze_dried', 'raw']
export const formOf = (label: LabelData): FoodForm | undefined => (label.isTreat ? 'treat' : FORMS.includes(label.foodForm) ? (label.foodForm as FoodForm) : undefined)

// AAFCO has no senior profile, so an adult recipe suits a senior pet. Growth needs a growth or all stages recipe.
const stageOk = (product: CatalogProduct['lifeStage'], stage?: LifeStage) => !stage || product === 'all' || product === stage || (stage === 'senior' && product === 'adult')
const byScoreThenPrice = (a: CatalogProduct, b: CatalogProduct) => b.result.score - a.result.score || a.priceTier - b.priceTier

// Carousels look unfinished with blank photos, so they stick to products with a pack shot when enough of them qualify.
// The full catalog list still shows everything.
const withPhoto = (list: CatalogProduct[]) => {
  const shot = list.filter((p) => p.image)
  return shot.length >= 3 ? shot : list
}

// Catalog labels were not read for a life stage statement, so the product's own life stage stands in for it.
export const claimOf = (p: CatalogProduct): LabelData['lifeStageClaim'] =>
  p.label.lifeStageClaim && p.label.lifeStageClaim !== 'unknown' ? p.label.lifeStageClaim : p.lifeStage === 'growth' ? 'growth' : p.lifeStage === 'adult' || p.lifeStage === 'senior' ? 'adult' : 'all'
const suits = (p: CatalogProduct, pet?: Pet) => !pet || suitsPet(pet, p.label, claimOf(p))

export interface RecommendFor { species: Species; stage?: LifeStage; form?: FoodForm; allergies?: string[]; currentScore?: number; excludeId?: string; pet?: Pet }

export function recommend(catalog: CatalogProduct[], { species, stage, form, allergies, currentScore = 0, excludeId, pet }: RecommendFor): CatalogProduct[] {
  const pool = catalog.filter(
    (p) =>
      p.species === species &&
      p.id !== excludeId &&
      (form ? p.form === form : p.form !== 'treat') && // treats only ever swap for treats
      stageOk(p.lifeStage, stage) &&
      !allergyHits(allergies, p.label.ingredients).length &&
      suits(p, pet),
  )
  const bar = Math.max(75, currentScore + 15)
  const strong = pool.filter((p) => p.result.score >= bar)
  return withPhoto(strong.length ? strong : pool.filter((p) => p.result.score > currentScore)).sort(byScoreThenPrice).slice(0, 6)
}

export const topRated = (catalog: CatalogProduct[], species: Species, allergies?: string[], max = 8, pet?: Pet) =>
  withPhoto(catalog.filter((p) => p.species === species && !allergyHits(allergies, p.label.ingredients).length && suits(p, pet))).sort(byScoreThenPrice).slice(0, max)

export const watchOuts = (r: ScoreResult) => r.flags.filter((f) => f.severity !== 'good' && f.severity !== 'info')
const goods = (r: ScoreResult) => r.flags.filter((f) => f.severity === 'good')
const RANK = { critical: 0, warning: 1, caution: 2, info: 3, good: 4 } as const

// Watch out titles that are sentences, not nouns, so "No <title>" would read badly. Empty means the matching good flag says it better.
const FIXED: Record<string, string> = {
  'No meat in first place': '',
  'Byproduct is the main ingredient': '',
  'Unnamed meat source comes first': '',
  'No taurine listed': '',
  'Protein below the minimum': 'Meets the protein minimum',
  'Fat below the minimum': 'Meets the fat minimum',
  'Heavy on carbs': 'Fewer carbs',
  'Not a complete meal': 'Complete and balanced',
  'No complete and balanced statement found': 'Complete and balanced',
}
const fixedPhrase = (f: Flag) => FIXED[f.title] ?? `No ${f.title.toLowerCase()}`
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

// One short line made only of real differences between the two results. Never filler.
export function whyBetter(candidate: { result: ScoreResult }, current?: { result: ScoreResult }): string {
  const c = candidate.result
  if (!current) {
    const top = goods(c).slice(0, 2).map((f) => f.title)
    if (top.length) return [top[0], ...top.slice(1).map(lowerFirst)].join(' and ')
    return watchOuts(c).length ? `Scores ${c.score} out of 100` : 'No watch outs found'
  }
  const r = current.result
  const has = (res: ScoreResult, title: string) => res.flags.some((f) => f.title === title)
  const removed = watchOuts(r).filter((f) => !has(c, f.title)).sort((a, b) => RANK[a.severity] - RANK[b.severity]).map(fixedPhrase).filter(Boolean)
  const gained = goods(c).filter((f) => !has(r, f.title)).map((f) => f.title)
  const parts = [removed[0], gained[0], removed[1], gained[1]].filter(Boolean).slice(0, 2)
  if (parts.length) return [parts[0], ...parts.slice(1).map(lowerFirst)].join(' and ')
  const [cp, rp, cc, rc] = [c.dryMatter.protein, r.dryMatter.protein, c.dryMatter.carbs, r.dryMatter.carbs]
  if (cp != null && rp != null && cp - rp >= 3) return `More protein, ${cp}% against ${rp}%`
  if (cc != null && rc != null && rc - cc >= 5) return `Fewer carbs, ${cc}% against ${rc}%`
  return c.score > r.score ? `Scores ${c.score - r.score} points higher` : `Scores ${c.score} out of 100`
}

// The one line under a side by side comparison.
export function verdict(a: { name: string; result: ScoreResult }, b: { name: string; result: ScoreResult }): string {
  const d = a.result.score - b.result.score
  if (!d) return 'These two score the same. Let the ingredients decide.'
  const [win, lose] = d > 0 ? [a, b] : [b, a]
  const why = whyBetter(win, lose)
  return `${win.name} wins by ${Math.abs(d)} ${Math.abs(d) === 1 ? 'point' : 'points'}.${why.startsWith('Scores') ? '' : ` ${why}.`}`
}
