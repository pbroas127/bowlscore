// "Is this right for THIS pet": the fit verdict and the feeding guide, shown under the score of a scan or a catalog product.
// All the rules live in lib/fit.ts. Nothing here changes a score.
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Bone, CheckCircle, Drop, Fire, Scales, Warning, XCircle } from 'phosphor-react-native'
import { severityColor } from '@/components/FlagRow'
import { ActionRow, Card, TextLink } from '@/components/ui'
import { dailyKcal, feeding, fitFor, fraction, isLargeBreedPuppy, type Tone } from '@/lib/fit'
import type { LabelData, Pet } from '@/lib/types'
import { color, radius, type } from '@/theme'

const TONE: Record<Tone, string> = { good: color.green, caution: severityColor.caution, bad: color.bad, info: color.ink3 }
const VERDICT = { good: CheckCircle, caution: Warning, bad: XCircle } as const

const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const count = (n: number, word: string) => `${fraction(n)} ${n > 1 ? word + (/(s|x|ch|sh)$/.test(word) ? 'es' : 's') : word}`
// "About Boxers" reads well, "About Poodle (Standard)s" does not.
const aboutBreed = (breed: string) => (/[)sx]$|ese$/i.test(breed) ? `About the ${breed}` : `About ${breed}s`)

export const treatAllowance = (pet: Pet) => {
  const kcal = dailyKcal(pet)
  return kcal ? `Up to ${num(Math.round(kcal * 0.1))} calories a day` : undefined
}

export function FitCard({ pet, label, claim, onEdit }: { pet: Pet; label: LabelData; claim?: LabelData['lifeStageClaim']; onEdit: () => void }) {
  const fit = fitFor(pet, label, claim)
  const Icon = VERDICT[fit.verdict]
  const breed = pet.breed?.trim()
  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Icon size={30} weight="fill" color={TONE[fit.verdict]} />
        <Text style={[type.h2, s.flex]}>{fit.headline}</Text>
      </View>
      {fit.lines.map((l) => (
        <View key={l.label} style={s.line}>
          <View style={s.lineLabel}>
            <View style={[s.dot, { backgroundColor: TONE[l.tone] }]} />
            <Text style={type.caption}>{l.label}</Text>
          </View>
          <View style={s.flex}>
            <Text style={type.title}>{l.value}</Text>
            <Text style={type.caption}>{l.note}</Text>
          </View>
        </View>
      ))}
      {fit.breedNote ? (
        <View style={s.info}>
          {breed && breed.toLowerCase() !== 'mixed breed' ? <Text style={type.label}>{aboutBreed(breed)}</Text> : null}
          <Text style={[type.caption, { color: color.ink }]}>{fit.breedNote}</Text>
        </View>
      ) : null}
      {!pet.bornAt && !pet.weightLb ? <View style={s.nudge}><TextLink label={`Add ${pet.name}'s age and weight for a sharper answer`} onPress={onEdit} /></View> : null}
    </Card>
  )
}

function Row({ icon, children }: { icon: ReactNode; children: string }) {
  return <View style={s.row}>{icon}<Text style={[type.label, s.flex]}>{children}</Text></View>
}

export function FeedingCard({ pet, label, onEdit }: { pet: Pet; label: LabelData; onEdit: () => void }) {
  const plan = feeding(pet, label)
  if (!plan) return <Card style={s.ask}><ActionRow last label={`Add ${pet.name}'s weight to see how much to feed`} icon={<Scales size={22} weight="bold" color={color.ink} />} onPress={onEdit} /></Card>

  const meals = `${plan.meals} ${plan.meals === 1 ? 'meal' : 'meals'}`
  const perMeal = (n: number) => Math.round((n / plan.meals) * 4) / 4
  const split = (n: number, word: string) => (perMeal(n) ? `${meals} of ${count(perMeal(n), word)}` : `Split over ${meals}`) // a quarter cup is the smallest honest measure
  const kcalLine = `About ${num(plan.kcal)} calories a day`
  // [the big line, the line under it]. A food leads with whatever the label lets us measure: cups, then grams, then cans.
  const [big, sub] = label.isTreat
    ? plan.treatsPerDay ? [`Up to ${plan.treatsPerDay} a day`, `That is about ${num(plan.treatKcal)} calories, a tenth of the day`] : [`Up to ${num(plan.treatKcal)} calories of treats a day`, 'Snap the calorie line on the bag to see how many that is']
    : plan.cups ? [`${count(plan.cups, 'cup')} a day`, split(plan.cups, 'cup')]
    : plan.grams ? [`${num(plan.grams)} g a day`, `${meals} of ${num(Math.round(plan.grams / plan.meals))} g`]
    : plan.units ? [`${count(plan.units, plan.unit || 'serving')} a day`, split(plan.units, plan.unit || 'serving')]
    : [kcalLine, 'Snap the calorie line on the bag to get cups per meal']
  const measured = Boolean(label.isTreat ? plan.treatsPerDay : plan.cups || plan.grams || plan.units)

  return (
    <Card style={s.card}>
      <View>
        <Text style={[type.label, { color: color.ink2 }]}>Feeding {pet.name}</Text>
        <Text style={measured ? type.h1 : type.h2}>{big}</Text>
        <Text style={[type.body, { color: color.ink2 }]}>{sub}</Text>
      </View>
      <View style={s.rows}>
        {big === kcalLine ? null : <Row icon={<Fire size={18} weight="bold" color={color.ink2} />}>{kcalLine}</Row>}
        {label.isTreat ? null : (
          <>
            <Row icon={<Drop size={18} weight="bold" color={color.ink2} />}>{`Water: about ${plan.waterOz} oz a day${label.foodForm === 'wet' ? '. Wet food covers part of this' : ''}`}</Row>
            <Row icon={<Bone size={18} weight="bold" color={color.ink2} />}>{`Treats: up to ${num(plan.treatKcal)} calories a day`}</Row>
          </>
        )}
      </View>
      {!label.isTreat && isLargeBreedPuppy(pet) ? <View style={s.info}><Text style={[type.caption, { color: color.ink }]}>Keep big puppies lean. Slow, steady growth protects their joints.</Text></View> : null}
      <Text style={type.caption}>A starting point. Your vet knows your pet best.</Text>
    </Card>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 14, marginBottom: 12 },
  ask: { paddingVertical: 0, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flexDirection: 'row', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.hairline },
  lineLabel: { width: 84, flexDirection: 'row', alignItems: 'center', gap: 8, height: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  info: { backgroundColor: color.yellowSoft, borderRadius: radius.chip, padding: 12, gap: 2 },
  nudge: { alignItems: 'flex-start' },
  rows: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
})
