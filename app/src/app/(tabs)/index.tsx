import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GearSix } from 'phosphor-react-native'
import { Mascot, mascotFor } from '@/components/Mascot'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, Chip, PillButton, Screen } from '@/components/ui'
import { activePet, useStore } from '@/lib/store'
import type { Scan } from '@/lib/types'
import { color, gradeColor, gradeFor, type, type Grade } from '@/theme'

export const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86400000)
  return d < 1 ? 'Today' : d === 1 ? 'Yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.floor(d / 7)} weeks ago` : `${Math.floor(d / 30)} months ago`
}

export function ScanRow({ scan, last }: { scan: Scan; last?: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/result/${scan.id}`)} style={({ pressed }) => [s.row, !last && s.divider, pressed && { opacity: 0.6 }]}>
      <ScoreRing score={scan.result.score} size={48} stroke={5} animate={false} />
      <View style={{ flex: 1 }}>
        <Text style={type.title} numberOfLines={1}>{scan.label.productName || 'Scanned food'}</Text>
        <Text style={type.caption} numberOfLines={1}>{[scan.label.brand, ago(scan.createdAt)].filter(Boolean).join(' · ')}</Text>
      </View>
      <Text style={[type.label, { color: gradeColor(scan.result.score) }]}>{scan.result.grade}</Text>
    </Pressable>
  )
}

export default function Home() {
  const pet = useStore(activePet)
  const allScans = useStore((s) => s.scans)
  const [filter, setFilter] = useState<Grade | 'All'>('All')
  const scans = allScans.filter((x) => x.petId === pet?.id)
  const current = scans.find((x) => x.id === pet?.currentScanId)
  const shown = scans.filter((x) => filter === 'All' || gradeFor(x.result.score) === filter)

  return (
    <Screen scroll edges={['top']}>
      <View style={s.header}>
        <Pressable style={s.who} onPress={() => router.push('/(tabs)/pets')}>
          <View style={s.avatar}><Mascot pose={mascotFor(pet?.species, 'head')} size={44} bob={false} /></View>
          <View><Text style={type.caption}>Feeding</Text><Text style={type.h2}>{pet?.name ?? 'Your pet'}</Text></View>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => router.push('/settings')} accessibilityLabel="Settings"><GearSix size={26} weight="bold" color={color.ink} /></Pressable>
      </View>

      {current ? (
        <Pressable onPress={() => router.push(`/result/${current.id}`)}>
          <Card style={s.current}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.label, { color: color.ink2 }]}>{pet?.name}'s bowl</Text>
              <Text style={type.h2} numberOfLines={2}>{current.label.productName || 'Current food'}</Text>
              <Text style={type.caption}>Scanned {ago(current.createdAt).toLowerCase()}</Text>
            </View>
            <ScoreRing score={current.result.score} size={92} stroke={9} animate={false} />
          </Card>
        </Pressable>
      ) : (
        <Card style={s.empty}>
          <Mascot pose={pet?.species === 'cat' ? 'kitten-peeking' : 'puppy-sniffing'} size={150} />
          <Text style={[type.h2, { textAlign: 'center' }]}>What is in {pet?.name ?? 'the'}'s bowl?</Text>
          <Text style={[type.body, { color: color.ink2, textAlign: 'center' }]}>Scan the food you feed most days to see how it scores.</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 4 }}><PillButton label="Scan a food" onPress={() => router.push('/scan')} /></View>
        </Card>
      )}

      {scans.length ? (
        <>
          <Text style={[type.h2, { marginTop: 32, marginBottom: 12 }]}>Recent scans</Text>
          <View style={s.filters}>{(['All', 'Excellent', 'Good', 'Poor', 'Bad'] as const).map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}</View>
          <Card style={{ paddingVertical: 2 }}>
            {shown.length ? shown.map((x, i) => <ScanRow key={x.id} scan={x} last={i === shown.length - 1} />) : <Text style={[type.body, { color: color.ink2, paddingVertical: 16 }]}>No {filter.toLowerCase()} scans yet.</Text>}
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  current: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 28 },
  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 28 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
})
