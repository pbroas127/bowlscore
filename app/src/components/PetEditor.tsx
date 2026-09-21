// The add or edit sheet for a pet. Used by the Pets tab and by the pencil on a pet's page.
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X } from 'phosphor-react-native'
import { Chip, PillButton, TextLink } from '@/components/ui'
import { breedsFor, findBreed } from '@/lib/breeds'
import { ageMonths, bornAtFor, stageFor } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { newId, setState, useStore } from '@/lib/store'
import { cancelPlan } from '@/lib/switchPlan'
import type { Pet, Species } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

export const ALLERGIES = ['Chicken', 'Beef', 'Dairy', 'Grain', 'Fish', 'Egg']
export const STAGES = [['growth', 'Growing'], ['adult', 'Adult'], ['senior', 'Senior']] as const
export const blankPet = (): Pet => ({ id: newId(), name: '', species: 'dog', stage: 'adult', concerns: [], allergies: [], treatScanIds: [] })
export const stageWord = (p: Pet) => (stageFor(p) === 'growth' ? (p.species === 'cat' ? 'Kitten' : 'Puppy') : STAGES.find(([k]) => k === stageFor(p))![1])
export const petLine = (p: Pet) => [p.breed?.trim() || (p.species === 'cat' ? 'Cat' : 'Dog'), stageWord(p)]

// Shared with the onboarding steps, which ask the same three things.
export const digits = (t: string) => parseInt(t.replace(/\D/g, ''), 10) || 0
export const pounds = (t: string) => { const n = parseFloat(t.replace(',', '.')); return n > 0 && n < 400 ? Math.round(n * 10) / 10 : undefined }

// Type to filter the breed table. Whatever was typed is kept when nothing is picked, so an unlisted breed still saves.
// `open` shows the list before anything is typed, for a screen that is only about the breed.
export function BreedField({ species, value, onChange, onPick, open, max = 5, style, autoFocus }: { species: Species; value: string; onChange: (breed: string) => void; onPick?: (breed: string) => void; open?: boolean; max?: number; style: StyleProp<TextStyle>; autoFocus?: boolean }) {
  const q = value.trim().toLowerCase()
  const matches = (q || open) && !findBreed(species, q) ? breedsFor(species).filter((b) => b.name.toLowerCase().includes(q)).slice(0, max) : []
  return (
    <>
      <TextInput value={value} onChangeText={onChange} placeholder={open ? 'Breed' : 'Start typing, or Mixed breed'} placeholderTextColor={color.ink3} maxLength={40} autoCapitalize="words" autoCorrect={false} autoFocus={autoFocus} returnKeyType="done" style={style} />
      {matches.length ? (
        <View style={s.matches}>
          {matches.map((b, i) => (
            <Pressable key={b.name} onPress={() => { tap('select'); onChange(b.name); onPick?.(b.name) }} style={({ pressed }) => [s.match, i > 0 && s.matchDivider, pressed && { opacity: 0.6 }]}>
              <Text style={type.label}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  )
}

export function PetEditor({ draft, setDraft, onRemoved }: { draft?: Pet; setDraft: (p?: Pet) => void; onRemoved?: () => void }) {
  const pets = useStore((s) => s.pets)
  const isNew = draft && !pets.some((p) => p.id === draft.id)
  const months = draft && ageMonths(draft)
  const setAge = (years: number, extra: number) => { const total = Math.min(360, years * 12 + extra); if (draft) setDraft({ ...draft, bornAt: total ? bornAtFor(total) : undefined }) }

  const save = () => {
    if (!draft?.name.trim()) return
    const pet = { ...draft, name: draft.name.trim(), breed: draft.breed?.trim() || undefined }
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
                <Text style={type.label}>Breed</Text>
                <BreedField species={draft.species} value={draft.breed ?? ''} onChange={(breed) => setDraft({ ...draft, breed })} style={s.input} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Age</Text>
                <View style={s.pair}>
                  <View style={s.unit}><TextInput value={months ? String(Math.floor(months / 12) || '') : ''} onChangeText={(t) => setAge(digits(t), (months ?? 0) % 12)} placeholder="0" placeholderTextColor={color.ink3} keyboardType="number-pad" maxLength={2} style={s.unitInput} accessibilityLabel="Years" /><Text style={s.unitWord}>years</Text></View>
                  <View style={s.unit}><TextInput value={months ? String(months % 12 || '') : ''} onChangeText={(t) => setAge(Math.floor((months ?? 0) / 12), digits(t))} placeholder="0" placeholderTextColor={color.ink3} keyboardType="number-pad" maxLength={2} style={s.unitInput} accessibilityLabel="Months" /><Text style={s.unitWord}>months</Text></View>
                </View>
                {months ? <Text style={type.caption}>That makes {draft.name.trim() || 'your pet'} {stageFor(draft) === 'adult' ? 'an adult' : `a ${stageWord(draft).toLowerCase()}`}.</Text> : null}
              </View>
              {/* Age decides the life stage when we have it. The chips are the fallback for a pet whose age is a mystery. */}
              {months ? null : (
                <View style={{ gap: 8 }}>
                  <Text style={type.label}>Life stage</Text>
                  <View style={s.chips}>{STAGES.map(([k, l]) => <Chip key={k} label={k === 'growth' ? (draft.species === 'cat' ? 'Kitten' : 'Puppy') : l} selected={draft.stage === k} onPress={() => setDraft({ ...draft, stage: k })} />)}</View>
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Weight</Text>
                {/* Uncontrolled, so a half typed "8." is not rewritten to "8" under the person's thumb. */}
                <View style={s.unit}><TextInput defaultValue={draft.weightLb ? String(draft.weightLb) : ''} onChangeText={(t) => setDraft({ ...draft, weightLb: pounds(t) })} placeholder="0" placeholderTextColor={color.ink3} keyboardType="decimal-pad" maxLength={5} style={s.unitInput} accessibilityLabel="Weight in pounds" /><Text style={s.unitWord}>lb</Text></View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Meals per day</Text>
                <View style={s.chips}>{[1, 2, 3, 4].map((n) => <Chip key={n} label={String(n)} selected={(draft.meals ?? 2) === n} onPress={() => setDraft({ ...draft, meals: n })} />)}</View>
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
  pair: { flexDirection: 'row', gap: 12 },
  unit: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  unitInput: { ...type.title, flex: 1, height: 56 },
  unitWord: { ...type.label, color: color.ink2 },
  matches: { borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  match: { minHeight: 44, justifyContent: 'center' },
  matchDivider: { borderTopWidth: 1, borderTopColor: color.hairline },
})
