import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CaretRight, Check } from 'phosphor-react-native'
import { Mascot, type Pose } from '@/components/Mascot'
import { color, gutter, radius, spring, type } from '@/theme'
import { tap } from '@/lib/haptics'

export function Screen({ children, scroll, footer, style, edges = ['top', 'bottom'] }: { children: ReactNode; scroll?: boolean; footer?: ReactNode; style?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom')[] }) {
  const Body = scroll ? ScrollView : View
  return (
    <SafeAreaView style={s.screen} edges={edges}>
      <Body style={s.flex} {...(scroll ? { contentContainerStyle: [s.pad, { paddingBottom: 32 }, style], showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' as const } : { style: [s.flex, s.pad, style] })}>
        {children}
      </Body>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  )
}

// The signature control: a pill with a solid darker bottom edge that compresses when pressed.
export function PillButton({ label, onPress, disabled, loading, variant = 'primary', icon }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'ink' | 'quiet'; icon?: ReactNode }) {
  const y = useSharedValue(0)
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  const v = { primary: { bg: color.yellow, edge: color.yellowEdge, fg: color.ink }, ink: { bg: color.ink, edge: '#000000', fg: color.bg }, quiet: { bg: color.surface, edge: color.hairline, fg: color.ink } }[variant]
  const off = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={off}
      onPressIn={() => { y.value = withTiming(4, { duration: 60 }) }}
      onPressOut={() => { y.value = withSpring(0, spring) }}
      onPress={() => { tap('light'); onPress() }}
      style={[s.btnEdge, { backgroundColor: v.edge, opacity: off ? 0.45 : 1 }]}>
      <Animated.View style={[s.btnFace, { backgroundColor: v.bg }, variant === 'quiet' && s.btnQuiet, face]}>
        {loading ? <ActivityIndicator color={v.fg} /> : <>{icon}<Text style={[type.title, { color: v.fg }]}>{label}</Text></>}
      </Animated.View>
    </Pressable>
  )
}

export function OptionRow({ label, hint, selected, onPress, left }: { label: string; hint?: string; selected?: boolean; onPress: () => void; left?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => { tap('select'); onPress() }}
      style={({ pressed }) => [s.option, selected && s.optionOn, pressed && { transform: [{ scale: 0.985 }] }]}>
      {left}
      <View style={s.flex}>
        <Text style={type.title}>{label}</Text>
        {hint ? <Text style={type.caption}>{hint}</Text> : null}
      </View>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <Check size={14} weight="bold" color={color.surface} /> : null}</View>
    </Pressable>
  )
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: string }) {
  return (
    <Pressable disabled={!onPress} onPress={() => { tap('select'); onPress?.() }} style={[s.chip, selected && s.chipOn, tone ? { backgroundColor: tone, borderColor: tone } : null]}>
      <Text style={[type.label, selected && { color: color.bg }]}>{label}</Text>
    </Pressable>
  )
}

export function ProgressBar({ value }: { value: number }) {
  const w = useSharedValue(value)
  useEffect(() => { w.value = withSpring(value, spring) }, [value, w])
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }))
  return (
    <View style={s.track}>
      <Animated.View style={[s.trackFill, fill]} />
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>
}

// A full width row that goes somewhere: icon, label, caret.
export function ActionRow({ label, hint, icon, onPress, last }: { label: string; hint?: string; icon?: ReactNode; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap('select'); onPress() }} style={({ pressed }) => [s.action, !last && s.actionDivider, pressed && { opacity: 0.6 }]}>
      {icon}
      <View style={s.flex}>
        <Text style={type.title}>{label}</Text>
        {hint ? <Text style={type.caption}>{hint}</Text> : null}
      </View>
      <CaretRight size={18} weight="bold" color={color.ink3} />
    </Pressable>
  )
}

// Empty means a mascot, one line and at most one button. `compact` sits inside a section of a longer page.
export function EmptyState({ pose, title, body, action, compact }: { pose: Pose; title: string; body?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <Card style={compact ? { gap: 12 } : s.empty}>
      <View style={compact ? s.emptyRow : s.emptyStack}>
        <Mascot pose={pose} size={compact ? 72 : 150} bob={!compact} />
        <View style={compact ? s.flex : s.emptyStack}>
          <Text style={[compact ? type.title : type.h2, !compact && { textAlign: 'center' }]}>{title}</Text>
          {body ? <Text style={[compact ? type.caption : type.body, { color: color.ink2 }, !compact && { textAlign: 'center' }]}>{body}</Text> : null}
        </View>
      </View>
      {action ? <View style={{ alignSelf: 'stretch' }}>{action}</View> : null}
    </Card>
  )
}

export function TextLink({ label, onPress, tone = color.ink2 }: { label: string; onPress: () => void; tone?: string }) {
  return (
    <Pressable hitSlop={12} onPress={onPress}>
      <Text style={[type.label, { color: tone, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.bg },
  pad: { paddingHorizontal: gutter },
  footer: { paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8, gap: 12 },
  btnEdge: { borderRadius: radius.pill, paddingBottom: 4 },
  btnFace: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 0 },
  btnQuiet: { borderWidth: 1, borderColor: color.hairline },
  option: { minHeight: 64, borderRadius: radius.card, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.hairline, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionOn: { borderColor: color.ink, backgroundColor: color.yellowSoft },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.hairline, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  radioOn: { backgroundColor: color.ink, borderColor: color.ink },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  track: { height: 4, borderRadius: 2, backgroundColor: color.hairline, overflow: 'hidden', flex: 1 },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: color.green },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10 },
  actionDivider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  empty: { alignItems: 'center', gap: 12, padding: 24, borderRadius: radius.sheet },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyStack: { alignItems: 'center', gap: 8 },
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.hairline, padding: 16 },
})
