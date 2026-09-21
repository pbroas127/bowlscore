import { router, useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GearSix, SealWarning } from 'phosphor-react-native'
import { Mascot, mascotFor } from '@/components/Mascot'
import { ProductCarousel } from '@/components/ProductCard'
import { ago, ScanRow } from '@/components/ScanRow'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, Chip, PillButton, Screen, TextLink } from '@/components/ui'
import { refreshCatalog, topRated, useCatalog, whyBetter } from '@/lib/catalog'
import { tap } from '@/lib/haptics'
import { checkRecalls, dismissRecall, recallDate } from '@/lib/recalls'
import { activePet, useStore } from '@/lib/store'
import type { Recall } from '@/lib/types'
import { color, gradeFor, radius, type, type Grade } from '@/theme'

function RecallBanner({ recall }: { recall: Recall }) {
  const when = recallDate(recall.date)
  return (
    <View style={s.recall}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SealWarning size={22} weight="fill" color={color.bad} />
        <Text style={[type.title, { flex: 1 }]}>Recall notice for {recall.brand}</Text>
      </View>
      <Text style={type.label}>{recall.product}</Text>
      <Text style={[type.caption, { color: color.ink }]}>{[recall.reason, when].filter(Boolean).join(' · ')}</Text>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
        <TextLink label="Read the notice" tone={color.ink} onPress={() => WebBrowser.openBrowserAsync(recall.url).catch(() => {})} />
        <TextLink label="Dismiss" onPress={() => { tap('select'); dismissRecall(recall.id) }} />
      </View>
    </View>
  )
}

export default function Home() {
  const pet = useStore(activePet)
  const allScans = useStore((s) => s.scans)
  const [filter, setFilter] = useState<Grade | 'All'>('All')
  const scans = allScans.filter((x) => x.petId === pet?.id)
  const current = scans.find((x) => x.id === pet?.currentScanId)
  const shown = scans.filter((x) => filter === 'All' || gradeFor(x.result.score) === filter)
  const catalog = useCatalog()
  const top = catalog && pet ? topRated(catalog.products, pet.species, pet.allergies, 8, pet) : []
  const seen = useStore((s) => s.recallsSeen)
  const recalls = useStore((s) => s.recalls).filter((r) => !seen.includes(r.id))

  // Both are throttled to once per 12 hours, so running them on every focus is cheap.
  useFocusEffect(useCallback(() => { refreshCatalog(); checkRecalls() }, []))

  return (
    <Screen scroll edges={['top']}>
      <View style={s.header}>
        <Pressable style={s.who} onPress={() => router.push('/(tabs)/pets')}>
          <View style={s.avatar}><Mascot pose={mascotFor(pet?.species, 'head')} size={44} bob={false} /></View>
          <View><Text style={type.caption}>Feeding</Text><Text style={type.h2}>{pet?.name ?? 'Your pet'}</Text></View>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => router.push('/settings')} accessibilityLabel="Settings"><GearSix size={26} weight="bold" color={color.ink} /></Pressable>
      </View>

      {recalls.map((r) => <RecallBanner key={r.id} recall={r} />)}

      {current ? (
        <Pressable onPress={() => router.push(`/result/${current.id}`)} style={({ pressed }) => pressed && { transform: [{ scale: 0.985 }] }}>
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

      {top.length ? (
        <>
          <View style={s.sectionRow}>
            <Text style={[type.h2, { flex: 1 }]} numberOfLines={1}>Top rated for {pet?.name}</Text>
            <TextLink label="See all" onPress={() => router.push('/catalog')} />
          </View>
          <ProductCarousel products={top} why={(p) => whyBetter(p)} />
        </>
      ) : null}

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
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 32, marginBottom: 12 },
  recall: { backgroundColor: color.badSoft, borderRadius: radius.card, padding: 16, gap: 4, marginBottom: 12 },
})
