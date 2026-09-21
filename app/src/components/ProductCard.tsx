import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BowlFood, CaretRight, CurrencyCircleDollar } from 'phosphor-react-native'
import { ScoreRing } from '@/components/ScoreRing'
import { tap } from '@/lib/haptics'
import type { CatalogProduct } from '@/lib/types'
import { color, gutter, radius, type } from '@/theme'

// Product photo on a cream tile. The tile is the placeholder: it shows while the photo loads and when there is none.
// Pack shots come on white, so the tile turns white once the photo is in.
export function ProductPhoto({ uri, size, height = size }: { uri?: string | null; size: number | '100%'; height?: number | '100%' }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <View style={[s.photo, { width: size, height }, loaded && { backgroundColor: color.surface }]}>
      {uri ? <Image source={{ uri }} style={s.photoFill} contentFit="contain" transition={200} onLoad={() => setLoaded(true)} accessibilityIgnoresInvertColors /> : <BowlFood size={28} weight="bold" color={color.ink3} />}
    </View>
  )
}

export function PriceTier({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`Price level ${tier} of 3`}>
      {[1, 2, 3].map((n) => <CurrencyCircleDollar key={n} size={16} weight={n <= tier ? 'fill' : 'bold'} color={n <= tier ? color.ink : color.hairline} />)}
    </View>
  )
}

export const openProduct = (id: string) => router.push(`/product/${id}`)

export function ProductCard({ product, why }: { product: CatalogProduct; why: string }) {
  return (
    <Pressable onPress={() => { tap('select'); openProduct(product.id) }} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.98 }] }]}>
      <ProductPhoto uri={product.image} size="100%" height={120} />
      <View style={s.ring}><ScoreRing score={product.result.score} size={44} stroke={5} animate={false} /></View>
      <Text style={type.caption} numberOfLines={1}>{product.brand}</Text>
      <Text style={type.title} numberOfLines={2}>{product.name}</Text>
      <Text style={[type.caption, { color: color.green }]} numberOfLines={2}>{why}</Text>
      <View style={s.foot}>
        <PriceTier tier={product.priceTier} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Text style={type.label}>Shop</Text><CaretRight size={14} weight="bold" color={color.ink} /></View>
      </View>
    </Pressable>
  )
}

// Edge to edge carousel that still lines up with the 20 gutter.
export function ProductCarousel({ products, why }: { products: CatalogProduct[]; why: (p: CatalogProduct) => string }) {
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 12 }}>
        {products.map((p) => <ProductCard key={p.id} product={p} why={why(p)} />)}
      </ScrollView>
      <AffiliateNote />
    </>
  )
}

export function ProductRow({ product, note, last, onPress }: { product: CatalogProduct; note?: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress ?? (() => openProduct(product.id))} style={({ pressed }) => [s.row, !last && s.divider, pressed && { opacity: 0.6 }]}>
      <ProductPhoto uri={product.image} size={56} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={type.caption} numberOfLines={1}>{product.brand}</Text>
        <Text style={type.title} numberOfLines={2}>{product.name}</Text>
        {note ? <Text style={[type.caption, { color: color.bad }]} numberOfLines={1}>{note}</Text> : <PriceTier tier={product.priceTier} />}
      </View>
      <ScoreRing score={product.result.score} size={48} stroke={5} animate={false} />
    </Pressable>
  )
}

// Required wording, shown directly under every list of shop links.
export function AffiliateNote({ center }: { center?: boolean }) {
  return <Text style={[type.caption, { marginTop: 8 }, center && { textAlign: 'center' }]}>As an Amazon Associate I earn from qualifying purchases. A purchase never changes a score.</Text>
}

const s = StyleSheet.create({
  photo: { borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoFill: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4 },
  card: { width: 200, backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.hairline, padding: 12, gap: 4 },
  ring: { position: 'absolute', top: 18, right: 18, backgroundColor: color.surface, borderRadius: radius.pill, padding: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
})
