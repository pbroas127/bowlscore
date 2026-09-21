import { Redirect, Tabs, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, PawPrint, Scan, type Icon } from 'phosphor-react-native'
import { tap } from '@/lib/haptics'
import { usePro } from '@/lib/purchases'
import { color, font, shadow } from '@/theme'

function Tab({ label, Icon, on, onPress }: { label: string; Icon: Icon; on: boolean; onPress: () => void }) {
  const tone = on ? color.ink : color.ink3
  return (
    <Pressable style={s.slot} onPress={() => { tap('select'); onPress() }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
      <Icon size={26} weight={on ? 'fill' : 'bold'} color={tone} />
      <Text style={[s.label, { color: tone }]}>{label}</Text>
    </Pressable>
  )
}

export default function TabsLayout() {
  const pro = usePro()
  const insets = useSafeAreaInsets()
  if (!pro) return <Redirect href="/paywall" />
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
      tabBar={({ state, navigation }) => {
        const current = state.routes[state.index]?.name
        return (
          <View style={[s.bar, shadow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Tab label="Home" Icon={House} on={current === 'index'} onPress={() => navigation.navigate('index')} />
            <View style={s.slot}>
              <Pressable onPress={() => { tap('medium'); router.push('/scan') }} style={({ pressed }) => [s.scan, shadow, pressed && { transform: [{ scale: 0.94 }] }]} accessibilityLabel="Scan a food">
                <Scan size={30} weight="bold" color={color.ink} />
              </Pressable>
            </View>
            <Tab label="Pets" Icon={PawPrint} on={current === 'pets'} onPress={() => navigation.navigate('pets')} />
          </View>
        )
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="pets" />
    </Tabs>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.hairline, paddingTop: 8 },
  slot: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontFamily: font.textMedium, fontSize: 12, lineHeight: 16 },
  scan: { width: 68, height: 68, borderRadius: 34, backgroundColor: color.yellow, borderWidth: 5, borderColor: color.surface, alignItems: 'center', justifyContent: 'center', marginTop: -34 },
})
