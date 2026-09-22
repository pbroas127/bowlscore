// A catalog product: the same report as a scan result, with shop buttons in place of the pantry actions.
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ArrowsLeftRight, CalendarCheck, LockSimple } from 'phosphor-react-native'
import { FeedingCard, FitCard } from '@/components/FitCard'
import { FoodHero, FoodReport } from '@/components/FoodReport'
import { PetEditor } from '@/components/PetEditor'
import { suggestedSize, Variants } from '@/components/Variants'
import { AffiliateNote, ProductPhoto, ProteinTag } from '@/components/ProductCard'
import { ActionRow, Card, EmptyState, PillButton } from '@/components/ui'
import { claimOf, proteinOf, refreshCatalog, useCatalog } from '@/lib/catalog'
import { tap } from '@/lib/haptics'
import { openShop, productLinks, tagged } from '@/lib/links'
import { usePro } from '@/lib/purchases'
import { activePet, useStore } from '@/lib/store'
import { startPlan } from '@/lib/switchPlan'
import type { BagSize, Pet } from '@/lib/types'
import { color, gutter, shadow, type } from '@/theme'

export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const all = useCatalog()?.products
  const product = all?.find((p) => p.id === id)
  // Free mode (the paywall's close button): the report and the shop buttons, nothing personal.
  const pro = usePro()
  const stored = useStore(activePet)
  const pet = pro ? stored : undefined
  const hasFood = useStore((st) => Boolean(pet?.currentScanId && st.scans.some((x) => x.id === pet.currentScanId)))
  const [starting, setStarting] = useState(false)
  const [draft, setDraft] = useState<Pet>()
  const [picked, setPicked] = useState<BagSize>()
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const nav = <View style={s.nav}><Pressable hitSlop={12} onPress={back} accessibilityLabel="Back" style={({ pressed }) => pressed && { opacity: 0.5 }}><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable></View>

  if (!product)
    return (
      <SafeAreaView style={s.root}>
        {nav}
        <View style={{ padding: gutter }}><EmptyState pose="puppy-sniffing" title="We could not find this food" body="The catalog may need a connection to load." action={<PillButton label="Try again" onPress={() => refreshCatalog(true)} />} /></View>
      </SafeAreaView>
    )

  const name = pet?.name ?? 'your pet'
  const links = productLinks(product)
  // The chosen size, else the one that suits this pet. Shop goes straight to that exact bag when we know its listing.
  const size = (picked && product.sizes?.some((b) => b.label === picked.label) ? picked : undefined) ?? suggestedSize(product, pet)
  const amazon = size?.url ? tagged(size.url) : links.amazon
  const shop = (url: string) => { tap('select'); openShop(url) }
  const plan = async () => {
    if (!pet) return
    setStarting(true)
    await startPlan(pet, product)
    tap('success')
    setStarting(false)
    router.push(`/pet/${pet.id}`)
  }

  // Replacing a plan cancels its reminders, so ask first. Treats and food for the other species are not something to switch to.
  const askPlan = () => (pet?.switchPlan ? Alert.alert('Replace the current switch plan?', `${name} is already moving to ${pet.switchPlan.name}.`, [{ text: 'Keep it', style: 'cancel' }, { text: 'Replace', onPress: plan }]) : plan())
  const canPlan = pet?.species === product.species && product.form !== 'treat'
  const newProtein = canPlan && Boolean(pet?.protein) && Boolean(proteinOf(product.label.ingredients)) && proteinOf(product.label.ingredients) !== pet?.protein

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {nav}
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: links.chewy ? 270 : 200 }} showsVerticalScrollIndicator={false}>
        {product.image ? <View style={{ marginBottom: 16 }}><ProductPhoto uri={product.image} size="100%" height={220} /></View> : null}
        <View style={{ marginBottom: 8 }}><ProteinTag product={product} /></View>
        <FoodHero name={product.name} subtitle={[product.brand, pet?.species === product.species ? `Scored for ${name}` : `Made for ${product.species === 'cat' ? 'cats' : 'dogs'}`].join(' · ')} score={product.result.score} />
        <Variants product={product} all={all ?? []} pet={pet} size={size} onSize={setPicked} />
        <FoodReport label={product.label} result={product.result} species={product.species} petName={name} allergies={pet?.species === product.species ? pet.allergies : undefined}
          top={!pro ? <Card style={{ paddingVertical: 0, marginBottom: 12 }}><ActionRow last label={`See if it fits ${stored?.name ?? "your pet"}`} hint="Fit, feeding and bag tracking" icon={<LockSimple size={22} weight="bold" color={color.ink} />} onPress={() => router.push('/paywall?from=free')} /></Card>
            : pet?.species === product.species ? <><FitCard pet={pet} label={product.label} claim={claimOf(product)} onEdit={() => setDraft(pet)} /><FeedingCard pet={pet} label={product.label} onEdit={() => setDraft(pet)} /></> : null}>
          {pro && (hasFood || canPlan) ? (
            <Card style={{ paddingVertical: 0, marginTop: 24 }}>
              {hasFood ? <ActionRow label={`Compare with ${name}'s food`} icon={<ArrowsLeftRight size={22} weight="bold" color={color.ink} />} onPress={() => router.push(`/compare?a=${pet?.currentScanId}&b=product:${product.id}`)} last={!canPlan} /> : null}
              {canPlan ? <ActionRow label="Start a switch plan" hint={starting ? 'Setting up the reminders' : 'Over 7 days, with reminders'} icon={<CalendarCheck size={22} weight="bold" color={color.ink} />} onPress={() => { if (!starting) askPlan() }} last /> : null}
            </Card>
          ) : null}
          {pro && newProtein ? <Text style={[type.caption, { marginTop: 8 }]}>New protein. Switch over 7 days to go easy on the stomach.</Text> : null}
        </FoodReport>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[s.sticky, shadow]}>
        <PillButton label={size ? `Shop ${size.label} on Amazon` : 'Shop on Amazon'} onPress={() => shop(amazon)} />
        {links.chewy ? <PillButton label="Shop on Chewy" variant="quiet" onPress={() => shop(links.chewy!)} /> : null}
        <AffiliateNote center />
      </SafeAreaView>
      <PetEditor draft={draft} setDraft={setDraft} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  nav: { flexDirection: 'row', paddingHorizontal: gutter, height: 44, alignItems: 'center' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.hairline, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8, gap: 10 },
})
