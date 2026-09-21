// The share image: a 1080 by 1350 branded score card. It is laid out at one third size and captured at 3x.
import { Image } from 'expo-image'
import * as Sharing from 'expo-sharing'
import type { RefObject } from 'react'
import { Platform, Share, StyleSheet, Text, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { severityColor } from '@/components/FlagRow'
import { ScoreRing } from '@/components/ScoreRing'
import { watchOuts } from '@/lib/recommend'
import type { LabelData, ScoreResult } from '@/lib/types'
import { color, font, radius, type } from '@/theme'

const W = 360
const H = 450

export function ShareCard({ cardRef, label, result }: { cardRef: RefObject<View | null>; label: LabelData; result: ScoreResult }) {
  const watch = watchOuts(result)
  const points = (watch.length ? watch : result.flags.filter((f) => f.severity === 'good')).slice(0, 2)
  return (
    <View ref={cardRef} collapsable={false} style={s.card}>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { fontFamily: font.textBold }]} numberOfLines={1}>{label.brand ?? 'Pet food'}</Text>
          <Text style={type.h2} numberOfLines={2}>{label.productName || 'Scanned food'}</Text>
        </View>
        <Image source={require('../../assets/mascots/pair-happy.png')} style={{ width: 72, height: 72 }} contentFit="contain" />
      </View>
      <View style={s.ring}>
        <View style={s.glow} />
        <ScoreRing score={result.score} size={176} stroke={16} animate={false} />
      </View>
      <View style={s.points}>
        {points.map((f) => (
          <View key={f.title} style={s.point}>
            <View style={[s.dot, { backgroundColor: severityColor[f.severity] }]} />
            <Text style={[type.label, { flex: 1 }]} numberOfLines={1}>{f.title}</Text>
          </View>
        ))}
      </View>
      <View style={s.foot}>
        <Text style={[type.label, { fontFamily: font.heading }]}>Scored with BowlScore</Text>
        <Text style={type.caption}>bowlscoreapp.vercel.app</Text>
      </View>
    </View>
  )
}

// Captures the card and opens the share sheet. Anything that goes wrong (web, no native module, capture error) falls back to text.
export async function shareScoreCard(card: RefObject<View | null>, message: string) {
  try {
    if (Platform.OS === 'web' || !card.current || !(await Sharing.isAvailableAsync())) throw new Error('no image share here')
    const uri = await captureRef(card, { format: 'png', quality: 1, width: W * 3, height: H * 3, result: 'tmpfile' })
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share this score' })
  } catch {
    Share.share({ message }).catch(() => {})
  }
}

const s = StyleSheet.create({
  card: { width: W, height: H, backgroundColor: color.bg, padding: 20, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 236, height: 236, borderRadius: 118, backgroundColor: color.yellowSoft, opacity: 0.6 },
  points: { gap: 8 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.surface, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, paddingHorizontal: 12, height: 40 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
