// The score report shared by a scan result and a catalog product. The answer first (score, the top reasons), then the
// page's own actions, then the details folded away: fit for this pet, ingredients, nutrition.
import * as WebBrowser from 'expo-web-browser'
import { useState, type ReactNode } from 'react'
import { LayoutAnimation, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CaretDown, Info, Warning } from 'phosphor-react-native'
import { FlagRow, severityColor } from '@/components/FlagRow'
import { Mascot } from '@/components/Mascot'
import { ProductPhoto } from '@/components/ProductCard'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, TextLink } from '@/components/ui'
import { SITE } from '@/lib/links'
import { allergyHits, watchOuts } from '@/lib/recommend'
import type { Flag, LabelData, ScoreResult, Species } from '@/lib/types'
import { tap } from '@/lib/haptics'
import { color, column, gutter, radius, type } from '@/theme'

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
  const short = useWindowDimensions().height < 740 // the reasons should start above the fold on an iPhone SE
  return (
    <>
      <View style={s.head}>
        {image ? <ProductPhoto uri={image} size={64} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={type.h1} numberOfLines={2}>{name}</Text>
          <Text style={[type.body, { color: color.ink2 }]} numberOfLines={2}>{subtitle}</Text>
        </View>
      </View>
      <View style={[s.hero, short && { paddingVertical: 16 }]}>
        <View style={[s.heroGlow, short && { transform: [{ scale: 0.8 }] }]} />
        <ScoreRing score={score} size={short ? 128 : 160} stroke={short ? 12 : 14} animate={Boolean(animate)} onDone={onDone} />
      </View>
    </>
  )
}

const RANK: Record<string, number> = { critical: 0, warning: 1, caution: 2 }

// A folded section: one tappable header row with a short summary on the right, the detail underneath when open.
function Fold({ title, right, open, onToggle, last, children }: { title: string; right?: ReactNode; open: boolean; onToggle: () => void; last?: boolean; children: ReactNode }) {
  return (
    <View style={!last && s.divider}>
      <Pressable onPress={() => { tap('select'); LayoutAnimation.easeInEaseOut(); onToggle() }} style={({ pressed }) => [s.foldHead, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={[type.title, { flex: 1 }]}>{title}</Text>
        {right}
        <View style={open && { transform: [{ rotate: '180deg' }] }}><CaretDown size={16} weight="bold" color={color.ink3} /></View>
      </Pressable>
      {open ? <View style={s.foldBody}>{children}</View> : null}
    </View>
  )
}

const Summary = ({ text, tone = color.ink2 }: { text: string; tone?: string }) => <Text style={[type.label, { color: tone }]} numberOfLines={1}>{text}</Text>

// `fit` is this pet's fit detail with its verdict chip; `children` are the page's own actions, placed right after the reasons.
export function FoodReport({ label, result, species, petName, allergies, show = true, stagger, fit, children }: { label: LabelData; result: ScoreResult; species: Species; petName: string; allergies?: string[]; show?: boolean; stagger?: boolean; fit?: { chip: ReactNode; body: ReactNode; open?: boolean }; children?: ReactNode }) {
  const [open, setOpen] = useState<Flag>()
  const [all, setAll] = useState(false)
  const [folds, setFolds] = useState<Record<string, boolean>>({ fit: Boolean(fit?.open) })
  const flip = (k: string) => setFolds((f) => ({ ...f, [k]: !f[k] }))
  const watch = watchOuts(result).sort((a, b) => RANK[a.severity] - RANK[b.severity])
  const notes = result.flags.filter((f) => f.severity === 'info')
  const good = result.flags.filter((f) => f.severity === 'good')
  const reasons = [...watch, ...good, ...notes]
  const shown = all ? reasons : reasons.slice(0, 3)
  const hits = allergyHits(allergies, label.ingredients)
  const dm = result.dryMatter
  const z = zones(species)
  const inZone = [[dm.protein, z.protein], [dm.fat, z.fat], [dm.fiber, z.fiber], [dm.carbs, z.carbs]].filter(([v]) => v != null) as [number, [number, number]][]
  const enter = (i: number) => (stagger ? FadeInDown.delay(i * 80).duration(280) : undefined)

  return (
    <>
      {hits.length ? <Notice><Text style={[type.title, { flex: 1 }]}>Contains {hits.join(' and ').toLowerCase()}. {petName} is allergic.</Text></Notice> : null}
      {result.cap ? <Notice><Text style={[type.label, { flex: 1 }]}>Score capped at {result.cap.limit} because this food contains {result.cap.reason.toLowerCase()}.</Text></Notice> : null}

      {show ? (
        <>
          {reasons.length ? (
            <Animated.View entering={enter(0)}>
              <Text style={[s.section, { marginTop: 8 }]}>Why it scored {result.score}</Text>
              <Card style={s.list}>
                {shown.map((f, i) => <FlagRow key={f.title + i} flag={f} last={i === shown.length - 1} onPress={() => setOpen(f)} />)}
                {reasons.length > 3 ? (
                  <Pressable onPress={() => { tap('select'); LayoutAnimation.easeInEaseOut(); setAll((a) => !a) }} style={({ pressed }) => [s.more, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                    <Text style={type.label}>{all ? 'Show less' : `See all ${reasons.length}`}</Text>
                    <View style={all && { transform: [{ rotate: '180deg' }] }}><CaretDown size={14} weight="bold" color={color.ink2} /></View>
                  </Pressable>
                ) : null}
              </Card>
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(1)}>{children}</Animated.View>

          <Animated.View entering={enter(2)}>
            <Text style={s.section}>Details</Text>
            <Card style={s.folds}>
              {fit ? <Fold title={`Fit for ${petName}`} right={fit.chip} open={Boolean(folds.fit)} onToggle={() => flip('fit')}>{fit.body}</Fold> : null}
              <Fold title="Ingredients" right={<Summary text={`${label.ingredients.length}`} />} open={Boolean(folds.ing)} onToggle={() => flip('ing')} last={dm.protein == null}>
                <View style={{ gap: 8 }}>
                  {label.ingredients.slice(0, 5).map((ing, i) => (
                    <View key={ing + i} style={s.ing}><Text style={s.ingNum}>{i + 1}</Text><Text style={[type.body, { flex: 1 }]}>{ing}</Text></View>
                  ))}
                </View>
                {label.ingredients.length > 5 ? (
                  <>
                    <Text style={[type.caption, { marginTop: 12 }]}>The first five make up most of the food by weight. Then:</Text>
                    <Text style={[type.caption, { color: color.ink, marginTop: 4 }]}>{label.ingredients.slice(5).join(', ')}</Text>
                  </>
                ) : null}
              </Fold>
              {dm.protein != null ? (
                <Fold title="Nutrition" right={<Summary text={`${inZone.filter(([v, [lo, hi]]) => v >= lo && v <= hi).length} of ${inZone.length} in range`} />} open={Boolean(folds.nut)} onToggle={() => flip('nut')} last>
                  <View style={{ gap: 18 }}>
                    <NutrientBar label="Protein" value={dm.protein} zone={z.protein} max={60} />
                    <NutrientBar label="Fat" value={dm.fat} zone={z.fat} max={40} />
                    <NutrientBar label="Fiber" value={dm.fiber} zone={z.fiber} max={12} />
                    <NutrientBar label="Estimated carbs" value={dm.carbs} zone={z.carbs} max={70} />
                    <Text style={type.caption}>Dry matter basis, with the {dm.moistureUsed}% water removed, so wet and dry foods compare fairly. Green zones suit {species === 'cat' ? 'cats' : 'dogs'}.</Text>
                  </View>
                </Fold>
              ) : null}
            </Card>
          </Animated.View>

          <View style={{ alignItems: 'center', gap: 8, marginTop: 32 }}>
            <TextLink label="How we score" onPress={() => WebBrowser.openBrowserAsync(SITE.methodology)} />
            <Text style={type.caption}>BowlScore is not veterinary advice.</Text>
          </View>
        </>
      ) : null}

      <Modal visible={Boolean(open)} transparent animationType="slide" onRequestClose={() => setOpen(undefined)}>
        <Pressable style={s.scrim} onPress={() => setOpen(undefined)} />
        {open ? (
          <SafeAreaView edges={['bottom']} style={[s.sheet, column]}>
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
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.hairline },
  folds: { paddingVertical: 0 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  foldBody: { paddingBottom: 16, gap: 12 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: color.hairline },
  barZone: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5, backgroundColor: color.greenSoft, borderWidth: 1, borderColor: '#BFE8D0' },
  barMarker: { position: 'absolute', top: -3, width: 6, height: 16, borderRadius: 3, marginLeft: -3 },
  ing: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, paddingHorizontal: 12, paddingVertical: 10 },
  ingNum: { ...type.label, width: 24, height: 24, borderRadius: 12, backgroundColor: color.yellowSoft, textAlign: 'center', lineHeight: 24, overflow: 'hidden' },
  scrim: { flex: 1, backgroundColor: 'rgba(35,31,26,0.4)' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 20, gap: 12 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.hairline, marginBottom: 4 },
})
