import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, CaretDown } from 'phosphor-react-native'
import { Card, PillButton, Screen } from '@/components/ui'
import { SUPPORT_EMAIL } from '@/lib/links'
import { color, type } from '@/theme'

const FAQ: [string, string][] = [
  ['How is the score made?', 'One public rubric for every food: ingredients 50 points, nutrition 30, additives 20. Dogs and cats have separate rules.'],
  ['Do brands pay for scores?', 'No. We may earn a commission on some shop links. It never changes a score or the order of picks.'],
  ['Is this vet advice?', 'No. BowlScore reads the label. Ask your vet about health conditions and prescription diets.'],
  ['A barcode was not found', 'Snap the ingredient list instead. You still get a score, and the food is added to our catalog.'],
  ['A score looks wrong', 'Open the scan, tap Edit details and fix the text. Or email us a photo of the label.'],
  ['How do I cancel?', 'iPhone Settings, your name, Subscriptions, BowlScore, Cancel. Do it 24 hours before renewal.'],
  ['New phone or reinstall?', 'Tap Restore on the paywall, or Restore purchases in Settings. Sign in to bring your pets back.'],
  ['What happens to my photos?', 'They are read and then discarded. We keep only the text and the score.'],
]

export default function Faq() {
  const [open, setOpen] = useState<number>()
  return (
    <Screen scroll>
      <View style={s.nav}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back"><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
        <Text style={type.h2}>Help</Text>
        <View style={{ width: 24 }} />
      </View>
      <Card style={{ paddingVertical: 0 }}>
        {FAQ.map(([q, a], i) => (
          <Pressable key={q} onPress={() => setOpen(open === i ? undefined : i)} style={[s.item, i < FAQ.length - 1 && s.divider]} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
            <View style={s.q}>
              <Text style={[type.body, { flex: 1 }]}>{q}</Text>
              <CaretDown size={16} weight="bold" color={color.ink3} style={open === i && { transform: [{ rotate: '180deg' }] }} />
            </View>
            {open === i ? <Text style={[type.caption, { color: color.ink2, marginTop: 6 }]}>{a}</Text> : null}
          </Pressable>
        ))}
      </Card>
      <View style={{ gap: 8, marginTop: 24, alignItems: 'center' }}>
        <Text style={type.caption}>Still stuck? A real person replies.</Text>
        <View style={{ alignSelf: 'stretch' }}><PillButton label="Email us" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=BowlScore%20help`)} /></View>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 16 },
  item: { paddingVertical: 16 },
  q: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
})
