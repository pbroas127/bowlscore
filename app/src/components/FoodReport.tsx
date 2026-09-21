// The score report shared by a scan result and a catalog product: header, ring, alerts, flags, nutrition, ingredients.
import * as WebBrowser from 'expo-web-browser'
import { useState, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Info, Warning } from 'phosphor-react-native'
import { FlagRow, severityColor } from '@/components/FlagRow'
import { Mascot } from '@/components/Mascot'
import { ProductPhoto } from '@/components/ProductCard'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, TextLink } from '@/components/ui'
import { SITE } from '@/lib/links'
import { allergyHits, watchOuts } from '@/lib/recommend'
import type { Flag, LabelData, ScoreResult, Species } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

// Green zones on a dry matter basis, per species: [low, high].
export const zones = (species: Species) => ({
  protein: [species === 'cat' ? 30 : 22, 60] as [number, number],
  fat: (species === 'cat' ? [15, 28] : [12, 22]) as [number, number],
  fiber: [1, 6] as [number, number],
  carbs: [0, species === 'cat' ? 25 : 45] as [number, number],
})

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

export function Notice({ children, tone = 'bad' }: { children: ReactNode; tone?: 'bad' | 'info' }) {
  return (
    <View style={[s.alert, tone === 'info' && { backgroundColor: color.yellowSoft }]}>
      {tone === 'info' ? <Info size={22} weight="fill" color={color.ink} /> : <Warning size={22} weight="fill" color={color.bad} />}
      {children}
    </View>
  )
}

export function FoodHero({ image, name, subtitle, score, animate, onDone }: { image?: string | null; name: string; subtitle: string; score: number; animate?: boolean; onDone?: () => void }) {
  return (
    <>
      <View style={s.head}>
        {image ? <ProductPhoto uri={image} size={64} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={type.h1} numberOfLines={2}>{name}</Text>
          <Text style={[type.body, { color: color.ink2 }]} numberOfLines={2}>{subtitle}</Text>
        </View>
      </View>
      <View style={s.hero}>
        <View style={s.heroGlow} />
        <ScoreRing score={score} animate={Boolean(animate)} onDone={onDone} />
      </View>
    </>
  )
}

export function FoodReport({ label, result, species, petName, allergies, show = true, stagger, top, children }: { label: LabelData; result: ScoreResult; species: Species; petName: string; allergies?: string[]; show?: boolean; stagger?: boolean; top?: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState<Flag>()
  const watch = watchOuts(result)
  const notes = result.flags.filter((f) => f.severity === 'info')
  const good = result.flags.filter((f) => f.severity === 'good')
  const hits = allergyHits(allergies, label.ingredients)
  const dm = result.dryMatter
  const z = zones(species)
  const enter = (i: number) => (stagger ? FadeInDown.delay(i * 80).duration(280) : undefined)

  return (
    <>
      {hits.length ? <Notice><Text style={[type.title, { flex: 1 }]}>Contains {hits.join(' and ').toLowerCase()}. {petName} is allergic.</Text></Notice> : null}
      {result.cap ? <Notice><Text style={[type.label, { flex: 1 }]}>Score capped at {result.cap.limit} because this food contains {result.cap.reason.toLowerCase()}.</Text></Notice> : null}

      {show ? (
        <>
          {top ? <Animated.View entering={enter(0)}>{top}</Animated.View> : null}
          {watch.length ? (
            <Animated.View entering={enter(0)}>
              <Text style={s.section}>Watch outs</Text>
              <Card style={s.list}>{watch.map((f, i) => <FlagRow key={f.title + i} flag={f} last={i === watch.length - 1} onPress={() => setOpen(f)} />)}</Card>
            </Animated.View>
          ) : null}
          {good.length ? (
            <Animated.View entering={enter(1)}>
              <Text style={s.section}>The good stuff</Text>
              <Card style={s.list}>{good.map((f, i) => <FlagRow key={f.title + i} flag={f} last={i === good.length - 1} onPress={() => setOpen(f)} />)}</Card>
            </Animated.View>
          ) : null}

          {dm.protein != null ? (
            <Animated.View entering={enter(2)}>
              <Text style={s.section}>Nutrition</Text>
              <Card style={{ gap: 18 }}>
                <NutrientBar label="Protein" value={dm.protein} zone={z.protein} max={60} />
                <NutrientBar label="Fat" value={dm.fat} zone={z.fat} max={40} />
                <NutrientBar label="Fiber" value={dm.fiber} zone={z.fiber} max={12} />
                <NutrientBar label="Estimated carbs" value={dm.carbs} zone={z.carbs} max={70} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Info size={16} weight="bold" color={color.ink3} />
                  <Text style={[type.caption, { flex: 1 }]}>Shown on a dry matter basis, with the {dm.moistureUsed}% water removed, so wet and dry foods compare fairly. Green zones suit {species === 'cat' ? 'cats' : 'dogs'}.</Text>
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

          {children}

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
    </>
  )
}

// Shared by every report style screen (result, product): the section heading.
export const sectionTitle = { ...type.h2, marginTop: 32, marginBottom: 12 } as const

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hero: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  heroGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: color.yellowSoft, opacity: 0.6 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.badSoft, borderRadius: radius.card, padding: 16, marginBottom: 12 },
  section: sectionTitle,
  list: { paddingVertical: 2 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: color.hairline },
  barZone: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5, backgroundColor: color.greenSoft, borderWidth: 1, borderColor: '#BFE8D0' },
  barMarker: { position: 'absolute', top: -3, width: 6, height: 16, borderRadius: 3, marginLeft: -3 },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, paddingHorizontal: 12, paddingVertical: 10 },
  ingNum: { ...type.label, width: 24, height: 24, borderRadius: 12, backgroundColor: color.yellowSoft, textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  scrim: { flex: 1, backgroundColor: 'rgba(35,31,26,0.4)' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 20, gap: 12 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.hairline, marginBottom: 4 },
})
