/// <reference types="node" />
// Run with: node --experimental-strip-types src/lib/fit.test.ts
import assert from 'node:assert/strict'
import { ageMonths, bornAtFor, dailyKcal, feeding, fitFor, fraction, isLargeBreedPuppy, sizeClass, stageFor, suitsPet } from './fit.ts'
import type { LabelData, Pet } from './types.ts'

const NOW = Date.UTC(2026, 8, 21)
const monthsAgo = (m: number) => NOW - m * 30.44 * 86_400_000
const pet = (over: Partial<Pet>): Pet => ({ id: 'p', name: 'Bear', species: 'dog', stage: 'adult', concerns: [], allergies: [], treatScanIds: [], ...over })
const food = (over: Partial<LabelData> = {}): LabelData => ({ foodForm: 'dry', aafco: 'complete', ingredients: ['Lamb', 'Rice', 'Peas'], ...over })

// The owner's dog: a 9 month old, 72 lb Bernese Mountain Dog. Still a puppy (giants grow to 21 months), and a large breed one.
const bear = pet({ breed: 'Bernese Mountain Dog', bornAt: monthsAgo(9), weightLb: 72, stage: 'adult' })
assert.equal(stageFor(bear, NOW), 'growth') // age beats the stage picked in onboarding
assert.equal(sizeClass(bear, NOW), 'Giant')
assert.ok(isLargeBreedPuppy(bear, NOW))

const excluded = fitFor(bear, food({ lifeStageClaim: 'all', largeSizeGrowth: 'excluded' }), undefined, NOW)
assert.equal(excluded.verdict, 'bad')
assert.match(excluded.lines.find((l) => l.label === 'Size')!.note, /NOT for growth of large size dogs/)
assert.ok(excluded.breedNote?.includes('bloat'))

assert.equal(fitFor(bear, food({ lifeStageClaim: 'growth', largeSizeGrowth: 'included' }), undefined, NOW).verdict, 'good')
assert.equal(fitFor(bear, food({ lifeStageClaim: 'all' }), undefined, NOW).verdict, 'caution') // the large size wording was not seen
assert.equal(fitFor(bear, food({ lifeStageClaim: 'adult' }), undefined, NOW).verdict, 'bad') // adult food for a puppy
assert.ok(!suitsPet(bear, food(), 'adult', NOW)) // a catalog product passes its life stage as the claim

// The same dog at 3 years is an adult, and the large size wording stops mattering.
const grown = pet({ breed: 'Bernese Mountain Dog', bornAt: monthsAgo(36), weightLb: 100 })
assert.equal(stageFor(grown, NOW), 'adult')
assert.equal(fitFor(grown, food({ lifeStageClaim: 'adult', largeSizeGrowth: 'excluded' }), undefined, NOW).verdict, 'good')
assert.equal(fitFor(grown, food({ lifeStageClaim: 'growth' }), undefined, NOW).verdict, 'caution')
assert.equal(stageFor(pet({ breed: 'Great Dane', bornAt: monthsAgo(80) }), NOW), 'senior') // giants are seniors at 6
assert.equal(stageFor(pet({ breed: 'Chihuahua', bornAt: monthsAgo(80) }), NOW), 'adult')

// Allergies always count, treats skip the life stage rules, and no age falls back to the onboarding stage.
assert.equal(fitFor(pet({ allergies: ['Chicken'] }), food({ lifeStageClaim: 'adult', ingredients: ['Chicken meal', 'Rice', 'Peas'] }), undefined, NOW).verdict, 'bad')
assert.equal(fitFor(bear, food({ isTreat: true, aafco: 'not_found' }), undefined, NOW).verdict, 'good')
assert.equal(stageFor(pet({ stage: 'senior' }), NOW), 'senior')
assert.equal(sizeClass(pet({ size: 'Large' }), NOW), 'Large')

// Cats: a Maine Coon is still growing at 13 months, a domestic shorthair is not.
assert.equal(stageFor(pet({ species: 'cat', breed: 'Maine Coon', bornAt: monthsAgo(13) }), NOW), 'growth')
assert.equal(stageFor(pet({ species: 'cat', breed: 'Domestic Shorthair', bornAt: monthsAgo(13) }), NOW), 'adult')

// An age typed into the editor reads back as the same number of months.
for (const m of [1, 9, 24, 131]) assert.equal(ageMonths(pet({ bornAt: bornAtFor(m) })), m)

// Feeding. 72 lb = 32.66 kg, RER = 70 x 32.66^0.75 = 957, puppy of 9 months x 2 = 1910 kcal.
assert.equal(dailyKcal(bear, NOW), 1910)
const plan = feeding(bear, food({ calories: { kcalPerCup: 380, kcalPerKg: 3600 } }), NOW)!
assert.deepEqual({ cups: plan.cups, grams: plan.grams, meals: plan.meals, waterOz: plan.waterOz, treatKcal: plan.treatKcal }, { cups: 5, grams: 530, meals: 2, waterOz: 72, treatKcal: 191 })
assert.equal(feeding(bear, food({ isTreat: true, calories: { kcalPerUnit: 40, unit: 'treat' } }), NOW)!.treatsPerDay, 4)
assert.equal(feeding(pet({}), food(), NOW), undefined) // no weight, no guide
assert.equal(dailyKcal(pet({ species: 'cat', weightLb: 10, bornAt: monthsAgo(48) }), NOW), 260) // 10 lb adult cat: about 260 kcal
assert.deepEqual([fraction(2.25), fraction(0.5), fraction(3), fraction(0)], ['2 1/4', '1/2', '3', '0'])

console.log('fit tests passed')
