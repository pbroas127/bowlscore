// "Is this food right for THIS pet": age, size, allergies and breed against what the label claims, plus a feeding guide.
// Pure logic, no react-native imports, so fit.test.ts runs in plain node. None of this changes the score.
import { findBreed } from './breeds.ts'
import { allergyHits } from './allergens.ts'
import type { LabelData, LifeStage, Pet } from './types'

export type SizeClass = 'Small' | 'Medium' | 'Large' | 'Giant'
const MONTH = 30.44 * 86_400_000

export const ageMonths = (pet: Pet, now = Date.now()) => (pet.bornAt ? Math.max(0, Math.floor((now - pet.bornAt) / MONTH)) : undefined)
// The birthday behind an age typed in as months. A hair over, so the age reads back exactly as entered.
export const bornAtFor = (months: number, now = Date.now()) => Math.round(now - (months + 0.01) * MONTH)
export const ageText = (months: number) => (months < 24 ? `${months} ${months === 1 ? 'month' : 'months'}` : `${Math.floor(months / 12)} years`)

const classOf = (lb: number): SizeClass => (lb < 20 ? 'Small' : lb < 50 ? 'Medium' : lb < 90 ? 'Large' : 'Giant')

// Expected ADULT weight: the breed says it best, then a grown pet's own weight, then the size picked in onboarding.
export function adultLb(pet: Pet, now = Date.now()): number | undefined {
  const breed = findBreed(pet.species, pet.breed)
  if (breed && breed.name !== 'Mixed breed') return breed.adultLb
  if (pet.weightLb && stageFor(pet, now) !== 'growth') return pet.weightLb
  return undefined
}
export function sizeClass(pet: Pet, now = Date.now()): SizeClass | undefined {
  if (pet.species === 'cat') return undefined
  const lb = adultLb(pet, now)
  if (lb) return classOf(lb)
  if (pet.size === 'Small' || pet.size === 'Medium' || pet.size === 'Large' || pet.size === 'Giant') return pet.size
  // A growing mixed breed: whatever it weighs today, it will not end up lighter.
  return pet.weightLb ? classOf(pet.weightLb) : undefined
}

// When growth ends and the senior years start, in months. Bigger dogs grow longer and age sooner.
const ADULT_AT: Record<SizeClass, number> = { Small: 10, Medium: 12, Large: 15, Giant: 21 }
const SENIOR_AT: Record<SizeClass, number> = { Small: 120, Medium: 96, Large: 84, Giant: 72 }
const sizeForAge = (pet: Pet): SizeClass => {
  const breed = findBreed(pet.species, pet.breed)
  if (breed && breed.name !== 'Mixed breed') return classOf(breed.adultLb)
  return pet.size === 'Small' || pet.size === 'Large' || pet.size === 'Giant' ? pet.size : 'Medium'
}

// The life stage used for scoring and recommendations. A known age wins over the stage picked in onboarding.
export function stageFor(pet: Pet, now = Date.now()): LifeStage {
  const months = ageMonths(pet, now)
  if (months == null) return pet.stage
  if (pet.species === 'cat') {
    const adultAt = (findBreed('cat', pet.breed)?.adultLb ?? 0) >= 14 ? 15 : 12 // the big slow growing breeds
    return months < adultAt ? 'growth' : months >= 132 ? 'senior' : 'adult'
  }
  const size = sizeForAge(pet)
  return months < ADULT_AT[size] ? 'growth' : months >= SENIOR_AT[size] ? 'senior' : 'adult'
}

// A large breed puppy is the one case where the wrong complete food does real harm (too much calcium, bone disease).
export const isLargeBreedPuppy = (pet: Pet, now = Date.now()) => {
  const size = sizeClass(pet, now)
  return pet.species === 'dog' && stageFor(pet, now) === 'growth' && (size === 'Large' || size === 'Giant' || (adultLb(pet, now) ?? 0) >= 70)
}

export type Tone = 'good' | 'caution' | 'bad' | 'info'
export interface FitLine { label: string; value: string; note: string; tone: Tone }
export interface Fit { verdict: 'good' | 'caution' | 'bad'; headline: string; lines: FitLine[]; breedNote?: string }

const STAGE_WORD = { dog: { growth: 'puppy', adult: 'adult', senior: 'senior' }, cat: { growth: 'kitten', adult: 'adult', senior: 'senior' } } as const

// `claim` lets a catalog product pass its known life stage when the label itself was not read for one.
export function fitFor(pet: Pet, label: LabelData, claim: LabelData['lifeStageClaim'] = label.lifeStageClaim, now = Date.now()): Fit {
  const stage = stageFor(pet, now)
  const word = STAGE_WORD[pet.species][stage]
  const months = ageMonths(pet, now)
  const lines: FitLine[] = []
  const treat = !!label.isTreat

  // Age against the life stage the food is made for.
  const age = months != null ? `${ageText(months)}, ${word}` : word[0].toUpperCase() + word.slice(1)
  if (treat) lines.push({ label: 'Age', value: age, note: 'Treats are not made for a life stage. Keep them inside the daily allowance.', tone: 'info' })
  else if (!claim || claim === 'unknown') lines.push({ label: 'Age', value: age, note: stage === 'growth' ? `We could not see who this food is made for. A ${word} needs a label that says growth or all life stages.` : 'We could not see the life stage statement on this label.', tone: stage === 'growth' ? 'caution' : 'info' })
  else if (stage === 'growth') lines.push(claim === 'adult'
    ? { label: 'Age', value: age, note: `This is an adult maintenance food. A growing ${word} needs a growth or all life stages food.`, tone: 'bad' }
    : { label: 'Age', value: age, note: claim === 'growth' ? `Made for growth, which is what a ${word} needs.` : `Made for all life stages, so it covers a growing ${word}.`, tone: 'good' })
  else lines.push(claim === 'growth'
    ? { label: 'Age', value: age, note: `This is a ${STAGE_WORD[pet.species].growth} food. It is richer than an adult needs, so watch portions.`, tone: 'caution' }
    : { label: 'Age', value: age, note: claim === 'adult' ? 'Made for adult maintenance, which matches.' : 'Made for all life stages, which covers adults.', tone: 'good' })

  // Size: only dogs, and it only bites for large breed puppies.
  const size = sizeClass(pet, now)
  if (pet.species === 'dog' && (size || pet.weightLb)) {
    const value = [pet.weightLb ? `${Math.round(pet.weightLb)} lb` : undefined, size ? `${size.toLowerCase()} breed` : undefined].filter(Boolean).join(', ')
    if (treat || !isLargeBreedPuppy(pet, now)) lines.push({ label: 'Size', value, note: treat ? 'Size does not change whether a treat is suitable, only how many.' : 'No size limits apply to this food at this age.', tone: 'info' })
    else if (label.largeSizeGrowth === 'excluded') lines.push({ label: 'Size', value, note: 'The label says it is NOT for growth of large size dogs. Too much calcium can harm growing bones in big puppies.', tone: 'bad' })
    else if (label.largeSizeGrowth === 'included') lines.push({ label: 'Size', value, note: 'The label covers growth of large size dogs, with calcium kept in the safe range.', tone: 'good' })
    else lines.push({ label: 'Size', value, note: 'Big puppies need controlled calcium. Look for the words "including growth of large size dogs" on the bag.', tone: 'caution' })
  }

  const hits = allergyHits(pet.allergies, label.ingredients)
  lines.push(hits.length
    ? { label: 'Allergies', value: pet.allergies.join(', '), note: `Contains ${hits.join(' and ').toLowerCase()}.`, tone: 'bad' }
    : { label: 'Allergies', value: pet.allergies.length ? pet.allergies.join(', ') : 'None', note: pet.allergies.length ? 'None of these are in the ingredients.' : 'Nothing to avoid.', tone: 'good' })

  const verdict = lines.some((l) => l.tone === 'bad') ? 'bad' : lines.some((l) => l.tone === 'caution') ? 'caution' : 'good'
  const headline = verdict === 'bad' ? `Not a fit for ${pet.name}` : verdict === 'caution' ? `Check before feeding ${pet.name}` : treat ? `Fine as a treat for ${pet.name}` : `A good fit for ${pet.name}`
  return { verdict, headline, lines, breedNote: findBreed(pet.species, pet.breed)?.note }
}

// Catalog products and swaps: never suggest something that is wrong for this pet's age or size.
export const suitsPet = (pet: Pet, label: LabelData, claim?: LabelData['lifeStageClaim'], now = Date.now()) => fitFor(pet, label, claim, now).verdict !== 'bad'

// ---- feeding guide ----
// Resting energy = 70 x kg^0.75, times a life stage factor (the standard veterinary method, WSAVA and AAHA use it).
// A starting point: real needs vary by about a fifth either way with activity and metabolism.
export interface Feeding { kcal: number; meals: number; cups?: number; grams?: number; units?: number; unit?: string; waterOz: number; treatKcal: number; treatsPerDay?: number }

export function dailyKcal(pet: Pet, now = Date.now()): number | undefined {
  if (!pet.weightLb) return undefined
  const rer = 70 * Math.pow(pet.weightLb / 2.2046, 0.75)
  const stage = stageFor(pet, now)
  const months = ageMonths(pet, now) ?? 8
  const factor = pet.species === 'cat' ? (stage === 'growth' ? 2.5 : stage === 'senior' ? 1.1 : 1.2) : stage === 'growth' ? (months < 4 ? 3 : months < 12 ? 2 : 1.7) : stage === 'senior' ? 1.4 : 1.6
  return Math.round((rer * factor) / 10) * 10
}

const quarter = (n: number) => Math.round(n * 4) / 4
export function feeding(pet: Pet, label: LabelData, now = Date.now()): Feeding | undefined {
  const kcal = dailyKcal(pet, now)
  if (!kcal) return undefined
  const c = label.calories ?? {}
  const months = ageMonths(pet, now)
  const meals = pet.meals ?? (stageFor(pet, now) === 'growth' && (months ?? 8) < 6 ? 3 : 2)
  const waterOz = Math.round(pet.weightLb! * (pet.species === 'cat' ? 0.8 : 1)) // about an ounce per pound for dogs; wet food covers part of it
  const treatKcal = Math.round(kcal * 0.1)
  const base = { kcal, meals, waterOz, treatKcal }
  if (label.isTreat) return { ...base, treatsPerDay: c.kcalPerUnit ? Math.max(1, Math.floor(treatKcal / c.kcalPerUnit)) : undefined, unit: c.unit }
  return {
    ...base,
    cups: c.kcalPerCup ? quarter(kcal / c.kcalPerCup) : undefined,
    grams: c.kcalPerKg ? Math.round((kcal / c.kcalPerKg) * 100) * 10 : undefined,
    units: !c.kcalPerCup && c.kcalPerUnit ? quarter(kcal / c.kcalPerUnit) : undefined,
    unit: c.unit,
  }
}

// 2.25 reads as "2 1/4", the way a measuring cup is marked.
export function fraction(n: number): string {
  const whole = Math.floor(n)
  const part = ['', '1/4', '1/2', '3/4'][Math.round((n - whole) * 4)] ?? ''
  return [whole || (part ? '' : '0'), part].filter(Boolean).join(' ')
}

// ---- bag tracker and weigh in ----
// ponytail: a cup of kibble weighs about 105 g (95 to 120 across brands). Only used when the label gave calories per cup
// and not per kg. Ceiling: the days left can be off by a tenth. Upgrade path: ask for the cup weight printed on the bag.
export const gramsPerDay = (pet: Pet, label: LabelData, now = Date.now()) => {
  const plan = label.isTreat ? undefined : feeding(pet, label, now)
  return plan?.grams ?? (plan?.cups ? Math.round(plan.cups * 105) : undefined)
}

const DAY = 86_400_000
export function bagStatus(bag: { lb: number; openedAt: number }, grams: number, now = Date.now()) {
  const total = Math.max(1, Math.floor((bag.lb * 453.6) / grams))
  const left = Math.max(0, total - Math.floor((now - bag.openedAt) / DAY))
  return { total, left, emptyAt: bag.openedAt + total * DAY }
}

// Growing pets change portions fast, so their weight goes stale after a month.
export const weighInDue = (pet: Pet, now = Date.now()) => !!pet.weightLb && stageFor(pet, now) === 'growth' && now - (pet.weighedAt ?? 0) > 30 * DAY
