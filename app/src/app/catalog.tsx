// The full scored catalog for the active pet's species: search, filter by form and price, best scores first.
// It is also free mode: closing the paywall lands here, with scores and shop links but nothing about a pet.
import { router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native'
import { Brand } from '@/components/Brand'
import { AffiliateNote, ProductRow } from '@/components/ProductCard'
import { Chip, EmptyState, PillButton } from '@/components/ui'
import { allergyHits, claimOf, proteinOf, refreshCatalog, useCatalog } from '@/lib/catalog'
import { fitFor } from '@/lib/fit'
import { usePro } from '@/lib/purchases'
import { activePet, useStore } from '@/lib/store'
import type { CatalogProduct, FoodForm, Pet, Species } from '@/lib/types'
import { color, column, font, gutter, radius, type } from '@/theme'

const FORMS: [string, FoodForm | undefined][] = [['All', undefined], ['Dry', 'dry'], ['Wet', 'wet'], ['Treats', 'treat']]
const PRICES = [1, 2, 3] as const

// The red line on a row: an allergen first, then the first reason the food does not suit this pet's age or size.
const unfit = (pet: Pet | undefined, p: CatalogProduct) => {
  const hits = allergyHits(pet?.allergies, p.label.ingredients)
  if (hits.length) return `Contains ${hits.join(' and ').toLowerCase()}`
  const bad = pet && fitFor(pet, p.label, claimOf(p)).lines.find((l) => l.tone === 'bad')
  if (!bad) return undefined
  return bad.label === 'Age' ? `Not for ${pet.species === 'cat' ? 'kittens' : 'puppies'}` : bad.label === 'Size' ? 'Not for large breed puppies' : bad.note.split('. ')[0]
}

export default function CatalogRoute() {
  return <CatalogScreen />
}

export function CatalogScreen({ tab }: { tab?: boolean }) {
  const cols = useWindowDimensions().width >= 700 ? 2 : 1 // iPad: two columns of rows
  const pro = usePro()
  const stored = useStore(activePet)
  const pet = pro ? stored : undefined
  const [picked, setPicked] = useState<Species>(stored?.species ?? 'dog')
  const catalog = useCatalog()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<FoodForm>()
  const [price, setPrice] = useState<1 | 2 | 3>()
  const [same, setSame] = useState(false)
  const species = pet?.species ?? picked
  const needle = q.trim().toLowerCase()
  const shown = (catalog?.products ?? [])
    .filter((p) => p.species === species && (!form || p.form === form) && (!price || p.priceTier === price) && (!same || !pet?.protein || proteinOf(p.label.ingredients) === pet.protein) && (!needle || `${p.brand} ${p.name}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.result.score - a.result.score)
  const clear = () => { setQ(''); setForm(undefined); setPrice(undefined); setSame(false) }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={[s.root, cols > 1 ? { width: '100%', maxWidth: 960, alignSelf: 'center' } : column]}>
      {tab ? (
        <Text style={[type.h1, s.title]}>Foods for {pet?.name ?? 'your pet'}</Text>
      ) : pro ? (
        <View style={s.nav}>
          <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back" style={({ pressed }) => pressed && { opacity: 0.5 }}><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
          <Text style={type.h2} numberOfLines={1}>Foods for {pet?.name ?? (species === 'cat' ? 'cats' : 'dogs')}</Text>
          <View style={{ width: 24 }} />
        </View>
      ) : (
        <View style={s.nav}>
          <Brand size={24} />
          <Pressable onPress={() => router.push('/paywall?from=free')} style={({ pressed }) => [s.unlock, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Unlock BowlScore"><Text style={s.unlockText}>Unlock</Text></Pressable>
        </View>
      )}
      <View style={s.search}>
        <MagnifyingGlass size={20} weight="bold" color={color.ink3} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search by brand or name" placeholderTextColor={color.ink3} style={s.input} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
          {!pro ? <>{(['dog', 'cat'] as const).map((sp) => <Chip key={sp} label={sp === 'dog' ? 'Dogs' : 'Cats'} selected={species === sp} onPress={() => setPicked(sp)} />)}<View style={s.rule} /></> : null}
          {FORMS.map(([label, f]) => <Chip key={label} label={label} selected={form === f} onPress={() => setForm(f)} />)}
          <View style={s.rule} />
          {PRICES.map((n) => <Chip key={n} label={'$'.repeat(n)} selected={price === n} onPress={() => setPrice(price === n ? undefined : n)} />)}
          {pet?.protein ? <><View style={s.rule} /><Chip label="Same protein" selected={same} onPress={() => setSame((v) => !v)} /></> : null}
        </ScrollView>
      </View>
      <FlatList
        key={cols}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? { gap: 32 } : undefined}
        data={shown}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listPad}
        renderItem={({ item, index }) => <View style={{ flex: 1 }}><ProductRow product={item} last={index >= shown.length - cols} note={unfit(pet, item)} /></View>}
        ListFooterComponent={shown.length ? <AffiliateNote /> : null}
        ListEmptyComponent={
          catalog
            ? <EmptyState pose="kitten-peeking" title="Nothing matches that" body="Try a shorter search or clear the filters." action={<PillButton label="Clear filters" variant="quiet" onPress={clear} />} />
            : <EmptyState pose="pair-sleeping" title="The catalog is not loaded yet" body="It needs a connection the first time. Your scans still work without it." action={<PillButton label="Try again" onPress={() => refreshCatalog(true)} />} />
        }
      />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  unlock: { backgroundColor: color.yellow, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: color.yellowEdge },
  unlockText: { fontFamily: font.textBold, fontSize: 14, lineHeight: 18, color: color.ink },
  title: { paddingTop: 12, paddingHorizontal: gutter, marginBottom: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: 44, paddingHorizontal: gutter, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, marginHorizontal: gutter, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 14 },
  input: { ...type.body, flex: 1, height: 52 },
  chips: { paddingHorizontal: gutter, paddingVertical: 12, gap: 8, alignItems: 'center' },
  rule: { width: 1, height: 24, backgroundColor: color.hairline, marginHorizontal: 4 },
  listPad: { paddingHorizontal: gutter, paddingBottom: 40 },
})
