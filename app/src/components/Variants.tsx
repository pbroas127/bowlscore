// Amazon style options on a product page: the other versions of the same line (a Formula row and a Flavor row when the
// catalog names them, else one Version row) and the bag sizes, with the one that suits this pet marked. Picking a size
// changes where Shop goes.
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { bestSize, gramsPerDay, suitsPet } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { claimOf, pickVariant, proteinOf } from '@/lib/recommend'
import type { BagSize, CatalogProduct, Pet } from '@/lib/types'
import { color, radius, type } from '@/theme'

// The version to point out: suits the pet, then same protein, then the best score.
export function bestVersion(versions: CatalogProduct[], pet?: Pet) {
  if (!pet) return undefined
  const ok = versions.filter((p) => p.species === pet.species && suitsPet(pet, p.label, claimOf(p)))
  const same = (p: CatalogProduct) => (pet.protein && proteinOf(p.label.ingredients) === pet.protein ? 1 : 0)
  return ok.sort((a, b) => same(b) - same(a) || b.result.score - a.result.score)[0]
}

export const suggestedSize = (product: CatalogProduct, pet?: Pet) =>
  bestSize(product.sizes ?? [], pet && pet.species === product.species ? gramsPerDay(pet, product.label) : undefined)

// `faded`: not sold with the other current pick. Still tappable, it jumps to the nearest real version.
function Option({ label, on, best, faded, onPress }: { label: string; on: boolean; best?: boolean; faded?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap('select'); onPress() }} style={[s.option, on && s.on, faded && !on && s.faded]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[type.label, on && { color: color.bg }]} numberOfLines={2}>{label}</Text>
      {best ? <View style={[s.best, on && { backgroundColor: color.yellow }]}><Text style={s.bestText}>Best fit</Text></View> : null}
    </Pressable>
  )
}

export function Variants({ product, all, pet, size, onSize }: { product: CatalogProduct; all: CatalogProduct[]; pet?: Pet; size?: BagSize; onSize: (s: BagSize) => void }) {
  const versions = product.line ? all.filter((p) => p.line === product.line) : []
  const pick = bestVersion(versions, pet)
  const sizes = product.sizes ?? []
  const fit = suggestedSize(product, pet)
  const grams = pet && pet.species === product.species ? gramsPerDay(pet, product.label) : undefined
  const lasts = size && grams ? Math.round((size.lb * 453.6) / grams) : undefined
  if (versions.length < 2 && !sizes.length) return null

  const go = (v: CatalogProduct) => v.id !== product.id && router.replace(`/product/${v.id}`)
  const distinct = (k: 'formula' | 'flavor') => [...new Set(versions.map((v) => v[k]).filter((x): x is string => Boolean(x)))]
  const formulas = distinct('formula')
  const flavors = distinct('flavor')
  const split = versions.length > 1 && (formulas.length > 1 || flavors.length > 1)
  const sold = (formula?: string, flavor?: string) => versions.some((v) => v.formula === formula && v.flavor === flavor)
  const row = (title: string, children: ReactNode) => (
    <View style={{ gap: 8 }}>
      <Text style={type.label}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{children}</ScrollView>
    </View>
  )

  return (
    <View style={{ gap: 16, marginBottom: 20 }}>
      {split ? (
        <>
          {formulas.length ? row('Formula', formulas.map((f) => <Option key={f} label={f} on={f === product.formula} best={f === pick?.formula} faded={!sold(f, product.flavor)} onPress={() => go(pickVariant(versions, { formula: f }, product))} />)) : null}
          {flavors.length ? row('Flavor', flavors.map((f) => <Option key={f} label={f} on={f === product.flavor} best={f === pick?.flavor} faded={!sold(product.formula, f)} onPress={() => go(pickVariant(versions, { flavor: f }, product))} />)) : null}
        </>
      ) : versions.length > 1 ? row('Version', versions.map((v) => <Option key={v.id} label={v.name} on={v.id === product.id} best={v.id === pick?.id} onPress={() => go(v)} />)) : null}
      {sizes.length ? (
        <View style={{ gap: 8 }}>
          <Text style={type.label}>Size</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {sizes.map((b) => <Option key={b.label} label={b.label} on={b.label === size?.label} best={sizes.length > 1 && b.label === fit?.label} onPress={() => onSize(b)} />)}
          </ScrollView>
          {lasts ? <Text style={type.caption}>Lasts {pet?.name} about {lasts} {lasts === 1 ? 'day' : 'days'}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  row: { gap: 8, paddingRight: 8 },
  option: { minWidth: 72, maxWidth: 200, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, gap: 4 },
  on: { backgroundColor: color.ink, borderColor: color.ink },
  faded: { opacity: 0.4, borderStyle: 'dashed' },
  best: { alignSelf: 'flex-start', backgroundColor: color.yellowSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  bestText: { fontSize: 10, lineHeight: 14, fontWeight: '700', color: color.ink },
})
