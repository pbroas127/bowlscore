// The open bag of a pet's main food: days left, a bar, and a reorder button that lands right when people need it.
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Package } from 'phosphor-react-native'
import { AffiliateNote } from '@/components/ProductCard'
import { ActionRow, Card, Chip, PillButton, ProgressBar, TextLink } from '@/components/ui'
import { startBag, stopBag } from '@/lib/bag'
import { bagStatus, gramsPerDay } from '@/lib/fit'
import { suggestedSize } from '@/components/Variants'
import { useCatalog } from '@/lib/catalog'
import { shopLink, tagged } from '@/lib/links'
import type { Pet, Scan } from '@/lib/types'
import { color, radius, type } from '@/theme'

const SIZES = [4, 6, 12, 15, 24, 30, 40]
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

export const bagLine = (pet: Pet, scan?: Scan) => {
  const grams = scan && pet.bag?.scanId === scan.id ? gramsPerDay(pet, scan.label) : undefined
  return grams && pet.bag ? `About ${days(bagStatus(pet.bag, grams).left)} of food left` : undefined
}

export function BagCard({ pet, scan, onEditPet, onEditFood }: { pet: Pet; scan: Scan; onEditPet: () => void; onEditFood: () => void }) {
  const [picking, setPicking] = useState(false)
  const [custom, setCustom] = useState('')
  const grams = gramsPerDay(pet, scan.label)
  const product = useCatalog()?.products.find((p) => p.id === scan.productId)
  // The exact listing when the food is in our catalog (in the size that suits the pet), else an Amazon search.
  const reorder = product ? tagged(suggestedSize(product, pet)?.url ?? product.links.amazon) : shopLink(`${scan.label.brand ?? ''} ${scan.label.productName ?? ''}`.trim(), pet.species)
  // Never hide the tracker: say what it still needs, with the fix one tap away.
  if (!grams) {
    const need = !pet.weightLb ? { what: `${pet.name}'s weight`, fix: onEditPet } : { what: 'the calories from the bag', fix: onEditFood }
    return (
      <Card style={s.card}>
        <View style={s.needRow}>
          <Package size={22} weight="bold" color={color.ink} />
          <View style={{ flex: 1 }}>
            <Text style={type.title}>Track this bag</Text>
            <Text style={type.caption}>Needs {need.what}</Text>
          </View>
          <TextLink label="Add" tone={color.ink} onPress={need.fix} />
        </View>
      </Card>
    )
  }

  const bag = pet.bag?.scanId === scan.id ? pet.bag : undefined
  const start = (lb: number) => { setPicking(false); setCustom(''); startBag(pet, scan, lb) }

  if (bag && !picking) {
    const { total, left } = bagStatus(bag, grams)
    const opened = Math.floor((Date.now() - bag.openedAt) / 86_400_000)
    return (
      <Card style={s.card}>
        <View>
          <Text style={[type.label, { color: color.ink2 }]}>{pet.name}'s bag</Text>
          <Text style={type.h1}>{left ? `About ${days(left)} left` : 'Probably empty by now'}</Text>
          <Text style={[type.body, { color: color.ink2 }]}>{`${bag.lb} lb bag, opened ${opened ? `${days(opened)} ago` : 'today'}`}</Text>
        </View>
        <ProgressBar value={left / total} />
        {left <= 7 ? <PillButton label="Reorder on Amazon" onPress={() => WebBrowser.openBrowserAsync(reorder).catch(() => {})} /> : null}
        <View style={s.links}>
          <TextLink label="Opened a new bag" onPress={() => setPicking(true)} />
          <TextLink label="Stop tracking" onPress={() => stopBag(pet)} />
        </View>
        {left <= 7 ? <AffiliateNote /> : null}
      </Card>
    )
  }

  if (!picking) return <Card style={s.ask}><ActionRow last label="Track this bag" hint="See the days left and get a reminder before it runs out" icon={<Package size={22} weight="bold" color={color.ink} />} onPress={() => setPicking(true)} /></Card>

  return (
    <Card style={s.card}>
      <Text style={type.title}>How big is the bag?</Text>
      <View style={s.chips}>{SIZES.map((lb) => <Chip key={lb} label={`${lb} lb`} onPress={() => start(lb)} />)}</View>
      <View style={s.customRow}>
        <TextInput value={custom} onChangeText={(t) => setCustom(t.replace(/[^\d.]/g, '').slice(0, 5))} placeholder="Other size" placeholderTextColor={color.ink3} keyboardType="decimal-pad" style={s.input} accessibilityLabel="Bag size in pounds" />
        <Text style={[type.label, { color: color.ink2 }]}>lb</Text>
        <View style={{ flex: 1 }} />
        {Number(custom) > 0 ? <TextLink label="Start" tone={color.ink} onPress={() => start(Math.min(100, Number(custom)))} /> : <TextLink label="Cancel" onPress={() => setPicking(false)} />}
      </View>
    </Card>
  )
}

const s = StyleSheet.create({
  card: { gap: 14, marginBottom: 12 },
  ask: { paddingVertical: 0, marginBottom: 12 },
  links: { flexDirection: 'row', gap: 20 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { ...type.body, width: 110, borderWidth: 1, borderColor: color.hairline, borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: color.surface, color: color.ink },
})
