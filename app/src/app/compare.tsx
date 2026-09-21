// Side by side comparison. /compare?a=<scanId or product:id>&b=<same>. Without `b` the screen first asks what to compare with.
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native'
import { sectionTitle, zones } from '@/components/FoodReport'
import { ProductPhoto, ProductRow } from '@/components/ProductCard'
import { ScanRow } from '@/components/ScanRow'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, EmptyState, Screen, TextLink } from '@/components/ui'
import { useCatalog, verdict, watchOuts } from '@/lib/catalog'
import { activePet, useStore } from '@/lib/store'
import type { CatalogProduct, LabelData, Scan, ScoreResult } from '@/lib/types'
import { color, radius, type } from '@/theme'

interface Food { name: string; brand?: string; image?: string | null; label: LabelData; result: ScoreResult }

function resolve(ref: string | undefined, scans: Scan[], products: CatalogProduct[]): Food | undefined {
  if (!ref) return undefined
  if (ref.startsWith('product:')) return products.find((p) => `product:${p.id}` === ref)
  const x = scans.find((sc) => sc.id === ref)
  return x && { name: x.label.productName || 'Scanned food', brand: x.label.brand, image: x.image, label: x.label, result: x.result }
}

// 'high' and 'low' say which way is better. 'zone' only favors a value when it alone sits inside the ideal range.
function Row({ label, a, b, better, zone, unit = '', last }: { label: string; a?: number; b?: number; better: 'high' | 'low' | 'zone'; zone?: [number, number]; unit?: string; last?: boolean }) {
  const inZone = (n: number) => Boolean(zone && n >= zone[0] && n <= zone[1])
  const score = (n: number) => (better === 'high' ? n : better === 'low' ? -n : inZone(n) ? 1 : 0)
  const win = a == null || b == null || score(a) === score(b) ? undefined : score(a) > score(b) ? 'a' : 'b'
  const cell = (n: number | undefined, on: boolean) => <Text style={[s.value, on && { color: color.green }]}>{n == null ? 'Not listed' : `${n}${unit}`}</Text>
  return (
    <View style={[s.row, !last && s.divider]}>
      {cell(a, win === 'a')}
      <Text style={[type.caption, s.rowLabel]}>{label}</Text>
      {cell(b, win === 'b')}
    </View>
  )
}

function Column({ food, onChange }: { food: Food; onChange?: () => void }) {
  return (
    <View style={s.col}>
      <ProductPhoto uri={food.image} size="100%" height={96} />
      <Text style={type.caption} numberOfLines={1}>{food.brand ?? ' '}</Text>
      <Text style={[type.title, { minHeight: 66 }]} numberOfLines={3}>{food.name}</Text>
      <ScoreRing score={food.result.score} size={120} stroke={11} animate={false} />
      {onChange ? <TextLink label="Change" onPress={onChange} /> : null}
    </View>
  )
}

function Picker({ exclude, scans, products, onPick }: { exclude?: string; scans: Scan[]; products: CatalogProduct[]; onPick: (ref: string) => void }) {
  const [q, setQ] = useState('')
  const match = (...parts: (string | undefined)[]) => parts.join(' ').toLowerCase().includes(q.trim().toLowerCase())
  // ponytail: capped lists, narrowed by search. Move to a FlatList if the catalog grows past a few hundred products.
  const mine = scans.filter((x) => x.id !== exclude && match(x.label.productName, x.label.brand)).slice(0, 20)
  const theirs = products.filter((p) => `product:${p.id}` !== exclude && match(p.name, p.brand)).slice(0, 40)
  return (
    <>
      <Text style={[type.h1, { marginBottom: 16 }]}>Compare with</Text>
      <View style={s.search}>
        <MagnifyingGlass size={20} weight="bold" color={color.ink3} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search your scans and the catalog" placeholderTextColor={color.ink3} style={s.input} autoCorrect={false} returnKeyType="search" />
      </View>
      {mine.length ? <><Text style={sectionTitle}>Your scans</Text><Card style={s.list}>{mine.map((x, i) => <ScanRow key={x.id} scan={x} last={i === mine.length - 1} onPress={() => onPick(x.id)} />)}</Card></> : null}
      {theirs.length ? <><Text style={sectionTitle}>From the catalog</Text><Card style={s.list}>{theirs.map((p, i) => <ProductRow key={p.id} product={p} last={i === theirs.length - 1} onPress={() => onPick(`product:${p.id}`)} />)}</Card></> : null}
      {!mine.length && !theirs.length ? <View style={{ marginTop: 24 }}><EmptyState pose="kitten-peeking" title={q ? 'Nothing matches that search' : 'Nothing to compare with yet'} body={q ? 'Try a brand name or a shorter word.' : 'Scan a second food and it will show up here.'} /></View> : null}
    </>
  )
}

export default function Compare() {
  const { a, b } = useLocalSearchParams<{ a?: string; b?: string }>()
  const scans = useStore((st) => st.scans)
  const pet = useStore(activePet)
  const products = useCatalog()?.products ?? []
  const [A, B] = [resolve(a, scans, products), resolve(b, scans, products)]
  const z = zones(pet?.species ?? 'dog')

  return (
    <Screen scroll>
      <View style={s.nav}><Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back" style={({ pressed }) => pressed && { opacity: 0.5 }}><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable></View>
      {!A ? (
        <EmptyState pose="puppy-sniffing" title="We could not find that food" body="It may have been removed from your history." />
      ) : !B ? (
        <Picker exclude={a} scans={scans} products={products} onPick={(ref) => router.setParams({ b: ref })} />
      ) : (
        <>
          <Text style={[type.h1, { marginBottom: 16 }]}>Side by side</Text>
          <View style={s.cols}><Column food={A} /><Column food={B} onChange={() => router.setParams({ b: undefined })} /></View>
          <View style={s.verdict}><Text style={type.title}>{verdict(A, B)}</Text></View>

          <Text style={sectionTitle}>The numbers</Text>
          <Card style={s.list}>
            <Row label="Protein" a={A.result.dryMatter.protein} b={B.result.dryMatter.protein} better="high" unit="%" />
            <Row label="Fat" a={A.result.dryMatter.fat} b={B.result.dryMatter.fat} better="zone" zone={z.fat} unit="%" />
            <Row label="Estimated carbs" a={A.result.dryMatter.carbs} b={B.result.dryMatter.carbs} better="low" unit="%" />
            <Row label="Watch outs" a={watchOuts(A.result).length} b={watchOuts(B.result).length} better="low" last />
          </Card>
          <Text style={[type.caption, { marginTop: 8 }]}>Percentages are on a dry matter basis, so wet and dry foods compare fairly. Green marks the better value.</Text>

          <Text style={sectionTitle}>First five ingredients</Text>
          <View style={s.cols}>
            {[A, B].map((f, k) => (
              <Card key={k} style={s.ings}>
                {f.label.ingredients.slice(0, 5).map((ing, i) => <Text key={ing + i} style={type.label}><Text style={{ color: color.ink3 }}>{i + 1}  </Text>{ing}</Text>)}
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  nav: { height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  cols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.hairline, padding: 12 },
  verdict: { backgroundColor: color.yellowSoft, borderRadius: radius.card, padding: 16, marginTop: 12 },
  list: { paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  rowLabel: { flex: 1.2, textAlign: 'center' },
  value: { ...type.title, flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
  ings: { flex: 1, gap: 8, padding: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 14 },
  input: { ...type.body, flex: 1, height: 52 },
})
