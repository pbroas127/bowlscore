import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PencilSimple, Plus, X } from 'phosphor-react-native'
import { Mascot, mascotFor } from '@/components/Mascot'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, Chip, PillButton, Screen, TextLink } from '@/components/ui'
import { newId, setState, useStore } from '@/lib/store'
import type { Pet } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

const ALLERGIES = ['Chicken', 'Beef', 'Dairy', 'Grain', 'Fish', 'Egg']
const STAGES = [['growth', 'Growing'], ['adult', 'Adult'], ['senior', 'Senior']] as const
const blank = (): Pet => ({ id: newId(), name: '', species: 'dog', stage: 'adult', concerns: [], allergies: [] })

export default function Pets() {
  const pets = useStore((s) => s.pets)
  const activeId = useStore((s) => s.activePetId)
  const scans = useStore((s) => s.scans)
  const [draft, setDraft] = useState<Pet>()
  const isNew = draft && !pets.some((p) => p.id === draft.id)

  const save = () => {
    if (!draft?.name.trim()) return
    const pet = { ...draft, name: draft.name.trim() }
    setState((s) => ({ pets: isNew ? [...s.pets, pet] : s.pets.map((p) => (p.id === pet.id ? pet : p)), activePetId: isNew ? pet.id : s.activePetId }))
    setDraft(undefined)
  }
  const remove = () => {
    if (!draft) return
    Alert.alert(`Remove ${draft.name}?`, 'Their scans will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setState((s) => { const left = s.pets.filter((p) => p.id !== draft.id); return { pets: left, scans: s.scans.filter((x) => x.petId !== draft.id), activePetId: s.activePetId === draft.id ? left[0]?.id : s.activePetId } }); setDraft(undefined) } },
    ])
  }

  return (
    <Screen scroll edges={['top']}>
      <Text style={[type.h1, { paddingTop: 12, marginBottom: 20 }]}>Your pets</Text>
      <View style={{ gap: 12 }}>
        {pets.map((p) => {
          const on = p.id === activeId
          const current = scans.find((x) => x.id === p.currentScanId)
          return (
            <Pressable key={p.id} onPress={() => setState({ activePetId: p.id })}>
              <Card style={[s.pet, on && s.petOn]}>
                <View style={s.avatar}><Mascot pose={mascotFor(p.species, 'head')} size={54} bob={false} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.h2}>{p.name}</Text>
                  <Text style={type.caption}>{[p.species === 'cat' ? 'Cat' : 'Dog', STAGES.find(([k]) => k === p.stage)?.[1], on ? 'Scanning for now' : null].filter(Boolean).join(' · ')}</Text>
                  {p.allergies.filter((a) => ALLERGIES.includes(a)).length ? <Text style={[type.caption, { color: color.bad }]}>Allergic to {p.allergies.filter((a) => ALLERGIES.includes(a)).join(', ').toLowerCase()}</Text> : null}
                </View>
                {current ? <ScoreRing score={current.result.score} size={48} stroke={5} animate={false} /> : null}
                <Pressable hitSlop={12} onPress={() => setDraft(p)} accessibilityLabel={`Edit ${p.name}`}><PencilSimple size={22} weight="bold" color={color.ink2} /></Pressable>
              </Card>
            </Pressable>
          )
        })}
        <Pressable onPress={() => setDraft(blank())} style={s.add}>
          <Plus size={22} weight="bold" color={color.ink2} /><Text style={[type.title, { color: color.ink2 }]}>Add a pet</Text>
        </Pressable>
      </View>

      <Modal visible={Boolean(draft)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(undefined)}>
        {draft ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <View style={s.sheetNav}>
                <Text style={type.h2}>{isNew ? 'Add a pet' : `Edit ${draft.name}`}</Text>
                <Pressable hitSlop={12} onPress={() => setDraft(undefined)} accessibilityLabel="Close"><X size={24} weight="bold" color={color.ink} /></Pressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: gutter, gap: 24 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 8 }}>
                  <Text style={type.label}>Name</Text>
                  <TextInput value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Name" placeholderTextColor={color.ink3} maxLength={24} autoCapitalize="words" style={s.input} />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={type.label}>Species</Text>
                  <View style={s.chips}>{(['dog', 'cat'] as const).map((sp) => <Chip key={sp} label={sp === 'dog' ? 'Dog' : 'Cat'} selected={draft.species === sp} onPress={() => setDraft({ ...draft, species: sp })} />)}</View>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={type.label}>Life stage</Text>
                  <View style={s.chips}>{STAGES.map(([k, l]) => <Chip key={k} label={k === 'growth' ? (draft.species === 'cat' ? 'Kitten' : 'Puppy') : l} selected={draft.stage === k} onPress={() => setDraft({ ...draft, stage: k })} />)}</View>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={type.label}>Allergies</Text>
                  <View style={s.chips}>{ALLERGIES.map((a) => <Chip key={a} label={a} selected={draft.allergies.includes(a)} onPress={() => setDraft({ ...draft, allergies: draft.allergies.includes(a) ? draft.allergies.filter((x) => x !== a) : [...draft.allergies, a] })} />)}</View>
                </View>
                {!isNew && pets.length > 1 ? <View style={{ alignItems: 'center' }}><TextLink label={`Remove ${draft.name}`} tone={color.bad} onPress={remove} /></View> : null}
              </ScrollView>
              <View style={{ padding: gutter }}><PillButton label="Save" onPress={save} disabled={!draft.name.trim()} /></View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </Screen>
  )
}

const s = StyleSheet.create({
  pet: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  petOn: { borderColor: color.ink, borderWidth: 1.5 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  add: { height: 72, borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.ink3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheetNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingTop: 16 },
  input: { ...type.title, height: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
