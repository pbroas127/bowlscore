import { Brand } from '@/components/Brand'
import { router, useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Bell, CaretDown, SealWarning, X } from 'phosphor-react-native'
import { bagDays, reorderLink } from '@/components/BagCard'
import { Art, Bowls, num, portion, Tile, type ArtName } from '@/components/FitCard'
import { Mascot } from '@/components/Mascot'
import { PetHead } from '@/components/PetHead'
import { PetEditor } from '@/components/PetEditor'
import { AffiliateNote, ProductCarousel, ProductSkeleton } from '@/components/ProductCard'
import { ago, ScanRow } from '@/components/ScanRow'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, Chip, PillButton, Screen, TextLink } from '@/components/ui'
import { refreshCatalog, topRated, useCatalog, whyBetter } from '@/lib/catalog'
import { tap } from '@/lib/haptics'
import { openShop } from '@/lib/links'
import { feeding, hasCalories, weighInDue } from '@/lib/fit'
import { checkRecalls, dismissRecall, recallDate } from '@/lib/recalls'
import { askToNotify, notifyUndecided } from '@/lib/notify'
import { activePet, setState, useStore } from '@/lib/store'
import type { Pet, Recall, Scan } from '@/lib/types'
import { color, font, gradeFor, radius, type, type Grade } from '@/theme'

function RecallBanner({ recall }: { recall: Recall }) {
  const when = recallDate(recall.date)
  return (
    <View style={s.recall}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SealWarning size={22} weight="fill" color={color.bad} />
        <Text style={[type.title, { flex: 1 }]}>Recall notice for {recall.brand}</Text>
      </View>
      <Text style={type.label}>{recall.product}</Text>
      <Text style={[type.caption, { color: color.ink }]}>{[recall.reason, when].filter(Boolean).join(' · ')}</Text>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
        <TextLink label="Read the notice" tone={color.ink} onPress={() => WebBrowser.openBrowserAsync(recall.url).catch(() => {})} />
        <TextLink label="Dismiss" onPress={() => { tap('select'); dismissRecall(recall.id) }} />
      </View>
    </View>
  )
}

// Onboarding no longer asks for notifications up front. This asks once, on Home, and goes away for good either way.
function AlertsCard() {
  const asked = useStore((s) => s.alertsAsked)
  const [open, setOpen] = useState(false)
  useEffect(() => { if (!asked) notifyUndecided().then(setOpen) }, [asked])
  if (asked || !open) return null
  const done = () => setState({ alertsAsked: true })
  return (
    <View style={s.alerts}>
      <View style={s.bell}><Bell size={22} weight="fill" color={color.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text style={type.title}>Recall and bag alerts</Text>
        <Text style={type.caption}>Only when it matters.</Text>
      </View>
      <Pressable onPress={() => { tap('select'); askToNotify().finally(done) }} style={({ pressed }) => [s.reorderPill, pressed && { opacity: 0.8 }]} accessibilityRole="button"><Text style={s.reorderText}>Turn on</Text></Pressable>
      <Pressable hitSlop={12} onPress={done} accessibilityLabel="Not now"><X size={18} weight="bold" color={color.ink3} /></Pressable>
    </View>
  )
}

// Today at a glance: a bowl per meal with its portion, then water, treats and how long the bag will last.
function DailyPlan({ pet, scan, onEdit }: { pet: Pet; scan: Scan; onEdit: () => void }) {
  const plan = scan.label.isTreat ? undefined : feeding(pet, scan.label)
  const left = bagDays(pet, scan)
  const product = useCatalog()?.products.find((p) => p.id === scan.productId)
  // One next step at most, so the card stays calm. Weight fixes happen right here; the rest live on the pet page.
  const toPet = () => router.push(`/pet/${pet.id}`)
  const [nudge, art, onNudge]: [string | undefined, ArtName, () => void] = !pet.weightLb ? [`Add ${pet.name}'s weight`, 'scale', onEdit]
    : weighInDue(pet) ? [`Time to weigh ${pet.name} again`, 'scale', onEdit]
    : plan && !hasCalories(scan.label) ? ['Add calories to see cups', 'cup', toPet]
    : plan && !pet.bag ? ['Track this bag', 'bag', toPet]
    : [undefined, 'scale', onEdit]
  if (!plan && !nudge) return null
  return (
    <View style={s.plan}>
      {scan.label.isTreat ? null : <Bowls mini meals={plan?.meals ?? pet.meals ?? 2} each={plan && portion(plan).each} cat={pet.species === 'cat'} />}
      {plan ? (
        <View style={s.tiles}>
          <Tile mini art="water" value={`${plan.waterOz} oz`} word="water" />
          <Tile mini art="treat" value={`${num(plan.treatKcal)} cal`} word="treats" />
          <Tile mini art="bag" value={left != null ? `${left} ${left === 1 ? 'day' : 'days'}` : '?'} word="bag" faded={left == null} />
        </View>
      ) : null}
      {left != null && left <= 7 ? (
        <Pressable onPress={() => { tap('select'); openShop(reorderLink(pet, scan, product)) }} style={({ pressed }) => [s.reorder, pressed && { opacity: 0.8 }]} accessibilityRole="link" accessibilityLabel={`${left} days of food left. Reorder`}>
          <Art name="bag" size={26} />
          <Text style={[type.label, { flex: 1 }]}>{left ? `${left} ${left === 1 ? 'day' : 'days'} of food left` : 'Out of food'}</Text>
          <View style={s.reorderPill}><Text style={s.reorderText}>Reorder</Text></View>
        </Pressable>
      ) : null}
      {nudge ? <Pressable hitSlop={8} onPress={() => { tap('select'); onNudge() }} style={s.planRow}><Art name={art} size={24} /><Text style={[type.label, { flex: 1, textDecorationLine: 'underline' }]}>{nudge}</Text></Pressable> : null}
    </View>
  )
}

export default function Home() {
  const [draft, setDraft] = useState<Pet>()
  const pet = useStore(activePet)
  const allScans = useStore((s) => s.scans)
  const [filter, setFilter] = useState<Grade | 'All'>('All')
  const scans = allScans.filter((x) => x.petId === pet?.id)
  const current = scans.find((x) => x.id === pet?.currentScanId)
  const shown = scans.filter((x) => filter === 'All' || gradeFor(x.result.score) === filter)
  const catalog = useCatalog()
  const top = catalog && pet ? topRated(catalog.products, pet.species, pet.allergies, 8, pet) : []
  const pets = useStore((s) => s.pets)
  // One pet opens its page; two or more pick who is being fed and scanned for.
  const switchPet = () => pets.length > 1
    ? Alert.alert('Who are you feeding?', undefined, [...pets.map((p) => ({ text: p.name, onPress: () => setState({ activePetId: p.id }) })), { text: 'Cancel', style: 'cancel' as const }])
    : pet && router.push(`/pet/${pet.id}`)
  const seen = useStore((s) => s.recallsSeen)
  const recalls = useStore((s) => s.recalls).filter((r) => !seen.includes(r.id))

  // Both are throttled to once per 12 hours, so running them on every focus is cheap.
  useFocusEffect(useCallback(() => { refreshCatalog(); checkRecalls() }, []))

  return (
    <Screen scroll edges={['top']}>
      <View style={s.brandRow}>
        <Brand />
        <Pressable onPress={() => { tap('select'); switchPet() }} style={({ pressed }) => [s.who, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={pets.length > 1 ? `Feeding ${pet?.name}. Switch pet` : `Open ${pet?.name}`}>
          <Text style={type.title} numberOfLines={1}>{pet?.name ?? 'Your pet'}</Text>
          {pets.length > 1 ? <CaretDown size={14} weight="bold" color={color.ink2} /> : null}
          <View style={s.avatar}>{pet ? <PetHead pet={pet} size={36} /> : <Mascot pose="puppy-head" size={36} bob={false} />}</View>
        </Pressable>
      </View>

      <AlertsCard />
      {recalls.map((r) => <RecallBanner key={r.id} recall={r} />)}

      {current ? (
        <Pressable onPress={() => router.push(`/result/${current.id}`)} style={({ pressed }) => pressed && { transform: [{ scale: 0.985 }] }}>
          <Card style={s.currentCard}>
            <View style={s.current}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.label, { color: color.ink2 }]}>{pet?.name}'s bowl</Text>
              <Text style={type.h2} numberOfLines={2}>{current.label.productName || 'Current food'}</Text>
              <Text style={type.caption}>Scanned {ago(current.createdAt).toLowerCase()}</Text>
            </View>
            <ScoreRing score={current.result.score} size={92} stroke={9} animate={false} />
            </View>
            {pet ? <DailyPlan pet={pet} scan={current} onEdit={() => setDraft(pet)} /> : null}
          </Card>
        </Pressable>
      ) : (
        <Card style={s.empty}>
          <Mascot pose={pet?.species === 'cat' ? 'kitten-peeking' : 'puppy-sniffing'} size={150} />
          <Text style={[type.h2, { textAlign: 'center' }]}>What is in {pet?.name ?? 'the'}'s bowl?</Text>
          <Text style={[type.body, { color: color.ink2, textAlign: 'center' }]}>Scan the food you feed most days to see how it scores.</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 4 }}><PillButton label="Scan a food" onPress={() => router.push('/scan')} /></View>
        </Card>
      )}

      {top.length ? (
        <>
          <View style={s.sectionRow}>
            <Text style={[type.h2, { flex: 1 }]} numberOfLines={1}>Top rated for {pet?.name}</Text>
            <TextLink label="See all" onPress={() => router.navigate('/foods')} />
          </View>
          <ProductCarousel products={top} why={(p) => whyBetter(p)} />
        </>
      ) : !catalog ? (
        <>
          <Text style={[type.h2, s.sectionRow]} numberOfLines={1}>Top rated for {pet?.name}</Text>
          <ProductSkeleton />
        </>
      ) : null}

      {scans.length ? (
        <>
          <Text style={[type.h2, { marginTop: 32, marginBottom: 12 }]}>Recent scans</Text>
          <View style={s.filters}>{(['All', 'Excellent', 'Good', 'Poor', 'Bad'] as const).map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}</View>
          <Card style={{ paddingVertical: 2 }}>
            {shown.length ? shown.map((x, i) => <ScanRow key={x.id} scan={x} last={i === shown.length - 1} />) : <Text style={[type.body, { color: color.ink2, paddingVertical: 16 }]}>No {filter.toLowerCase()} scans yet.</Text>}
          </Card>
        </>
      ) : null}
      {top.length ? <AffiliateNote /> : null}
      <PetEditor draft={draft} setDraft={setDraft} />
    </Screen>
  )
}

const s = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8, marginBottom: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, backgroundColor: color.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: color.hairline, paddingLeft: 14, paddingRight: 4, paddingVertical: 4 },
  alerts: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.hairline, padding: 12, marginBottom: 16 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  currentCard: { padding: 20, borderRadius: 28, gap: 16 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  plan: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: color.hairline },
  tiles: { flexDirection: 'row', gap: 8 },
  reorder: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.yellowSoft, borderRadius: 14, paddingVertical: 8, paddingLeft: 10, paddingRight: 8 },
  reorderPill: { backgroundColor: color.yellow, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: color.yellowEdge },
  reorderText: { fontFamily: font.textBold, fontSize: 13, lineHeight: 17, color: color.ink },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 28 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 32, marginBottom: 12 },
  recall: { backgroundColor: color.badSoft, borderRadius: radius.card, padding: 16, gap: 4, marginBottom: 12 },
})
