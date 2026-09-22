import { Brand } from '@/components/Brand'
import { router, useLocalSearchParams } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, ArrowsLeftRight, Check, Export, PencilSimple, ShoppingCart } from 'phosphor-react-native'
import { FeedingCard, FitCard } from '@/components/FitCard'
import { FoodEditor } from '@/components/FoodEditor'
import { FoodHero, FoodReport, Notice, sectionTitle } from '@/components/FoodReport'
import { PetEditor } from '@/components/PetEditor'
import { AffiliateNote, ProductCarousel, ProductSkeleton } from '@/components/ProductCard'
import { ShareCard, shareScoreCard } from '@/components/ShareCard'
import { ActionRow, Card, PillButton, TextLink } from '@/components/ui'
import { formOf, proteinOf, recommend, useCatalog, whyBetter } from '@/lib/catalog'
import { hasCalories, stageFor } from '@/lib/fit'
import { SITE } from '@/lib/links'
import { checkRecalls } from '@/lib/recalls'
import { getState, setState, updatePet, useStore } from '@/lib/store'
import type { LabelData, Pet } from '@/lib/types'
import { color, gutter, shadow, type } from '@/theme'

export default function Result() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>()
  const scan = useStore((st) => st.scans.find((x) => x.id === id))
  const pet = useStore((st) => st.pets.find((p) => p.id === scan?.petId))
  const catalog = useCatalog()
  const [ringDone, setRingDone] = useState(!fresh)
  const card = useRef<View>(null)
  const [draft, setDraft] = useState<Pet>()
  const [food, setFood] = useState<LabelData>()

  // Ask for a rating only after someone has seen real value: their third scan, and a good one.
  useEffect(() => {
    const st = getState()
    if (fresh && scan && scan.result.score >= 50 && st.scans.length >= 3 && st.ratingAsks < 1) {
      const t = setTimeout(async () => { if (await StoreReview.isAvailableAsync().catch(() => false)) { StoreReview.requestReview().catch(() => {}); setState({ ratingAsks: st.ratingAsks + 1 }) } }, 2600)
      return () => clearTimeout(t)
    }
  }, [fresh, scan])

  if (!scan) return <SafeAreaView style={s.root}><View style={{ padding: gutter }}><TextLink label="Back" onPress={() => router.back()} /></View></SafeAreaView>

  const { label, result } = scan
  const name = pet?.name ?? 'your pet'
  const isCurrent = pet?.currentScanId === scan.id
  const isTreat = Boolean(pet?.treatScanIds.includes(scan.id))
  const own = catalog?.products.find((p) => p.id === scan.productId)
  const picks = catalog ? recommend(catalog.products, { species: pet?.species ?? 'dog', stage: pet && stageFor(pet), form: formOf(label), allergies: pet?.allergies, currentScore: result.score, excludeId: scan.productId, pet }) : []
  // What the label did not show, with a way to add it. Missing calories already get the big button in the feeding card,
  // so this row is only for the life stage statement (treats are not made for a life stage).
  const missing = [!label.isTreat && (!label.lifeStageClaim || label.lifeStageClaim === 'unknown') ? 'Life stage statement' : ''].filter(Boolean)
  const missingLine = missing.length ? `${missing[0][0].toUpperCase()}${missing.join(' and ').slice(1)} not found` : undefined

  const share = () => shareScoreCard(card, `${label.productName || `${name}'s food`} scored ${result.score} out of 100 on BowlScore. ${SITE.home}`)
  // A food is the main food or a treat, never both. Tapping the active one again clears it.
  const place = (as: 'main' | 'treat') => {
    updatePet(pet?.id, ({ currentScanId, ...p }) => ({
      ...p,
      ...(as === 'main' ? (isCurrent ? {} : { currentScanId: scan.id, protein: proteinOf(label.ingredients) ?? p.protein }) : currentScanId && currentScanId !== scan.id ? { currentScanId } : {}),
      treatScanIds: as === 'treat' && !isTreat ? [...p.treatScanIds, scan.id] : p.treatScanIds.filter((t) => t !== scan.id),
    }))
    checkRecalls() // the pantry changed, so its brands may have too
  }
  const mainButton = <PillButton key="main" label={isCurrent ? `This is ${name}'s food` : `Set as ${name}'s food`} variant={isCurrent || label.isTreat ? 'quiet' : 'primary'} icon={isCurrent ? <Check size={20} weight="bold" color={color.green} /> : undefined} onPress={() => place('main')} />
  const treatButton = <PillButton key="treat" label={isTreat ? `One of ${name}'s treats` : 'Save as a treat'} variant={isTreat || !label.isTreat ? 'quiet' : 'primary'} icon={isTreat ? <Check size={20} weight="bold" color={color.green} /> : undefined} onPress={() => place('treat')} />

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* The share card has to be really drawn to be captured, so it sits under an opaque cover instead of off screen. */}
      <View style={s.stage} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><ShareCard cardRef={card} label={label} result={result} /></View>
      <View style={s.cover} pointerEvents="none" />

      <View style={s.nav}>
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Back"><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
        <Brand size={24} />
        <Pressable hitSlop={12} onPress={share} accessibilityLabel="Share"><Export size={24} weight="bold" color={color.ink} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 210 }} showsVerticalScrollIndicator={false}>
        <FoodHero image={scan.image} name={label.productName || 'Scanned food'} subtitle={[label.brand, `Scored for ${name}`].filter(Boolean).join(' · ')} score={result.score} animate={Boolean(fresh)} onDone={() => setRingDone(true)} />
        {scan.source === 'web' ? <Notice tone="info"><Text style={[type.label, { flex: 1 }]}>Scored from the ingredient list published for this product. Recipes change, so check it against your bag or snap the label.</Text></Notice> : null}

        <FoodReport label={label} result={result} species={pet?.species ?? 'dog'} petName={name} allergies={pet?.allergies} show={ringDone} stagger top={pet ? <>
          <FitCard pet={pet} label={label} onEdit={() => setDraft(pet)} />
          <FeedingCard pet={pet} label={label} onEdit={() => setDraft(pet)} onAddCalories={() => setFood(label)} />
          {missingLine && scan.source !== 'sample' ? (
            <Card style={s.missing}>
              <Text style={[type.label, { color: color.ink2, flex: 1 }]}>{missingLine}</Text>
              <TextLink label="Add a photo" tone={color.ink} onPress={() => router.push(`/scan?add=${scan.id}`)} />
              <TextLink label="Type it in" tone={color.ink} onPress={() => setFood(label)} />
            </Card>
          ) : null}
        </> : null}>
          {picks.length ? (
            <>
              <Text style={sectionTitle}>Better picks for {name}</Text>
              <ProductCarousel products={picks} why={(p) => whyBetter(p, scan)} />
            </>
          ) : !catalog ? (
            <>
              <Text style={sectionTitle}>Better picks for {name}</Text>
              <ProductSkeleton />
            </>
          ) : null}
          <Card style={{ paddingVertical: 0, marginTop: 24 }}>
            {own ? <ActionRow label="Shop this food" icon={<ShoppingCart size={22} weight="bold" color={color.ink} />} onPress={() => router.push(`/product/${own.id}`)} /> : null}
            <ActionRow label="Compare with another food" icon={<ArrowsLeftRight size={22} weight="bold" color={color.ink} />} onPress={() => router.push(`/compare?a=${scan.id}`)} />
            <ActionRow label="Edit details" icon={<PencilSimple size={22} weight="bold" color={color.ink} />} onPress={() => setFood(label)} last />
          </Card>
          {picks.length || own ? <AffiliateNote /> : null}
        </FoodReport>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[s.sticky, shadow]}>
        {label.isTreat ? [treatButton, mainButton] : [mainButton, treatButton]}
      </SafeAreaView>
      <PetEditor draft={draft} setDraft={setDraft} />
      <FoodEditor scan={scan} pet={pet} draft={food} setDraft={setFood} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  stage: { position: 'absolute', top: 0, left: 0 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: gutter, height: 44, alignItems: 'center' },
  missing: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingVertical: 12, marginBottom: 12 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.hairline, paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 8, gap: 10 },
})
