// The open bag of a pet's main food: days left, a bar, and a reorder button that lands right when people need it.
import DateTimePicker from '@react-native-community/datetimepicker'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { CalendarBlank, CaretRight, CheckCircle, Clock, Package, WarningCircle } from 'phosphor-react-native'
import { AffiliateNote, ProductPhoto } from '@/components/ProductCard'
import { ActionRow, Card, Chip, PillButton, TextLink } from '@/components/ui'
import { suggestedSize } from '@/components/Variants'
import { setBagLink, startBag, stopBag } from '@/lib/bag'
import { closestProducts, recommend, useCatalog } from '@/lib/catalog'
import { bagStatus, gramsPerDay } from '@/lib/fit'
import { tap } from '@/lib/haptics'
import { openShop, ownLink, shopLink, tagged } from '@/lib/links'
import { updateScan } from '@/lib/store'
import type { CatalogProduct, Pet, Scan } from '@/lib/types'
import { color, font, radius, type } from '@/theme'

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

type BagState = 'ok' | 'low' | 'out'
const STATE = {
  ok: { word: 'Plenty left', Icon: CheckCircle, ink: '#1B8A4C', line: color.green },
  low: { word: 'Running low', Icon: Clock, ink: '#A86E00', line: '#E8A317' },
  out: { word: 'Probably empty', Icon: WarningCircle, ink: '#C8372E', line: color.bad },
} as const

// Where Reorder goes: the person's own link first, then the exact listing in the size that suits the pet, else an Amazon search.
export const reorderLink = (pet: Pet, scan: Scan, product?: CatalogProduct) =>
  (pet.bag?.scanId === scan.id ? pet.bag.link : undefined) ??
  (product ? tagged(suggestedSize(product, pet)?.url ?? product.links.amazon) : shopLink(`${scan.label.brand ?? ''} ${scan.label.productName ?? ''}`.trim(), pet.species))

// The bag's own photo, greyed from the top down as it empties, with a dashed fill line in the state color.
function BagPhoto({ uri, empty, tone }: { uri?: string | null; empty: number; tone: string }) {
  const top = `${Math.round(Math.min(1, Math.max(0, empty)) * 100)}%` as const
  return (
    <View style={s.pack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={uri ? { uri } : require('../../assets/icons/food-bag.png')} style={s.packImg} contentFit="contain" />
      <View style={[s.drain, { height: top }]} />
      <View style={[s.fillLine, { top }]}>{Array.from({ length: 9 }, (_, i) => <View key={i} style={[s.dash, { backgroundColor: tone }]} />)}</View>
    </View>
  )
}

// Quiet while the bag is full, yellow when it runs low, and a slow pulse once it is empty.
function ReorderButton({ state, photo, title, sub, onPress }: { state: BagState; photo?: string | null; title: string; sub: string; onPress: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (state !== 'out') return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [state, pulse])
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] })
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} style={({ pressed }) => [s.reorder, state === 'ok' ? s.reorderQuiet : s.reorderLoud, pressed && { opacity: 0.85 }]} accessibilityRole="link" accessibilityLabel={`${title}. ${sub}`}>
        <View style={s.reorderThumb}><ProductPhoto uri={photo} size={38} height={44} /></View>
        <View style={{ flex: 1 }}><Text style={[s.reorderTitle, state === 'ok' && { fontSize: 15 }]}>{title}</Text><Text style={s.reorderSub} numberOfLines={1}>{sub}</Text></View>
        <CaretRight size={18} weight="bold" color={color.ink} />
      </Pressable>
    </Animated.View>
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
  const reorder = reorderLink(pet, scan, product)
  const onAmazon = /amazon\./i.test(reorder)

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
    startBag(pet, scan, lb, opened + 12 * 3_600_000, reorder) // noon of that day, so "today" never reads as tomorrow
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

  const state: BagState = left > 7 ? 'ok' : left > 0 ? 'low' : 'out'
  const tone = STATE[state]
  const photo = product?.image ?? scan.image
  const orderBy = new Date(bag.openedAt + (total - 5) * DAY)
  const orderText = left <= 5 ? 'Order today' : `Order by ${orderBy.toLocaleDateString('en-US', { weekday: 'short' })}`
  // When the bag runs low on a poor food, the best catalog food for this pet sits right under reorder.
  const better = state !== 'ok' && catalog && scan.result.score < 70 ? recommend(catalog, { species: pet.species, stage: pet.stage, allergies: pet.allergies, currentScore: scan.result.score, excludeId: product?.id, pet })[0] : undefined
  const buy = () => { tap('select'); openShop(reorder) }
  const title = state === 'ok' ? 'Reorder early' : state === 'low' ? (onAmazon ? 'Reorder on Amazon' : 'Reorder') : 'Reorder now'
  const sub = [state === 'out' ? product?.brand : 'Same bag', `${bag.lb} lb`, onAmazon ? 'Amazon' : undefined].filter(Boolean).join(' · ')
  const openedText = openedDays ? new Date(bag.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'today'

  return (
    <Card style={s.card}>
      <View style={s.top}>
        <BagPhoto uri={photo} empty={1 - left / total} tone={tone.line} />
        <View style={{ flex: 1 }}>
          <View accessible accessibilityLabel={`${days(left)} left in ${pet.name}'s bag. ${tone.word}.`}>
            <Text style={s.num}>{left}<Text style={s.numUnit}>{left === 1 ? ' day left' : ' days left'}</Text></Text>
            <View style={s.state}><tone.Icon size={16} weight="bold" color={tone.ink} /><Text style={[s.stateWord, { color: tone.ink }]}>{tone.word}</Text></View>
          </View>
          {state === 'low' ? <Text style={s.meta}><Text style={s.metaStrong}>{orderText}</Text> to arrive in time</Text> : null}
          <Pressable onPress={() => open(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${bag.lb} pound bag, opened ${openedText}. Change`}>
            <Text style={s.meta}>{`${bag.lb} lb · opened ${openedText} · `}<Text style={s.change}>Change</Text></Text>
          </Pressable>
        </View>
      </View>

      <ReorderButton state={state} photo={photo} title={title} sub={sub} onPress={buy} />

      {better ? (
        <Pressable onPress={() => { tap('select'); router.push(`/product/${better.id}`) }} style={({ pressed }) => [s.better, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Better pick for ${pet.name}: ${better.brand} ${better.name}, scores ${better.result.score}`}>
          <ProductPhoto uri={better.image} size={44} height={52} />
          <View style={{ flex: 1 }}><Text style={s.betterEyebrow}>Better pick for {pet.name}</Text><Text style={type.label} numberOfLines={2}>{better.brand} {better.name}</Text></View>
          <View style={s.betterScore}><Text style={s.betterScoreText}>{better.result.score}</Text></View>
        </Pressable>
      ) : null}
      {state === 'out' ? <View style={{ alignItems: 'center' }}><TextLink label="Already restocked? Start new bag" tone={color.ink} onPress={() => { tap('success'); startBag(pet, scan, bag.lb, Date.now(), reorder) }} /></View> : null}

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
      <AffiliateNote />
    </Card>
  )
}

const s = StyleSheet.create({
  card: { gap: 14, marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pack: { width: 88, height: 112, borderRadius: radius.chip, backgroundColor: '#FBF5EA', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  packImg: { width: 80, height: 104 },
  drain: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(251, 245, 234, 0.84)' },
  fillLine: { position: 'absolute', left: 4, right: 4, height: 2, marginTop: -1, flexDirection: 'row', justifyContent: 'space-between' },
  dash: { width: 6, height: 2, borderRadius: 1 },
  num: { fontFamily: font.display, fontSize: 44, lineHeight: 48, letterSpacing: -1, color: color.ink, fontVariant: ['tabular-nums'] },
  numUnit: { fontFamily: font.heading, fontSize: 19, letterSpacing: 0, color: color.ink2 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  stateWord: { fontFamily: font.textBold, fontSize: 14, lineHeight: 18 },
  meta: { ...type.caption, marginTop: 6 },
  metaStrong: { fontFamily: font.textBold, color: color.ink },
  reorder: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 9, paddingLeft: 9, paddingRight: 14 },
  reorderLoud: { backgroundColor: color.yellow, borderBottomWidth: 3, borderBottomColor: color.yellowEdge },
  reorderQuiet: { borderWidth: 1.5, borderColor: color.hairline },
  reorderThumb: { backgroundColor: color.surface, borderRadius: 10 },
  reorderTitle: { fontFamily: font.textBold, fontSize: 16, lineHeight: 21, color: color.ink },
  reorderSub: { ...type.caption, fontSize: 12.5, lineHeight: 16, color: color.ink },
  better: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.greenSoft, borderRadius: 16, padding: 10 },
  betterEyebrow: { fontFamily: font.textBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase', color: '#1B8A4C' },
  betterScore: { width: 42, height: 42, borderRadius: 21, borderWidth: 3.5, borderColor: color.green, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  betterScoreText: { fontFamily: font.display, fontSize: 16, color: color.ink },
  ask: { paddingVertical: 0, marginBottom: 12 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16, paddingVertical: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  change: { fontFamily: font.textBold, color: color.ink, textDecorationLine: 'underline' },
  guess: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: radius.chip, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.bg },
  input: { ...type.body, width: 130, borderWidth: 1, borderColor: color.hairline, borderRadius: radius.chip, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: color.surface, color: color.ink },
})
