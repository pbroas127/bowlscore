// "Is this right for THIS pet": the fit verdict and the feeding guide, shown under the score of a scan or a catalog product.
// All the rules live in lib/fit.ts. Nothing here changes a score. Pictures carry the numbers; a tap opens the full sentence.
import { Image } from 'expo-image'
import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CaretDown, CheckCircle, Drop, Info, Lightbulb, Moon, PawPrint, Sun, SunHorizon, Warning, XCircle } from 'phosphor-react-native'
import { severityColor } from '@/components/FlagRow'
import { PetHead } from '@/components/PetHead'
import { ActionRow, Card, PillButton, TextLink } from '@/components/ui'
import { dailyKcal, feeding, fitFor, fraction, isLargeBreedPuppy, type Feeding, type Tone } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import type { LabelData, Pet } from '@/lib/types'
import { color, font, radius, type } from '@/theme'

const TONE: Record<Tone, string> = { good: color.green, caution: severityColor.caution, bad: color.bad, info: color.ink3 }
const MARK = { good: CheckCircle, caution: Warning, bad: XCircle, info: Info } as const
const VERDICT = { good: 'Good fit', caution: 'Check first', bad: 'Not a fit' } as const

const ART = {
  bowl: require('../../assets/icons/food-bowl.png'),
  catBowl: require('../../assets/icons/cat-bowl.png'),
  water: require('../../assets/icons/water-bowl.png'),
  cup: require('../../assets/icons/measuring-cup.png'),
  can: require('../../assets/icons/wet-food-can.png'),
  treat: require('../../assets/icons/treat.png'),
  bag: require('../../assets/icons/food-bag.png'),
  cake: require('../../assets/icons/birthday-cake.png'),
  scale: require('../../assets/icons/scale.png'),
  shield: require('../../assets/icons/shield.png'),
  sun: require('../../assets/icons/sun.png'),
  moon: require('../../assets/icons/moon.png'),
} as const
export type ArtName = keyof typeof ART
export const Art = ({ name, size, faded }: { name: ArtName; size: number; faded?: boolean }) => (
  <Image source={ART[name]} style={{ width: size, height: size, opacity: faded ? 0.35 : 1 }} contentFit="contain" accessibilityIgnoresInvertColors />
)
const LINE_ART: Record<string, ArtName> = { Age: 'cake', Size: 'scale', Allergies: 'shield' }

export const num = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const count = (n: number, word: string) => `${fraction(n)} ${n > 1 ? word + (/(s|x|ch|sh)$/.test(word) ? 'es' : 's') : word}`
// "About Boxers" reads well, "About Poodle (Standard)s" does not.
const aboutBreed = (breed: string) => (/[)sx]$|ese$/i.test(breed) ? `About the ${breed}` : `About ${breed}s`)
// Tile sized: "9 months, puppy" reads "9 mo, puppy", "72 lb, giant breed" reads "72 lb, giant".
const short = (v: string) => v.replace(/ months?\b/, ' mo').replace(/ years\b/, ' yr').replace(/ breed\b/, '')

export const treatAllowance = (pet: Pet) => {
  const kcal = dailyKcal(pet)
  return kcal ? `Up to ${num(Math.round(kcal * 0.1))} calories a day` : undefined
}

// A small pill that opens its full sentence underneath.
function Tip({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => { tap('select'); setOpen((o) => !o) }} style={({ pressed }) => [s.tip, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? label : `${label}. ${text}`}>
        {icon}
        <Text style={type.label}>{label}</Text>
        <View style={open && { transform: [{ rotate: '180deg' }] }}><CaretDown size={14} weight="bold" color={color.ink2} /></View>
      </Pressable>
      {open ? <Text style={[type.caption, { color: color.ink }]}>{text}</Text> : null}
    </View>
  )
}

export function FitCard({ pet, label, claim, onEdit }: { pet: Pet; label: LabelData; claim?: LabelData['lifeStageClaim']; onEdit: () => void }) {
  const fit = fitFor(pet, label, claim)
  const [open, setOpen] = useState<string>()
  const breed = pet.breed?.trim()
  const note = fit.lines.find((l) => l.label === open)?.note
  return (
    <Card style={s.card}>
      <View style={s.head} accessible accessibilityLabel={fit.headline}>
        <View style={s.headPet}><PetHead pet={pet} size={48} /></View>
        <View style={[s.badge, { backgroundColor: TONE[fit.verdict] }]}>
          <Text style={[type.h2, { color: fit.verdict === 'caution' ? color.ink : color.surface }]}>{label.isTreat && fit.verdict === 'good' ? 'Fine as a treat' : VERDICT[fit.verdict]}</Text>
        </View>
      </View>
      <View style={s.tiles}>
        {fit.lines.map((l) => {
          const Mark = MARK[l.tone]
          const on = open === l.label
          return (
            <Pressable key={l.label} onPress={() => { tap('select'); setOpen(on ? undefined : l.label) }} style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={`${l.label}: ${l.value}. ${l.note}`}>
              <View>
                <Art name={LINE_ART[l.label] ?? 'shield'} size={40} />
                <View style={s.mark}><Mark size={18} weight="fill" color={TONE[l.tone]} /></View>
              </View>
              <Text style={s.value} numberOfLines={2}>{short(l.value)}</Text>
              <Text style={s.tiny}>{l.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {note ? <Text style={[type.caption, { color: color.ink }]}>{note}</Text> : null}
      {fit.breedNote ? <Tip icon={<PawPrint size={16} weight="fill" color={color.ink} />} label={breed && breed.toLowerCase() !== 'mixed breed' ? aboutBreed(breed) : 'Breed tip'} text={fit.breedNote} /> : null}
      {!pet.bornAt && !pet.weightLb ? <View style={s.nudge}><TextLink label={`Add ${pet.name}'s age and weight for a sharper answer`} onPress={onEdit} /></View> : null}
    </Card>
  )
}

// What goes above each bowl: the per meal amount the label lets us measure (cups, then grams, then cans), and the day's total.
// Both undefined until the label gave calories.
export function portion(plan: Feeding): { each?: string; total?: string } {
  const per = (n: number) => Math.round((n / plan.meals) * 4) / 4 // a quarter cup is the smallest honest measure
  const unit = plan.unit || 'serving'
  // The day's total is what actually goes in the bowls, so the numbers always add up (2 bowls of 2½ is 5, not 4¾).
  const day = (n: number) => (per(n) ? per(n) * plan.meals : n)
  if (plan.cups) return { each: per(plan.cups) ? count(per(plan.cups), 'cup') : 'Under ¼ cup', total: `${count(day(plan.cups), 'cup')} a day` }
  if (plan.grams) return { each: `${num(Math.round(plan.grams / plan.meals))} g`, total: `${num(Math.round(plan.grams / plan.meals) * plan.meals)} g a day` }
  if (plan.units) return { each: per(plan.units) ? count(per(plan.units), unit) : `Under ¼ ${unit}`, total: `${count(day(plan.units), unit)} a day` }
  return {}
}

const MEALS: Record<number, string[]> = { 1: ['Daily'], 2: ['Morning', 'Evening'], 3: ['Morning', 'Midday', 'Evening'], 4: ['Morning', 'Midday', 'Afternoon', 'Evening'] }

// Time of day as a plain line icon under each bowl; the word stays in the accessibility label.
const WHEN_ICON = { Morning: Sun, Midday: SunHorizon, Afternoon: SunHorizon, Evening: Moon, Daily: Sun } as const
// "2½ cups" splits into the amount and its unit so the badge can set them in two weights.
const splitAmount = (each: string) => { const m = /^((?:Under )?[\d,¼½¾]+)\s+(.+)$/.exec(each); return m ? [m[1], m[2]] : [each, ''] }

// One bowl per meal, a dark amount badge centered above it and a time of day icon under it. "?" until the portion is known.
export function Bowls({ meals, each, cat, can, mini }: { meals: number; each?: string; cat?: boolean; can?: boolean; mini?: boolean }) {
  const words = MEALS[meals] ?? Array.from({ length: meals }, (_, i) => (i === meals - 1 ? 'Evening' : i ? 'Midday' : 'Morning'))
  const size = (mini ? 44 : 60) * (meals > 3 ? 0.8 : 1)
  const [amount, unit] = each ? splitAmount(each) : ['?', '']
  return (
    <View style={s.bowls}>
      {words.map((w, i) => {
        const When = WHEN_ICON[w as keyof typeof WHEN_ICON] ?? Sun
        return (
          <View key={i} style={s.bowl} accessible accessibilityLabel={`${w}: ${each ?? 'amount not known yet'}`}>
            <View style={[s.amount, !each && s.amountEmpty]}>
              <Text style={[s.amountNum, mini && { fontSize: 13 }, !each && { color: color.ink3 }]} numberOfLines={1}>{amount}</Text>
              {unit ? <Text style={s.amountUnit} numberOfLines={1}>{unit}</Text> : null}
            </View>
            <Art name={can ? 'can' : cat ? 'catBowl' : 'bowl'} size={size} faded={!each} />
            <When size={mini ? 17 : 19} weight="regular" color={color.ink2} />
          </View>
        )
      })}
    </View>
  )
}

export function Tile({ art, value, word, faded, mini }: { art: ArtName; value: string; word: string; faded?: boolean; mini?: boolean }) {
  return (
    <View style={[s.tile, mini && s.tileMini]} accessible accessibilityLabel={`${word}: ${value}`}>
      <Art name={art} size={mini ? 28 : 36} faded={faded} />
      <Text style={[mini ? s.valueMini : s.value, faded && { color: color.ink3 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.tiny}>{word}</Text>
    </View>
  )
}

// `onAddCalories` opens the food editor; without one (a catalog product) the card only says the calories are missing.
export function FeedingCard({ pet, label, onEdit, onAddCalories }: { pet: Pet; label: LabelData; onEdit: () => void; onAddCalories?: () => void }) {
  const plan = feeding(pet, label)
  if (!plan) return <Card style={s.ask}><ActionRow last label={`Add ${pet.name}'s weight to see how much to feed`} icon={<Art name="scale" size={32} />} onPress={onEdit} /></Card>

  const head = (right?: string) => (
    <View style={s.feedHead}>
      <Text style={[type.label, { color: color.ink2, flex: 1 }]}>Feeding {pet.name}</Text>
      {right ? <Text style={[type.label, s.bold]}>{right}</Text> : null}
    </View>
  )
  const fix = onAddCalories
    ? <PillButton label={label.isTreat ? 'Add calories to see how many' : 'Add calories to see cups'} onPress={onAddCalories} />
    : <Text style={[type.caption, { textAlign: 'center' }]}>Calories not listed for this food yet</Text>
  const fine = <Text style={s.fine}>A starting point. Your vet knows your pet best.</Text>

  if (label.isTreat)
    return (
      <Card style={s.card}>
        {head()}
        <View style={s.treat}>
          <Art name="treat" size={64} faded={!plan.treatsPerDay} />
          <View style={{ flex: 1 }}>
            <Text style={[type.h1, !plan.treatsPerDay && { color: color.ink3 }]}>{`Up to ${plan.treatsPerDay ?? '?'} a day`}</Text>
            <Text style={type.caption}>{`About ${num(plan.treatKcal)} cal, a tenth of the day`}</Text>
          </View>
        </View>
        {plan.treatsPerDay ? null : fix}
        {fine}
      </Card>
    )

  const { each, total } = portion(plan)
  const tips: [ReactNode, string, string][] = []
  if (isLargeBreedPuppy(pet)) tips.push([<Lightbulb key="i" size={16} weight="fill" color={color.ink} />, 'Keep puppy lean', 'Keep big puppies lean. Slow, steady growth protects their joints.'])
  if (label.foodForm === 'wet') tips.push([<Drop key="i" size={16} weight="fill" color={color.ink} />, 'Wet food counts', 'Wet food covers part of the water.'])
  return (
    <Card style={s.card}>
      {head(total)}
      <Bowls meals={plan.meals} each={each} cat={pet.species === 'cat'} can={!plan.cups && !plan.grams && /can/i.test(plan.unit ?? '')} />
      {each ? null : fix}
      <View style={s.tiles}>
        <Tile art="water" value={`${plan.waterOz} oz`} word="water" />
        <Tile art="treat" value={`${num(plan.treatKcal)} cal`} word="treats" />
        <Tile art="cup" value={`${num(plan.kcal)} cal`} word="a day" />
      </View>
      {tips.map(([icon, l, text]) => <Tip key={l} icon={icon} label={l} text={text} />)}
      {fine}
    </Card>
  )
}

const s = StyleSheet.create({
  card: { gap: 14, marginBottom: 12 },
  ask: { paddingVertical: 0, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headPet: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.chip, backgroundColor: color.bg, borderWidth: 1.5, borderColor: color.bg },
  tileOn: { borderColor: color.ink },
  tileMini: { paddingVertical: 8 },
  mark: { position: 'absolute', right: -8, bottom: -2, backgroundColor: color.surface, borderRadius: 10 },
  value: { ...type.label, fontFamily: font.textBold, textAlign: 'center', marginTop: 4 },
  valueMini: { ...type.caption, fontFamily: font.textBold, color: color.ink, textAlign: 'center' },
  tiny: { ...type.caption, fontSize: 11, lineHeight: 14 },
  bold: { fontFamily: font.textBold, textAlign: 'center' },
  nudge: { alignItems: 'flex-start' },
  tip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.yellowSoft },
  feedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bowls: { flexDirection: 'row', justifyContent: 'space-around', gap: 4 },
  bowl: { flex: 1, alignItems: 'center', gap: 6 },
  amount: { flexDirection: 'row', alignItems: 'baseline', gap: 3, backgroundColor: color.ink, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 4, maxWidth: '100%' },
  amountEmpty: { backgroundColor: color.hairline },
  amountNum: { fontFamily: font.textBold, fontSize: 14, lineHeight: 18, color: color.surface, fontVariant: ['tabular-nums'] },
  amountUnit: { fontFamily: font.text, fontSize: 11, lineHeight: 14, color: color.surface, opacity: 0.75, flexShrink: 1 },
  treat: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fine: { ...type.caption, fontSize: 11, lineHeight: 14, color: color.ink3 },
})
