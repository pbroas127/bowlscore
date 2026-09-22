// A pet's pantry: main food, switch plan, treats and that pet's scan history. Editing stays behind the pencil.
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, Check, PencilSimple } from 'phosphor-react-native'
import { BagCard } from '@/components/BagCard'
import { FoodEditor } from '@/components/FoodEditor'
import { FeedingCard, treatAllowance } from '@/components/FitCard'
import { sectionTitle } from '@/components/FoodReport'
import { Mascot, mascotFor } from '@/components/Mascot'
import { PetHead } from '@/components/PetHead'
import { ALLERGIES, PetEditor, petLine } from '@/components/PetEditor'
import { openProduct } from '@/components/ProductCard'
import { ago, ScanRow } from '@/components/ScanRow'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, EmptyState, PillButton, ProgressBar, Screen, TextLink } from '@/components/ui'
import { useStore } from '@/lib/store'
import { cancelPlan, PLAN_DAYS, planDay, stepIndex, SWITCH_STEPS } from '@/lib/switchPlan'
import type { LabelData, Pet } from '@/lib/types'
import { color, radius, type } from '@/theme'

function SwitchPlanCard({ pet }: { pet: Pet }) {
  const plan = pet.switchPlan
  if (!plan) return null
  const day = planDay(plan.startedAt)
  const done = day > PLAN_DAYS
  const at = stepIndex(day)
  const stop = () => Alert.alert('Cancel this switch plan?', 'The daily reminders stop too.', [{ text: 'Keep it', style: 'cancel' }, { text: 'Cancel plan', style: 'destructive', onPress: () => cancelPlan(pet) }])

  return (
    <>
      <Text style={sectionTitle}>Switch plan</Text>
      <Card style={{ gap: 12 }}>
        <Pressable onPress={() => openProduct(plan.productId)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={type.caption}>{done ? 'Switched to' : `Day ${day} of ${PLAN_DAYS}, moving to`}</Text>
          <Text style={type.title} numberOfLines={2}>{plan.name}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row' }}><ProgressBar value={Math.min(1, day / PLAN_DAYS)} /></View>
        {done ? (
          <>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Mascot pose="pair-celebrating" size={110} />
              <Text style={[type.body, { color: color.ink2, textAlign: 'center' }]}>Seven days done. {pet.name} is fully on the new food. Scan the bag to make it the main food.</Text>
            </View>
            <PillButton label="Finish the plan" onPress={() => cancelPlan(pet)} />
          </>
        ) : (
          <>
            <View>
              {SWITCH_STEPS.map((step, i) => (
                <View key={step.from} style={[s.step, i === at && s.stepOn]}>
                  <View style={[s.stepDot, i < at && { backgroundColor: color.green, borderColor: color.green }, i === at && { borderColor: color.ink }]}>{i < at ? <Check size={12} weight="bold" color={color.surface} /> : null}</View>
                  <Text style={[type.label, { width: 104 }, i !== at && { color: color.ink2 }]}>{step.days}</Text>
                  <Text style={[i === at ? type.title : type.label, { flex: 1, textAlign: 'right' }, i !== at && { color: color.ink2 }]}>{step.percent === 100 ? 'All new food' : `${step.percent}% new food`}</Text>
                </View>
              ))}
            </View>
            <Text style={type.body}>{at === SWITCH_STEPS.length - 1 ? 'Today the bowl is all new food.' : `Today the bowl is ${SWITCH_STEPS[at].percent} percent new food and ${100 - SWITCH_STEPS[at].percent} percent old food.`} Go slower if {pet.name}'s stomach seems upset.</Text>
            <View style={{ alignItems: 'center' }}><TextLink label="Cancel plan" tone={color.bad} onPress={stop} /></View>
          </>
        )}
      </Card>
    </>
  )
}

export default function PetPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const pet = useStore((st) => st.pets.find((p) => p.id === id))
  const allScans = useStore((st) => st.scans)
  const [draft, setDraft] = useState<Pet>()
  const [food, setFood] = useState<LabelData>()

  if (!pet) return <Screen><View style={s.nav}><TextLink label="Back" onPress={() => router.back()} /></View></Screen>

  const scans = allScans.filter((x) => x.petId === pet.id)
  const main = scans.find((x) => x.id === pet.currentScanId)
  const treats = scans.filter((x) => pet.treatScanIds.includes(x.id))
  const allergic = pet.allergies.filter((a) => ALLERGIES.includes(a))
  const cat = pet.species === 'cat'
  const allowance = treatAllowance(pet)

  return (
    <Screen scroll>
      <View style={s.nav}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back" style={({ pressed }) => pressed && { opacity: 0.5 }}><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
        <Pressable hitSlop={12} onPress={() => setDraft(pet)} accessibilityLabel={`Edit ${pet.name}`} style={({ pressed }) => pressed && { opacity: 0.5 }}><PencilSimple size={24} weight="bold" color={color.ink} /></Pressable>
      </View>
      <View style={s.header}>
        <View style={s.avatar}><PetHead pet={pet} size={66} /></View>
        <View style={{ flex: 1 }}>
          <Text style={type.h1} numberOfLines={1}>{pet.name}</Text>
          <Text style={type.caption}>{petLine(pet).filter(Boolean).join(' · ')}</Text>
          {allergic.length ? <Text style={[type.caption, { color: color.bad }]}>Allergic to {allergic.join(', ').toLowerCase()}</Text> : null}
        </View>
      </View>

      <Text style={[sectionTitle, { marginTop: 24 }]}>Main food</Text>
      {main ? (
        <Pressable onPress={() => router.push(`/result/${main.id}`)} style={({ pressed }) => pressed && { transform: [{ scale: 0.985 }] }}>
          <Card style={s.main}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.caption} numberOfLines={1}>{main.label.brand ?? `${pet.name}'s bowl`}</Text>
              <Text style={type.h2} numberOfLines={2}>{main.label.productName || 'Current food'}</Text>
              <Text style={type.caption}>Scanned {ago(main.createdAt).toLowerCase()}</Text>
            </View>
            <ScoreRing score={main.result.score} size={92} stroke={9} animate={false} />
          </Card>
        </Pressable>
      ) : (
        <EmptyState compact pose={cat ? 'kitten-peeking' : 'puppy-sniffing'} title={`No main food for ${pet.name} yet`} body="Scan the food that fills the bowl most days, then set it as the main food." action={<PillButton label="Scan a food" onPress={() => router.push('/scan')} />} />
      )}

      {main ? <View style={{ marginTop: 12, marginBottom: -12 }}><FeedingCard pet={pet} label={main.label} onEdit={() => setDraft(pet)} onAddCalories={() => setFood(main.label)} /><BagCard pet={pet} scan={main} onEditPet={() => setDraft(pet)} onEditFood={() => setFood(main.label)} /></View> : null}

      <SwitchPlanCard pet={pet} />

      <View style={s.sectionRow}>
        <Text style={[type.h2, { flex: 1 }]}>Treats</Text>
        {allowance ? <Text style={type.caption}>{allowance}</Text> : null}
      </View>
      {treats.length ? (
        <Card style={s.list}>{treats.map((x, i) => <ScanRow key={x.id} scan={x} last={i === treats.length - 1} />)}</Card>
      ) : (
        <EmptyState compact pose={mascotFor(pet.species, 'happy')} title="The treat jar is empty" body="Scan a treat and tap Save as a treat to keep it here." />
      )}

      <Text style={sectionTitle}>Scan history</Text>
      {scans.length ? (
        <Card style={s.list}>{scans.map((x, i) => <ScanRow key={x.id} scan={x} last={i === scans.length - 1} />)}</Card>
      ) : (
        <EmptyState compact pose="pair-sleeping" title="No scans yet" body={`Every food you scan for ${pet.name} lands here.`} />
      )}

      <PetEditor draft={draft} setDraft={setDraft} onRemoved={() => router.back()} />
      {main ? <FoodEditor scan={main} pet={pet} draft={food} setDraft={setFood} /> : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  main: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: radius.sheet },
  list: { paddingVertical: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 32, marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.chip },
  stepOn: { backgroundColor: color.yellowSoft },
  stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
})
