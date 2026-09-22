// The open bag of a pet's main food: days left, a bar, and a reorder button that lands right when people need it.
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Package } from 'phosphor-react-native'
import { AffiliateNote, ProductPhoto } from '@/components/ProductCard'
import { ActionRow, Card, Chip, PillButton, ProgressBar, TextLink } from '@/components/ui'
import { suggestedSize } from '@/components/Variants'
import { setBagLink, startBag, stopBag } from '@/lib/bag'
import { closestProducts, useCatalog } from '@/lib/catalog'
import { bagStatus, gramsPerDay } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { ownLink, shopLink, tagged } from '@/lib/links'
import { updateScan } from '@/lib/store'
import type { Pet, Scan } from '@/lib/types'
import { color, radius, type } from '@/theme'

const SIZES = [4, 6, 12, 15, 24, 30, 40]
const DAY = 86_400_000
const OPENED: [string, number][] = [['Today', 0], ['Yesterday', 1], ['3 days ago', 3], ['A week ago', 7], ['2 weeks ago', 14]]
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0)

export const bagLine = (pet: Pet, scan?: Scan) => {
  const grams = scan && pet.bag?.scanId === scan.id ? gramsPerDay(pet, scan.label) : undefined
  return grams && pet.bag ? `About ${days(bagStatus(pet.bag, grams).left)} of food left` : undefined
}

export function BagCard({ pet, scan, onEditPet, onEditFood }: { pet: Pet; scan: Scan; onEditPet: () => void; onEditFood: () => void }) {
  const [picking, setPicking] = useState(false)
  const [size, setSize] = useState<number>()
  const [custom, setCustom] = useState('')
  const [ago, setAgo] = useState(0)
  const [linking, setLinking] = useState(false)
  const [pasted, setPasted] = useState('')
  const catalog = useCatalog()?.products
  const grams = gramsPerDay(pet, scan.label)
  const product = catalog?.find((p) => p.id === scan.productId)
  const bag = pet.bag?.scanId === scan.id ? pet.bag : undefined
  // The person's own link first, then the exact listing in the size that suits the pet, else an Amazon search.
  const reorder = bag?.link ?? (product ? tagged(suggestedSize(product, pet)?.url ?? product.links.amazon) : shopLink(`${scan.label.brand ?? ''} ${scan.label.productName ?? ''}`.trim(), pet.species))
  const reorderLabel = bag?.link && !/amazon\./i.test(bag.link) ? 'Reorder' : 'Reorder on Amazon'

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

  const open = () => { setSize(bag?.lb); setAgo(bag ? Math.round((midnight(Date.now()) - midnight(bag.openedAt)) / DAY) : 0); setPicking(true) }
  const lb = Number(custom) > 0 ? Math.min(100, Number(custom)) : size
  const start = () => {
    if (!lb) return
    tap('success')
    setPicking(false); setCustom('')
    startBag(pet, scan, lb, midnight(Date.now()) - ago * DAY + 12 * 3_600_000) // noon of that day, so "today" never reads as tomorrow
  }

  if (picking)
    return (
      <Card style={s.card}>
        <Text style={type.title}>How big is the bag?</Text>
        <View style={s.chips}>{(product?.sizes?.map((b) => b.lb) ?? SIZES).map((n) => <Chip key={n} label={`${n} lb`} selected={!custom && size === n} onPress={() => { setSize(n); setCustom('') }} />)}</View>
        <View style={s.customRow}>
          <TextInput value={custom} onChangeText={(t) => setCustom(t.replace(/[^\d.]/g, '').slice(0, 5))} placeholder="Other size" placeholderTextColor={color.ink3} keyboardType="decimal-pad" style={s.input} accessibilityLabel="Bag size in pounds" />
          <Text style={[type.label, { color: color.ink2 }]}>lb</Text>
        </View>
        <Text style={type.title}>When did you open it?</Text>
        <View style={s.chips}>{OPENED.map(([label, n]) => <Chip key={label} label={label} selected={ago === n} onPress={() => setAgo(n)} />)}</View>
        <PillButton label="Start tracking" disabled={!lb} onPress={start} />
        <View style={{ alignItems: 'center' }}><TextLink label="Cancel" onPress={() => setPicking(false)} /></View>
      </Card>
    )

  if (!bag) return <Card style={s.ask}><ActionRow last label="Track this bag" icon={<Package size={22} weight="bold" color={color.ink} />} onPress={open} /></Card>

  const { total, left } = bagStatus(bag, grams)
  const opened = Math.round((midnight(Date.now()) - midnight(bag.openedAt)) / DAY)
  // Not in our catalog and no link yet: offer the closest catalog foods, or a link of their own.
  const guesses = !product && !bag.link && catalog ? closestProducts(catalog, scan.label, pet.species) : []
  const saveLink = () => { const link = ownLink(pasted); if (!link) return; tap('success'); setBagLink(pet, link); setLinking(false); setPasted('') }

  return (
    <Card style={s.card}>
      <View>
        <Text style={[type.label, { color: color.ink2 }]}>{pet.name}'s bag</Text>
        <Text style={type.h1}>{left ? `About ${days(left)} left` : 'Probably empty by now'}</Text>
        <Pressable onPress={open} hitSlop={6}><Text style={[type.body, { color: color.ink2 }]}>{`${bag.lb} lb, opened ${opened ? `${days(opened)} ago` : 'today'}`} <Text style={s.change}>Change</Text></Text></Pressable>
      </View>
      <ProgressBar value={left / total} />
      {left <= 7 ? <PillButton label={reorderLabel} onPress={() => WebBrowser.openBrowserAsync(reorder).catch(() => {})} /> : null}

      {guesses.length ? (
        <View style={{ gap: 8 }}>
          <Text style={type.label}>Is it one of these?</Text>
          {guesses.map((p) => (
            <Pressable key={p.id} onPress={() => { tap('select'); updateScan(scan.id, (x) => ({ ...x, productId: p.id, image: p.image ?? x.image })) }} style={({ pressed }) => [s.guess, pressed && { opacity: 0.6 }]}>
              <ProductPhoto uri={p.image} size={40} />
              <View style={{ flex: 1 }}><Text style={type.caption} numberOfLines={1}>{p.brand}</Text><Text style={type.label} numberOfLines={1}>{p.name}</Text></View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {linking ? (
        <View style={{ gap: 8 }}>
          <TextInput value={pasted} onChangeText={setPasted} placeholder="Paste the link to your bag" placeholderTextColor={color.ink3} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[s.input, { width: '100%' }]} />
          <View style={s.links}><TextLink label="Save" tone={color.ink} onPress={saveLink} /><TextLink label="Cancel" onPress={() => setLinking(false)} /></View>
        </View>
      ) : null}

      <View style={s.links}>
        <TextLink label="New bag" onPress={open} />
        {!linking ? <TextLink label={bag.link ? 'Change link' : product ? 'Use my own link' : 'Add my link'} onPress={() => { setPasted(bag.link ?? ''); setLinking(true) }} /> : null}
        <TextLink label="Stop" onPress={() => stopBag(pet)} />
      </View>
      {left <= 7 ? <AffiliateNote /> : null}
    </Card>
  )
}

const s = StyleSheet.create({
  card: { gap: 14, marginBottom: 12 },
  ask: { paddingVertical: 0, marginBottom: 12 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  change: { textDecorationLine: 'underline', color: color.ink },
  guess: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.bg },
  input: { ...type.body, width: 130, borderWidth: 1, borderColor: color.hairline, borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: color.surface, color: color.ink },
})
