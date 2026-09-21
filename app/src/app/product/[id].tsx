// A catalog product: the same report as a scan result, with shop buttons in place of the pantry actions.
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ArrowsLeftRight, CalendarCheck } from 'phosphor-react-native'
import { FoodHero, FoodReport } from '@/components/FoodReport'
import { AffiliateNote, ProductPhoto } from '@/components/ProductCard'
import { ActionRow, Card, EmptyState, PillButton } from '@/components/ui'
import { refreshCatalog, useCatalog } from '@/lib/catalog'
import { tap } from '@/lib/haptics'
import { productLinks } from '@/lib/links'
import { activePet, useStore } from '@/lib/store'
import { startPlan } from '@/lib/switchPlan'
import { color, gutter, shadow } from '@/theme'

export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const product = useCatalog()?.products.find((p) => p.id === id)
  const pet = useStore(activePet)
  const hasFood = useStore((st) => Boolean(pet?.currentScanId && st.scans.some((x) => x.id === pet.currentScanId)))
  const [starting, setStarting] = useState(false)
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
  const shop = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {})
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

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {nav}
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: links.chewy ? 270 : 200 }} showsVerticalScrollIndicator={false}>
        {product.image ? <View style={{ marginBottom: 16 }}><ProductPhoto uri={product.image} size="100%" height={220} /></View> : null}
        <FoodHero name={product.name} subtitle={[product.brand, pet?.species === product.species ? `Scored for ${name}` : `Made for ${product.species === 'cat' ? 'cats' : 'dogs'}`].join(' · ')} score={product.result.score} />
        <FoodReport label={product.label} result={product.result} species={product.species} petName={name} allergies={pet?.species === product.species ? pet.allergies : undefined}>
          {hasFood || canPlan ? (
            <Card style={{ paddingVertical: 0, marginTop: 24 }}>
              {hasFood ? <ActionRow label={`Compare with ${name}'s food`} hint="Side by side" icon={<ArrowsLeftRight size={22} weight="bold" color={color.ink} />} onPress={() => router.push(`/compare?a=${pet?.currentScanId}&b=product:${product.id}`)} last={!canPlan} /> : null}
              {canPlan ? <ActionRow label="Start a switch plan" hint={starting ? 'Setting up the reminders' : `Move ${name} over in 7 days, with a reminder for each step`} icon={<CalendarCheck size={22} weight="bold" color={color.ink} />} onPress={() => { if (!starting) askPlan() }} last /> : null}
            </Card>
          ) : null}
        </FoodReport>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[s.sticky, shadow]}>
        <PillButton label="Shop on Amazon" onPress={() => shop(links.amazon)} />
        {links.chewy ? <PillButton label="Shop on Chewy" variant="quiet" onPress={() => shop(links.chewy!)} /> : null}
        <AffiliateNote center />
      </SafeAreaView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  nav: { flexDirection: 'row', paddingHorizontal: gutter, height: 44, alignItems: 'center' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.hairline, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8, gap: 10 },
})
