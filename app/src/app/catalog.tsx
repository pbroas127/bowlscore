// The full scored catalog for the active pet's species: search, filter by form and price, best scores first.
import { router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native'
import { AffiliateNote, ProductRow } from '@/components/ProductCard'
import { Chip, EmptyState, PillButton } from '@/components/ui'
import { allergyHits, claimOf, refreshCatalog, useCatalog } from '@/lib/catalog'
import { fitFor } from '@/lib/fit'
import { activePet, useStore } from '@/lib/store'
import type { CatalogProduct, FoodForm, Pet } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

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

export default function CatalogScreen() {
  const pet = useStore(activePet)
  const catalog = useCatalog()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<FoodForm>()
  const [price, setPrice] = useState<1 | 2 | 3>()
  const species = pet?.species ?? 'dog'
  const needle = q.trim().toLowerCase()
  const shown = (catalog?.products ?? [])
    .filter((p) => p.species === species && (!form || p.form === form) && (!price || p.priceTier === price) && (!needle || `${p.brand} ${p.name}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.result.score - a.result.score)
  const clear = () => { setQ(''); setForm(undefined); setPrice(undefined) }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.nav}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back" style={({ pressed }) => pressed && { opacity: 0.5 }}><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
        <Text style={type.h2} numberOfLines={1}>Foods for {pet?.name ?? (species === 'cat' ? 'cats' : 'dogs')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={s.search}>
        <MagnifyingGlass size={20} weight="bold" color={color.ink3} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search by brand or name" placeholderTextColor={color.ink3} style={s.input} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
          {FORMS.map(([label, f]) => <Chip key={label} label={label} selected={form === f} onPress={() => setForm(f)} />)}
          <View style={s.rule} />
          {PRICES.map((n) => <Chip key={n} label={'$'.repeat(n)} selected={price === n} onPress={() => setPrice(price === n ? undefined : n)} />)}
        </ScrollView>
      </View>
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listPad}
        renderItem={({ item, index }) => <ProductRow product={item} last={index === shown.length - 1} note={unfit(pet, item)} />}
        ListFooterComponent={shown.length ? <AffiliateNote /> : null}
        ListEmptyComponent={
          catalog
            ? <EmptyState pose="kitten-peeking" title="Nothing matches that" body="Try a shorter search or clear the filters." action={<PillButton label="Clear filters" variant="quiet" onPress={clear} />} />
            : <EmptyState pose="pair-sleeping" title="The catalog is not loaded yet" body="It needs a connection the first time. Your scans still work without it." action={<PillButton label="Try again" onPress={() => refreshCatalog(true)} />} />
        }
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: 44, paddingHorizontal: gutter, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, marginHorizontal: gutter, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 14 },
  input: { ...type.body, flex: 1, height: 52 },
  chips: { paddingHorizontal: gutter, paddingVertical: 12, gap: 8, alignItems: 'center' },
  rule: { width: 1, height: 24, backgroundColor: color.hairline, marginHorizontal: 4 },
  listPad: { paddingHorizontal: gutter, paddingBottom: 40 },
})
