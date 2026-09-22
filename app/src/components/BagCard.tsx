// The open bag of a pet's main food: days left, a bar, and a reorder button that lands right when people need it.
import DateTimePicker from '@react-native-community/datetimepicker'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { CalendarBlank, Package } from 'phosphor-react-native'
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
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0)
const daysAgo = (t: number) => Math.round((midnight(Date.now()) - midnight(t)) / DAY)
const agoText = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`)

// The day the bag was opened: today back to a year ago. The native date wheel on a phone, typed on the web.
function OpenedField({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const now = new Date()
  const min = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const pick = (d: Date) => onChange(midnight(Math.max(min.getTime(), Math.min(now.getTime(), d.getTime()))))
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => { tap('select'); setOpen((o) => !o) }} accessibilityRole="button" accessibilityLabel="Day the bag was opened" style={s.date}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>Opened {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          <Text style={type.caption}>{agoText(daysAgo(value))}</Text>
        </View>
        <CalendarBlank size={22} weight="bold" color={color.ink2} />
      </Pressable>
      {open ? (
        Platform.OS === 'web' ? (
          <TextInput value={text} onChangeText={(t) => { setText(t); const m = /^(\d{4})\D(\d{1,2})\D(\d{1,2})$/.exec(t.trim()); if (m) pick(new Date(+m[1], +m[2] - 1, +m[3])) }} placeholder="YYYY MM DD" placeholderTextColor={color.ink3} style={[s.input, { width: '100%' }]} accessibilityLabel="Day opened, year month day" />
        ) : (
          <DateTimePicker value={new Date(value)} mode="date" display="spinner" maximumDate={now} minimumDate={min} onChange={(_e, d) => d && pick(d)} style={{ alignSelf: 'center' }} />
        )
      ) : null}
    </View>
  )
}

// Days of food left in the tracked bag of this scan, for the Home card. Undefined when it is not tracked.
export const bagDays = (pet: Pet, scan?: Scan) => {
  const grams = scan && pet.bag?.scanId === scan.id ? gramsPerDay(pet, scan.label) : undefined
  return grams && pet.bag ? bagStatus(pet.bag, grams).left : undefined
}

export function BagCard({ pet, scan, onEditPet, onEditFood }: { pet: Pet; scan: Scan; onEditPet: () => void; onEditFood: () => void }) {
  const [picking, setPicking] = useState(false)
  const [size, setSize] = useState<number>()
  const [custom, setCustom] = useState('')
  const [opened, setOpened] = useState(() => midnight(Date.now()))
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

  const sizes = product?.sizes?.map((b) => b.lb) ?? SIZES
  // "Change" reopens with what was saved; "New bag" starts from today.
  const open = (keep: boolean) => {
    const lb = keep ? bag?.lb : undefined
    setSize(lb); setCustom(lb && !sizes.includes(lb) ? String(lb) : '')
    setOpened(midnight(keep && bag ? bag.openedAt : Date.now())); setPicking(true)
  }
  const lb = Number(custom) > 0 ? Math.min(100, Number(custom)) : size
  const start = () => {
    if (!lb) return
    tap('success')
    setPicking(false); setCustom('')
    startBag(pet, scan, lb, opened + 12 * 3_600_000) // noon of that day, so "today" never reads as tomorrow
  }

  if (picking)
    return (
      <Card style={s.card}>
        <Text style={type.title}>How big is the bag?</Text>
        <View style={s.chips}>{sizes.map((n) => <Chip key={n} label={`${n} lb`} selected={!custom && size === n} onPress={() => { setSize(n); setCustom('') }} />)}</View>
        <View style={s.customRow}>
          <TextInput value={custom} onChangeText={(t) => setCustom(t.replace(/[^\d.]/g, '').slice(0, 5))} placeholder="Other size" placeholderTextColor={color.ink3} keyboardType="decimal-pad" style={s.input} accessibilityLabel="Bag size in pounds" />
          <Text style={[type.label, { color: color.ink2 }]}>lb</Text>
        </View>
        <OpenedField value={opened} onChange={setOpened} />
        <PillButton label="Start tracking" disabled={!lb} onPress={start} />
        <View style={{ alignItems: 'center' }}><TextLink label="Cancel" onPress={() => setPicking(false)} /></View>
      </Card>
    )

  if (!bag) return <Card style={s.ask}><ActionRow last label="Track this bag" icon={<Package size={22} weight="bold" color={color.ink} />} onPress={() => open(false)} /></Card>

  const { total, left } = bagStatus(bag, grams)
  const openedDays = daysAgo(bag.openedAt)
  // Not in our catalog and no link yet: offer the closest catalog foods, or a link of their own.
  const guesses = !product && !bag.link && catalog ? closestProducts(catalog, scan.label, pet.species) : []
  const saveLink = () => { const link = ownLink(pasted); if (!link) return; tap('success'); setBagLink(pet, link); setLinking(false); setPasted('') }

  return (
    <Card style={s.card}>
      <View>
        <Text style={[type.label, { color: color.ink2 }]}>{pet.name}'s bag</Text>
        <Text style={type.h1}>{left ? `About ${days(left)} left` : 'Probably empty by now'}</Text>
        <Pressable onPress={() => open(true)} hitSlop={6}><Text style={[type.body, { color: color.ink2 }]}>{`${bag.lb} lb, opened ${openedDays ? `${days(openedDays)} ago` : 'today'}`} <Text style={s.change}>Change</Text></Text></Pressable>
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
        <TextLink label="New bag" onPress={() => open(false)} />
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
  date: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16, paddingVertical: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  change: { textDecorationLine: 'underline', color: color.ink },
  guess: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.bg },
  input: { ...type.body, width: 130, borderWidth: 1, borderColor: color.hairline, borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: color.surface, color: color.ink },
})
