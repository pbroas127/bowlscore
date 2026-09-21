import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PencilSimple, Plus } from 'phosphor-react-native'
import { Mascot, mascotFor } from '@/components/Mascot'
import { ALLERGIES, blankPet, PetEditor, petLine } from '@/components/PetEditor'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, Screen } from '@/components/ui'
import { tap } from '@/lib/haptics'
import { setState, useStore } from '@/lib/store'
import type { Pet } from '@/lib/types'
import { color, radius, type } from '@/theme'

export default function Pets() {
  const pets = useStore((s) => s.pets)
  const activeId = useStore((s) => s.activePetId)
  const scans = useStore((s) => s.scans)
  const [draft, setDraft] = useState<Pet>()

  return (
    <Screen scroll edges={['top']}>
      <Text style={[type.h1, { paddingTop: 12, marginBottom: 20 }]}>Your pets</Text>
      <View style={{ gap: 12 }}>
        {pets.map((p) => {
          const on = p.id === activeId
          const current = scans.find((x) => x.id === p.currentScanId)
          const allergic = p.allergies.filter((a) => ALLERGIES.includes(a))
          return (
            // Opening a pet also makes it the one being scanned for, so the pantry and the scanner never disagree.
            <Pressable key={p.id} onPress={() => { tap('select'); setState({ activePetId: p.id }); router.push(`/pet/${p.id}`) }} style={({ pressed }) => pressed && { transform: [{ scale: 0.985 }] }}>
              <Card style={[s.pet, on && s.petOn]}>
                <View style={s.avatar}><Mascot pose={mascotFor(p.species, 'head')} size={54} bob={false} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.h2}>{p.name}</Text>
                  <Text style={type.caption}>{[...petLine(p), on ? 'Scanning for now' : null].filter(Boolean).join(' · ')}</Text>
                  {allergic.length ? <Text style={[type.caption, { color: color.bad }]}>Allergic to {allergic.join(', ').toLowerCase()}</Text> : null}
                </View>
                {current ? <ScoreRing score={current.result.score} size={48} stroke={5} animate={false} /> : null}
                <Pressable hitSlop={12} onPress={() => setDraft(p)} accessibilityLabel={`Edit ${p.name}`} style={({ pressed }) => pressed && { opacity: 0.5 }}><PencilSimple size={22} weight="bold" color={color.ink2} /></Pressable>
              </Card>
            </Pressable>
          )
        })}
        <Pressable onPress={() => setDraft(blankPet())} style={({ pressed }) => [s.add, pressed && { opacity: 0.6 }]}>
          <Plus size={22} weight="bold" color={color.ink2} /><Text style={[type.title, { color: color.ink2 }]}>Add a pet</Text>
        </Pressable>
      </View>
      <PetEditor draft={draft} setDraft={setDraft} />
    </Screen>
  )
}

const s = StyleSheet.create({
  pet: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  petOn: { borderColor: color.ink, borderWidth: 1.5 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  add: { height: 72, borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.ink3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
})
