// Amazon style options on a product page: the other versions of the same line (flavor, puppy or adult) and the bag
// sizes, with the one that suits this pet marked. Picking a size changes where Shop goes.
import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { bestSize, gramsPerDay, suitsPet } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { claimOf, proteinOf } from '@/lib/recommend'
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

function Option({ label, on, best, onPress }: { label: string; on: boolean; best?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap('select'); onPress() }} style={[s.option, on && s.on]} accessibilityRole="button" accessibilityState={{ selected: on }}>
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

  return (
    <View style={{ gap: 16, marginBottom: 20 }}>
      {versions.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Text style={type.label}>Version</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {versions.map((v) => <Option key={v.id} label={v.name} on={v.id === product.id} best={v.id === pick?.id} onPress={() => v.id !== product.id && router.replace(`/product/${v.id}`)} />)}
          </ScrollView>
        </View>
      ) : null}
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
  best: { alignSelf: 'flex-start', backgroundColor: color.yellowSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  bestText: { fontSize: 10, lineHeight: 14, fontWeight: '700', color: color.ink },
})
