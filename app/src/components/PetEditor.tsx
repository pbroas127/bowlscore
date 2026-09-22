// The add or edit sheet for a pet. Used by the Pets tab and by the pencil on a pet's page.
import DateTimePicker from '@react-native-community/datetimepicker'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CalendarBlank, X } from 'phosphor-react-native'
import { headKeyFor, headKeysFor, headSource, lookOptions, petHeadKey } from '@/components/PetHead'
import { Chip, PillButton, TextLink } from '@/components/ui'
import { breedsFor, findBreed } from '@/lib/breeds'
import { ageMonths, ageText, stageFor } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { PROTEINS } from '@/lib/recommend'
import { newId, setState, useStore } from '@/lib/store'
import { scheduleWeighIn, stopBag } from '@/lib/bag'
import { cancelNotifications } from '@/lib/notify'
import { cancelPlan } from '@/lib/switchPlan'
import type { Pet, Species } from '@/lib/types'
import { color, font, gutter, radius, type } from '@/theme'

export const ALLERGIES = ['Chicken', 'Beef', 'Dairy', 'Grain', 'Fish', 'Egg']
export const STAGES = [['growth', 'Growing'], ['adult', 'Adult'], ['senior', 'Senior']] as const
export const blankPet = (): Pet => ({ id: newId(), name: '', species: 'dog', stage: 'adult', concerns: [], allergies: [], treatScanIds: [] })
export const stageWord = (p: Pet) => (stageFor(p) === 'growth' ? (p.species === 'cat' ? 'Kitten' : 'Puppy') : STAGES.find(([k]) => k === stageFor(p))![1])
export const petLine = (p: Pet) => [p.breed?.trim() || (p.species === 'cat' ? 'Cat' : 'Dog'), stageWord(p)]

// Shared with the onboarding step, which asks the same thing.
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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dateText = (ms: number, monthOnly: boolean) => { const d = new Date(ms); return monthOnly ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` }

// The birthday, read back as an age and life stage. `pet` carries the species and breed that decide the stage.
// "Not sure of the exact day" swaps the wheel for month and year chips and stores the 15th of that month.
export function BirthdayField({ pet, onChange, big }: { pet: Pet; onChange: (bornAt?: number) => void; big?: boolean }) {
  const [open, setOpen] = useState(false)
  const [monthOnly, setMonthOnly] = useState(false)
  const now = new Date()
  const min = new Date(now.getFullYear() - 30, now.getMonth(), 1)
  const d = pet.bornAt ? new Date(pet.bornAt) : undefined
  const pick = (date: Date) => onChange(Math.min(now.getTime(), monthOnly ? new Date(date.getFullYear(), date.getMonth(), 15).getTime() : date.getTime()))
  const toggle = () => { tap('select'); setOpen((o) => !o); if (!pet.bornAt) pick(new Date(now.getFullYear() - 2, now.getMonth(), monthOnly ? 15 : now.getDate())) }
  const months = ageMonths(pet)
  const [text, setText] = useState('')
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Birthday" style={[s.unit, big && s.unitBig]}>
        <Text style={[big ? type.h2 : type.title, { flex: 1 }, !d && { color: color.ink3 }]}>{d ? dateText(d.getTime(), monthOnly) : 'Add birthday'}</Text>
        <CalendarBlank size={22} weight="bold" color={color.ink2} />
      </Pressable>
      {months != null ? <Text style={[big ? type.body : type.caption, { color: color.ink2 }]}>{`${ageText(months)} old, ${stageWord(pet).toLowerCase()}`}</Text> : null}
      {open ? (
        Platform.OS === 'web' ? (
          <TextInput value={text} onChangeText={(t) => { setText(t); const m = /^(\d{4})\D(\d{1,2})\D(\d{1,2})$/.exec(t.trim()); if (m) pick(new Date(+m[1], +m[2] - 1, +m[3])) }} placeholder="Year, month, day: 2024/03/15" placeholderTextColor={color.ink3} style={s.input} />
        ) : monthOnly ? (
          <View style={{ gap: 8 }}>
            <View style={s.chips}>{MONTHS.map((m, i) => <Chip key={m} label={m.slice(0, 3)} selected={d?.getMonth() === i} onPress={() => pick(new Date(d?.getFullYear() ?? now.getFullYear(), i, 15))} />)}</View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {Array.from({ length: 31 }, (_, i) => now.getFullYear() - i).map((y) => <Chip key={y} label={String(y)} selected={d?.getFullYear() === y} onPress={() => pick(new Date(y, d?.getMonth() ?? 0, 15))} />)}
            </ScrollView>
          </View>
        ) : (
          <DateTimePicker value={d ?? now} mode="date" display="spinner" maximumDate={now} minimumDate={min} onChange={(_e, date) => date && pick(date)} style={{ alignSelf: 'center' }} />
        )
      ) : null}
      {open && Platform.OS !== 'web' ? <TextLink label={monthOnly ? 'I know the exact day' : 'Not sure of the exact day'} onPress={() => { setMonthOnly((m) => !m); if (d) onChange(Math.min(now.getTime(), new Date(d.getFullYear(), d.getMonth(), 15).getTime())) }} /> : null}
    </View>
  )
}

// Every head for the species, for a pet the short Look row does not match. The breed's own head clears `look`.
function LookSheet({ pet, visible, onPick, onClose }: { pet: Pet; visible: boolean; onPick: (look?: string) => void; onClose: () => void }) {
  const breedKey = headKeyFor(pet.species, pet.breed)
  const current = petHeadKey(pet)
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <View style={s.sheetNav}>
          <Text style={type.h2}>Pick a look</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} weight="bold" color={color.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: gutter, gap: 16 }}>
          <Pressable onPress={() => { tap('select'); onPick(undefined) }} style={[s.breedPic, !pet.look && s.lookOn]} accessibilityRole="button" accessibilityState={{ selected: !pet.look }}>
            <Image source={headSource(pet.species, breedKey)} style={{ width: 44, height: 44 }} contentFit="contain" />
            <Text style={[type.title, { flex: 1 }]}>Use breed picture</Text>
          </Pressable>
          <View style={s.grid}>
            {headKeysFor(pet.species).map((key) => {
              const on = current === key
              return (
                <Pressable key={key} onPress={() => { tap('select'); onPick(key === breedKey ? undefined : key) }} style={[s.look, on && s.lookOn]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={key.replace(/-/g, ' ')}>
                  <Image source={headSource(pet.species, key)} style={{ width: 52, height: 52 }} contentFit="contain" />
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

export function PetEditor({ draft, setDraft, onRemoved }: { draft?: Pet; setDraft: (p?: Pet) => void; onRemoved?: () => void }) {
  const pets = useStore((s) => s.pets)
  const [allLooks, setAllLooks] = useState(false)
  const isNew = draft && !pets.some((p) => p.id === draft.id)
  const months = draft && ageMonths(draft)

  const save = () => {
    if (!draft?.name.trim()) return
    const before = pets.find((p) => p.id === draft.id)
    const weighed = draft.weightLb !== before?.weightLb
    const pet = { ...draft, name: draft.name.trim(), breed: draft.breed?.trim() || undefined, weighedAt: weighed ? Date.now() : draft.weighedAt }
    setState((s) => ({ pets: isNew ? [...s.pets, pet] : s.pets.map((p) => (p.id === pet.id ? pet : p)), activePetId: isNew ? pet.id : s.activePetId }))
    setDraft(undefined)
    if (weighed || pet.bornAt !== before?.bornAt) scheduleWeighIn(pet) // the monthly nudge follows the latest weight and age
  }
  const remove = () => {
    if (!draft) return
    Alert.alert(`Remove ${draft.name}?`, 'Their scans will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await cancelPlan(draft) // a removed pet must not keep sending switch plan reminders
        await stopBag(draft)
        if (draft.weighInId) await cancelNotifications([draft.weighInId])
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
                <BreedField species={draft.species} value={draft.breed ?? ''} onChange={(breed) => setDraft({ ...draft, breed, look: undefined })} style={s.input} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Look</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {/* A look picked from See all joins the row, so the choice stays visible. */}
                  {[...new Set([...lookOptions(draft.species, draft.breed).slice(0, 1), petHeadKey(draft), ...lookOptions(draft.species, draft.breed)])].map((key) => {
                    const on = petHeadKey(draft) === key
                    return (
                      <Pressable key={key} onPress={() => { tap('select'); setDraft({ ...draft, look: key === headKeyFor(draft.species, draft.breed) ? undefined : key }) }} style={[s.look, on && s.lookOn]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={key.replace(/-/g, ' ')}>
                        <Image source={headSource(draft.species, key)} style={{ width: 52, height: 52 }} contentFit="contain" />
                      </Pressable>
                    )
                  })}
                  <Pressable onPress={() => { tap('select'); setAllLooks(true) }} style={s.look} accessibilityRole="button" accessibilityLabel="See all looks">
                    <Text style={[type.caption, { color: color.ink, fontFamily: font.textBold, textAlign: 'center' }]}>See all</Text>
                  </Pressable>
                </ScrollView>
                <LookSheet pet={draft} visible={allLooks} onClose={() => setAllLooks(false)} onPick={(look) => { setDraft({ ...draft, look }); setAllLooks(false) }} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Birthday</Text>
                <BirthdayField pet={draft} onChange={(bornAt) => setDraft({ ...draft, bornAt })} />
              </View>
              {/* Age decides the life stage when we have it. The chips are the fallback for a pet whose age is a mystery. */}
              {months != null ? null : (
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
                <Text style={type.label}>Main protein</Text>
                <View style={s.chips}>{PROTEINS.map((p) => <Chip key={p} label={p} selected={draft.protein === p} onPress={() => setDraft({ ...draft, protein: draft.protein === p ? undefined : p })} />)}</View>
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
  look: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, borderWidth: 2, borderColor: color.hairline },
  lookOn: { borderColor: color.ink, backgroundColor: color.yellowSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  breedPic: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, borderRadius: radius.card, borderWidth: 2, borderColor: color.hairline, backgroundColor: color.surface },
  sheetNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingTop: 16 },
  input: { ...type.title, height: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unit: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  unitBig: { height: 64, borderRadius: radius.card, borderColor: color.ink, paddingHorizontal: 20 },
  unitInput: { ...type.title, flex: 1, height: 56 },
  unitWord: { ...type.label, color: color.ink2 },
  matches: { borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  match: { minHeight: 44, justifyContent: 'center' },
  matchDivider: { borderTopWidth: 1, borderTopColor: color.hairline },
})
