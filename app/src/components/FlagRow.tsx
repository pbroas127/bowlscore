import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CaretRight } from 'phosphor-react-native'
import type { Flag, Severity } from '@/lib/types'
import { color, type } from '@/theme'

export const severityColor: Record<Severity, string> = { critical: color.bad, warning: color.poor, caution: '#F2B01E', info: color.ink3, good: color.green }

export function FlagRow({ flag, onPress, last }: { flag: Flag; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.row, !last && s.divider, pressed && { opacity: 0.6 }]}>
      <View style={[s.dot, { backgroundColor: severityColor[flag.severity] }]} />
      <View style={{ flex: 1 }}>
        <Text style={type.title}>{flag.title}</Text>
        <Text style={type.caption} numberOfLines={onPress ? 1 : 3}>{flag.ingredient ?? flag.detail}</Text>
      </View>
      {onPress ? <CaretRight size={18} weight="bold" color={color.ink3} /> : null}
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  dot: { width: 12, height: 12, borderRadius: 6 },
})
