// The edit sheet for a scanned food: name, brand, food or treat, life stage, calories. Ingredients stay as read,
// so a score can never be typed into being. Only food against treat changes the score, and that is a free rescore.
import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X } from 'phosphor-react-native'
import { Chip, PillButton } from '@/components/ui'
import { rescoreLabel } from '@/lib/api'
import { stageFor } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { updateScan } from '@/lib/store'
import type { LabelData, Pet, Scan } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

const CLAIMS = [['all', 'All life stages'], ['growth', 'Puppy or kitten'], ['adult', 'Adult'], ['unknown', 'Not sure']] as const
const LARGE = [['included', 'Included'], ['excluded', 'Not included'], ['unknown', 'Not sure']] as const
const num = (t: string) => { const n = parseFloat(t.replace(',', '.')); return n > 0 ? n : undefined }

export function FoodEditor({ scan, pet, draft, setDraft }: { scan: Scan; pet?: Pet; draft?: LabelData; setDraft: (l?: LabelData) => void }) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState<string>()
  const cal = draft?.calories ?? {}
  const unitDefault = draft?.isTreat ? 'treat' : draft?.foodForm === 'wet' ? 'can' : 'serving'
  const setCal = (patch: LabelData['calories']) => draft && setDraft({ ...draft, calories: { ...cal, ...patch } })

  const save = async () => {
    if (!draft) return
    const calories = cal.kcalPerCup || cal.kcalPerKg || cal.kcalPerUnit ? { ...cal, unit: cal.unit?.trim() || unitDefault } : undefined
    const label: LabelData = { ...draft, productName: draft.productName?.trim() || undefined, brand: draft.brand?.trim() || undefined, calories }
    let result = scan.result
    if (Boolean(label.isTreat) !== Boolean(scan.label.isTreat) && pet) {
      setSaving(true)
      setFailed(undefined)
      try {
        result = (await rescoreLabel({ species: pet.species, lifeStage: stageFor(pet), label })).result
      } catch {
        tap('warning')
        setFailed('We could not score it that way just now. Check your connection and try again.')
        setSaving(false)
        return
      }
      setSaving(false)
    }
    updateScan(scan.id, (x) => ({ ...x, label, result }))
    setDraft(undefined)
  }

  return (
    <Modal visible={Boolean(draft)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(undefined)}>
      {draft ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={s.sheetNav}>
              <Text style={type.h2}>Edit details</Text>
              <Pressable hitSlop={12} onPress={() => setDraft(undefined)} accessibilityLabel="Close"><X size={24} weight="bold" color={color.ink} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: gutter, gap: 24 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Name</Text>
                <TextInput value={draft.productName ?? ''} onChangeText={(productName) => setDraft({ ...draft, productName })} placeholder="Name" placeholderTextColor={color.ink3} maxLength={80} autoCapitalize="words" style={s.input} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Brand</Text>
                <TextInput value={draft.brand ?? ''} onChangeText={(brand) => setDraft({ ...draft, brand })} placeholder="Brand" placeholderTextColor={color.ink3} maxLength={40} autoCapitalize="words" style={s.input} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Food or treat</Text>
                <View style={s.chips}>{([['food', 'Food'], ['treat', 'Treat']] as const).map(([k, l]) => <Chip key={k} label={l} selected={Boolean(draft.isTreat) === (k === 'treat')} onPress={() => setDraft({ ...draft, isTreat: k === 'treat' })} />)}</View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Made for</Text>
                <View style={s.chips}>{CLAIMS.map(([k, l]) => <Chip key={k} label={l} selected={(draft.lifeStageClaim ?? 'unknown') === k} onPress={() => setDraft({ ...draft, lifeStageClaim: k })} />)}</View>
              </View>
              {pet?.species === 'dog' ? (
                <View style={{ gap: 8 }}>
                  <Text style={type.label}>Large breed puppies</Text>
                  <View style={s.chips}>{LARGE.map(([k, l]) => <Chip key={k} label={l} selected={(draft.largeSizeGrowth ?? 'unknown') === k} onPress={() => setDraft({ ...draft, largeSizeGrowth: k })} />)}</View>
                </View>
              ) : null}
              <View style={{ gap: 8 }}>
                <Text style={type.label}>Calories</Text>
                {/* Uncontrolled, so a half typed "3." is not rewritten under the person's thumb. */}
                <View style={s.unit}><TextInput defaultValue={cal.kcalPerCup ? String(cal.kcalPerCup) : ''} onChangeText={(t) => setCal({ kcalPerCup: num(t) })} placeholder="0" placeholderTextColor={color.ink3} keyboardType="decimal-pad" maxLength={6} style={s.unitInput} accessibilityLabel="Calories per cup" /><Text style={s.unitWord}>per cup</Text></View>
                <View style={s.unit}><TextInput defaultValue={cal.kcalPerKg ? String(cal.kcalPerKg) : ''} onChangeText={(t) => setCal({ kcalPerKg: num(t) })} placeholder="0" placeholderTextColor={color.ink3} keyboardType="decimal-pad" maxLength={6} style={s.unitInput} accessibilityLabel="Calories per kilogram" /><Text style={s.unitWord}>per kg</Text></View>
                <View style={s.unit}>
                  <TextInput defaultValue={cal.kcalPerUnit ? String(cal.kcalPerUnit) : ''} onChangeText={(t) => setCal({ kcalPerUnit: num(t) })} placeholder="0" placeholderTextColor={color.ink3} keyboardType="decimal-pad" maxLength={6} style={s.unitInput} accessibilityLabel="Calories per can or treat" />
                  <Text style={s.unitWord}>per</Text>
                  <TextInput value={cal.unit ?? ''} onChangeText={(unit) => setCal({ unit })} placeholder={unitDefault} placeholderTextColor={color.ink3} maxLength={12} autoCapitalize="none" style={[s.unitWord, s.unitName]} accessibilityLabel="Unit" />
                </View>
              </View>
              <Text style={type.caption}>Ingredients come from the label and cannot be edited.</Text>
              {failed ? <Text style={[type.label, { color: color.bad }]}>{failed}</Text> : null}
            </ScrollView>
            <View style={{ padding: gutter }}><PillButton label="Save" onPress={save} loading={saving} /></View>
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
  unit: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  unitInput: { ...type.title, flex: 1, height: 56 },
  unitWord: { ...type.label, color: color.ink2 },
  unitName: { width: 80, height: 56, color: color.ink },
})
