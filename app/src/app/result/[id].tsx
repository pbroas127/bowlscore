import { router, useLocalSearchParams } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ArrowSquareOut, Check, Export, Info, Warning } from 'phosphor-react-native'
import { FlagRow, severityColor } from '@/components/FlagRow'
import { Mascot } from '@/components/Mascot'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, PillButton, TextLink } from '@/components/ui'
import { shopLink, SITE } from '@/lib/links'
import { BETTER_PICKS } from '@/lib/sample'
import { getState, setState, useStore } from '@/lib/store'
import type { Flag, Pet, Scan } from '@/lib/types'
import { color, gradeColor, gutter, radius, shadow, type } from '@/theme'

const ALLERGENS: Record<string, RegExp> = {
  Chicken: /chicken|poultry/i,
  Beef: /\bbeef\b/i,
  Dairy: /milk|cheese|whey|casein|dairy|yogurt/i,
  Grain: /wheat|corn|rice|barley|\boats?\b|oatmeal|sorghum|\brye\b/i,
  Fish: /fish|salmon|tuna|herring|menhaden|sardine|anchov|mackerel|cod|pollock|trout/i,
  Egg: /\begg/i,
}
const allergyHits = (pet: Pet | undefined, scan: Scan) => (pet?.allergies ?? []).filter((a) => ALLERGENS[a] && scan.label.ingredients.some((i) => ALLERGENS[a].test(i)))

function NutrientBar({ label, value, zone, max, unit = '%' }: { label: string; value?: number; zone: [number, number]; max: number; unit?: string }) {
  if (value == null) return null
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%` as const
  const inZone = value >= zone[0] && value <= zone[1]
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={type.label}>{label}</Text>
        <Text style={[type.label, { fontVariant: ['tabular-nums'], color: inZone ? color.green : color.poor }]}>{value}{unit}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barZone, { left: pct(zone[0]), width: pct(zone[1] - zone[0]) }]} />
        <View style={[s.barMarker, { left: pct(value), backgroundColor: inZone ? color.green : color.poor }]} />
      </View>
    </View>
  )
}

export default function Result() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>()
  const scan = useStore((st) => st.scans.find((x) => x.id === id))
  const pet = useStore((st) => st.pets.find((p) => p.id === scan?.petId))
  const [open, setOpen] = useState<Flag>()
  const [ringDone, setRingDone] = useState(!fresh)

  // Ask for a rating only after someone has seen real value: their third scan, and a good one.
  useEffect(() => {
    const st = getState()
    if (fresh && scan && scan.result.score >= 50 && st.scans.length >= 3 && st.ratingAsks < 1) {
      const t = setTimeout(async () => { if (await StoreReview.isAvailableAsync().catch(() => false)) { StoreReview.requestReview().catch(() => {}); setState({ ratingAsks: st.ratingAsks + 1 }) } }, 2600)
      return () => clearTimeout(t)
    }
  }, [fresh, scan])

  if (!scan) return <SafeAreaView style={s.root}><View style={{ padding: gutter }}><TextLink label="Back" onPress={() => router.back()} /></View></SafeAreaView>

  const { label, result } = scan
  const watch = result.flags.filter((f) => f.severity !== 'good' && f.severity !== 'info')
  const notes = result.flags.filter((f) => f.severity === 'info')
  const good = result.flags.filter((f) => f.severity === 'good')
  const hits = allergyHits(pet, scan)
  const isCurrent = pet?.currentScanId === scan.id
  const cat = pet?.species === 'cat'
  const dm = result.dryMatter
  const name = pet?.name ?? 'your pet'

  const share = () => Share.share({ message: `${label.productName || `${name}'s food`} scored ${result.score} out of 100 on BowlScore. ${SITE.home}` }).catch(() => {})
  const setCurrent = () => setState((st) => ({ pets: st.pets.map((p) => (p.id === pet?.id ? { ...p, currentScanId: isCurrent ? undefined : scan.id } : p)) }))

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.nav}>
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back"><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
        <Pressable hitSlop={12} onPress={share} accessibilityLabel="Share"><Export size={24} weight="bold" color={color.ink} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Text style={type.h1} numberOfLines={2}>{label.productName || 'Scanned food'}</Text>
        <Text style={[type.body, { color: color.ink2 }]}>{[label.brand, `Scored for ${name}`].filter(Boolean).join(' · ')}</Text>

        <View style={s.hero}>
          <View style={s.heroGlow} />
          <ScoreRing score={result.score} animate={Boolean(fresh)} onDone={() => setRingDone(true)} />
        </View>

        {scan.source === 'web' ? (
          <View style={[s.alert, { backgroundColor: color.yellowSoft }]}>
            <Info size={22} weight="fill" color={color.ink} />
            <Text style={[type.label, { flex: 1 }]}>Scored from the ingredient list published for this product. Recipes change, so check it against your bag or snap the label.</Text>
          </View>
        ) : null}
        {hits.length ? (
          <View style={s.alert}>
            <Warning size={22} weight="fill" color={color.bad} />
            <Text style={[type.title, { flex: 1 }]}>Contains {hits.join(' and ').toLowerCase()}. {name} is allergic.</Text>
          </View>
        ) : null}
        {result.cap ? (
          <View style={s.alert}>
            <Warning size={22} weight="fill" color={color.bad} />
            <Text style={[type.label, { flex: 1 }]}>Score capped at {result.cap.limit} because this food contains {result.cap.reason.toLowerCase()}.</Text>
          </View>
        ) : null}

        {ringDone ? (
          <>
            {watch.length ? (
              <Animated.View entering={FadeInDown.duration(280)}>
                <Text style={s.section}>Watch outs</Text>
                <Card style={s.list}>{watch.map((f, i) => <FlagRow key={f.title + i} flag={f} last={i === watch.length - 1} onPress={() => setOpen(f)} />)}</Card>
              </Animated.View>
            ) : null}
            {good.length ? (
              <Animated.View entering={FadeInDown.delay(80).duration(280)}>
                <Text style={s.section}>The good stuff</Text>
                <Card style={s.list}>{good.map((f, i) => <FlagRow key={f.title + i} flag={f} last={i === good.length - 1} onPress={() => setOpen(f)} />)}</Card>
              </Animated.View>
            ) : null}

            {dm.protein != null ? (
              <Animated.View entering={FadeInDown.delay(160).duration(280)}>
                <Text style={s.section}>Nutrition</Text>
                <Card style={{ gap: 18 }}>
                  <NutrientBar label="Protein" value={dm.protein} zone={[cat ? 30 : 22, 60]} max={60} />
                  <NutrientBar label="Fat" value={dm.fat} zone={cat ? [15, 28] : [12, 22]} max={40} />
                  <NutrientBar label="Fiber" value={dm.fiber} zone={[1, 6]} max={12} />
                  <NutrientBar label="Estimated carbs" value={dm.carbs} zone={[0, cat ? 25 : 45]} max={70} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Info size={16} weight="bold" color={color.ink3} />
                    <Text style={[type.caption, { flex: 1 }]}>Shown on a dry matter basis, with the {dm.moistureUsed}% water removed, so wet and dry foods compare fairly. Green zones suit {cat ? 'cats' : 'dogs'}.</Text>
                  </View>
                </Card>
              </Animated.View>
            ) : null}

            <Text style={s.section}>First five ingredients</Text>
            <View style={{ gap: 8 }}>
              {label.ingredients.slice(0, 5).map((ing, i) => (
                <View key={ing + i} style={s.ing}><Text style={s.ingNum}>{i + 1}</Text><Text style={[type.body, { flex: 1 }]}>{ing}</Text></View>
              ))}
            </View>
            {label.ingredients.length > 5 ? <Text style={[type.caption, { marginTop: 8 }]}>Plus {label.ingredients.length - 5} more. The first five make up most of the food by weight.</Text> : null}

            {result.score < 75 ? (
              <>
                <Text style={s.section}>Better picks for {name}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 12 }}>
                  {BETTER_PICKS.map((p) => (
                    <Pressable key={p.name} style={s.pick} onPress={() => WebBrowser.openBrowserAsync(shopLink(p.query, pet?.species ?? 'dog'))}>
                      <View style={[s.pickScore, { backgroundColor: gradeColor(p.score) }]}><Text style={[type.label, { color: color.surface }]}>{p.score}+</Text></View>
                      <Text style={type.title}>{p.name}</Text>
                      <Text style={type.caption}>{p.why}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' }}><Text style={type.label}>Shop</Text><ArrowSquareOut size={16} weight="bold" color={color.ink} /></View>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[type.caption, { marginTop: 8 }]}>We may earn a commission if you buy through these links. It never changes a score.</Text>
              </>
            ) : null}

            {notes.length ? (
              <>
                <Text style={s.section}>Good to know</Text>
                <Card style={s.list}>{notes.map((f, i) => <FlagRow key={f.title + i} flag={f} last={i === notes.length - 1} onPress={() => setOpen(f)} />)}</Card>
              </>
            ) : null}

            <View style={{ alignItems: 'center', gap: 8, marginTop: 32 }}>
              <TextLink label="How we score" onPress={() => WebBrowser.openBrowserAsync(SITE.methodology)} />
              <Text style={type.caption}>BowlScore is not veterinary advice.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[s.sticky, shadow]}>
        <PillButton label={isCurrent ? `This is ${name}'s food` : `Set as ${name}'s food`} variant={isCurrent ? 'quiet' : 'primary'} icon={isCurrent ? <Check size={20} weight="bold" color={color.green} /> : undefined} onPress={setCurrent} />
      </SafeAreaView>

      <Modal visible={Boolean(open)} transparent animationType="slide" onRequestClose={() => setOpen(undefined)}>
        <Pressable style={s.scrim} onPress={() => setOpen(undefined)} />
        {open ? (
          <SafeAreaView edges={['bottom']} style={s.sheet}>
            <View style={s.grabber} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: severityColor[open.severity] }} />
              <Text style={[type.h2, { flex: 1 }]}>{open.title}</Text>
            </View>
            {open.ingredient ? <Text style={[type.label, { color: color.ink2 }]}>On this label: {open.ingredient}</Text> : null}
            <Text style={type.body}>{open.detail}</Text>
            {open.severity === 'good' ? <Mascot pose="pair-celebrating" size={110} style={{ alignSelf: 'center' }} /> : null}
            <TextLink label="See our sources" onPress={() => WebBrowser.openBrowserAsync(SITE.methodology)} />
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: gutter, height: 44, alignItems: 'center' },
  hero: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  heroGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: color.yellowSoft, opacity: 0.6 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.badSoft, borderRadius: radius.card, padding: 16, marginBottom: 12 },
  section: { ...type.h2, marginTop: 32, marginBottom: 12 },
  list: { paddingVertical: 2 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: color.hairline },
  barZone: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5, backgroundColor: color.greenSoft, borderWidth: 1, borderColor: '#BFE8D0' },
  barMarker: { position: 'absolute', top: -3, width: 6, height: 16, borderRadius: 3, marginLeft: -3 },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, paddingHorizontal: 12, paddingVertical: 10 },
  ingNum: { ...type.label, width: 24, height: 24, borderRadius: 12, backgroundColor: color.yellowSoft, textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  pick: { width: 200, minHeight: 170, backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.hairline, padding: 16, gap: 6 },
  pickScore: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 4 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.hairline, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8 },
  scrim: { flex: 1, backgroundColor: 'rgba(35,31,26,0.4)' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 20, gap: 12 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.hairline, marginBottom: 4 },
})
