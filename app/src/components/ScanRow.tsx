import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ScoreRing } from '@/components/ScoreRing'
import type { Scan } from '@/lib/types'
import { color, gradeColor, type } from '@/theme'

export const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86400000)
  return d < 1 ? 'Today' : d === 1 ? 'Yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.floor(d / 7)} weeks ago` : `${Math.floor(d / 30)} months ago`
}

export function ScanRow({ scan, last, onPress }: { scan: Scan; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress ?? (() => router.push(`/result/${scan.id}`))} style={({ pressed }) => [s.row, !last && s.divider, pressed && { opacity: 0.6 }]}>
      <ScoreRing score={scan.result.score} size={48} stroke={5} animate={false} />
      <View style={{ flex: 1 }}>
        <Text style={type.title} numberOfLines={1}>{scan.label.productName || 'Scanned food'}</Text>
        <Text style={type.caption} numberOfLines={1}>{[scan.label.brand, ago(scan.createdAt)].filter(Boolean).join(' · ')}</Text>
      </View>
      <Text style={[type.label, { color: gradeColor(scan.result.score) }]}>{scan.result.grade}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
})
