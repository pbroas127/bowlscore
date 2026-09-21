// The add or edit sheet for a pet. Used by the Pets tab and by the pencil on a pet's page.
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X } from 'phosphor-react-native'
import { Chip, PillButton, TextLink } from '@/components/ui'
import { newId, setState, useStore } from '@/lib/store'
import { cancelPlan } from '@/lib/switchPlan'
import type { Pet } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

export const ALLERGIES = ['Chicken', 'Beef', 'Dairy', 'Grain', 'Fish', 'Egg']
export const STAGES = [['growth', 'Growing'], ['adult', 'Adult'], ['senior', 'Senior']] as const
export const blankPet = (): Pet => ({ id: newId(), name: '', species: 'dog', stage: 'adult', concerns: [], allergies: [], treatScanIds: [] })
export const petLine = (p: Pet) => [p.species === 'cat' ? 'Cat' : 'Dog', p.stage === 'growth' ? (p.species === 'cat' ? 'Kitten' : 'Puppy') : STAGES.find(([k]) => k === p.stage)?.[1]]

export function PetEditor({ draft, setDraft, onRemoved }: { draft?: Pet; setDraft: (p?: Pet) => void; onRemoved?: () => void }) {
  const pets = useStore((s) => s.pets)
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
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await cancelPlan(draft) // a removed pet must not keep sending switch plan reminders
        setState((s) => { const left = s.pets.filter((p) => p.id !== draft.id); return { pets: left, scans: s.scans.filter((x) => x.petId !== draft.id), activePetId: s.activePetId === draft.id ? left[0]?.id : s.activePetId } })
        setDraft(undefined)
        onRemoved?.()
      } },
    ])
  }

  return (
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
  )
}

const s = StyleSheet.create({
  sheetNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingTop: 16 },
  input: { ...type.title, height: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
