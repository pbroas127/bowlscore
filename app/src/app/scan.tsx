import { CameraView, useCameraPermissions } from 'expo-camera'
import { Image } from 'expo-image'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, FadeIn, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bone, BowlFood, CaretDown, Check, Images, Lightning, X } from 'phosphor-react-native'
import { Mascot, mascotFor } from '@/components/Mascot'
import { PetHead } from '@/components/PetHead'
import { PillButton, TextLink } from '@/components/ui'
import { rescoreLabel, scanFood, ScanError, type Product, type ScanResponse } from '@/lib/api'
import { hasCalories, stageFor } from '@/lib/fit'
import { tap, tapForGrade } from '@/lib/haptics'
import { activePet, newId, saveScan, setState, updateScan, useStore } from '@/lib/store'
import type { LabelData } from '@/lib/types'
import { color, font, radius, shadow, type } from '@/theme'

type Mode = 'barcode' | 'label'
type Kind = 'food' | 'treat'
const KINDS = [['food', 'Food', BowlFood], ['treat', 'Treat', Bone]] as const
type ScanInput = { images?: string[]; barcode?: string; product?: Product }
const MAX_PHOTOS = 3 // what the server accepts in one request

async function toBase64(uri: string) {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync()
  const out = await ref.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG })
  return out.base64!
}

// A second read of the same bag fills in what the first one missed and never overwrites what it found,
// so the score can only change when a statement or the analysis was missing before.
const unknown = (v?: string) => !v || v === 'unknown' || v === 'not_found'
const mergeLabel = (old: LabelData, fresh: LabelData): LabelData => ({
  ...old,
  productName: old.productName ?? fresh.productName,
  brand: old.brand ?? fresh.brand,
  ingredients: old.ingredients.length ? old.ingredients : fresh.ingredients,
  analysis: old.analysis ?? fresh.analysis,
  calories: hasCalories(old) ? old.calories : fresh.calories,
  aafco: unknown(old.aafco) ? fresh.aafco : old.aafco,
  lifeStageClaim: unknown(old.lifeStageClaim) ? fresh.lifeStageClaim : old.lifeStageClaim,
  largeSizeGrowth: unknown(old.largeSizeGrowth) ? fresh.largeSizeGrowth : old.largeSizeGrowth,
})

// What the person sees while waiting, keyed by seconds elapsed. Label reading usually takes 3 to 15 seconds.
const statusAt = (sec: number, pet: string) =>
  sec < 3 ? 'Reading the label' : sec < 7 ? 'Checking the ingredients' : sec < 13 ? `Scoring for ${pet}` : sec < 28 ? 'Still working. Long labels take a little longer' : 'Almost there. Thanks for waiting'

// The back of a bag, drawn: the three blocks a photo has to hold.
function Guide({ onDone }: { onDone: () => void }) {
  return (
    <Animated.View entering={FadeIn} style={[s.guide, shadow]}>
      <View style={s.bag}>
        <View style={s.bagSeal} />
        {['Ingredients', 'Guaranteed analysis', 'Calories'].map((l) => (
          <View key={l} style={s.bagBlock}><Text style={s.bagLabel}>{l}</Text><View style={s.bagLine} /><View style={[s.bagLine, { width: '55%' }]} /></View>
        ))}
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={type.h2}>What to scan</Text>
        <Text style={[type.label, { color: color.ink2 }]}>Get all three in the photo. They sit together on the back or side.</Text>
        <TextLink label="Got it" tone={color.ink} onPress={() => { tap('select'); onDone() }} />
      </View>
    </Animated.View>
  )
}

export default function ScanScreen() {
  // `add` is a saved scan that wants one more photo, for the calories or life stage line the first read missed.
  const { add } = useLocalSearchParams<{ add?: string }>()
  const target = useStore((st) => st.scans.find((x) => x.id === add))
  const active = useStore(activePet)
  const pets = useStore((st) => st.pets)
  const pet = target ? pets.find((p) => p.id === target.petId) : active
  const guideSeen = useStore((st) => st.guideSeen)
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<Mode>('label')
  const [kind, setKind] = useState<Kind>(target?.label.isTreat ? 'treat' : 'food')
  const [picking, setPicking] = useState(false)
  const [guide, setGuide] = useState(false)
  // The person said food and the label reads as a treat, or the other way round: ask before saving anything.
  const [ask, setAsk] = useState<{ res: ScanResponse; photoUri?: string; fixing?: boolean; failed?: string }>()
  const [torch, setTorch] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [adding, setAdding] = useState(false) // the camera is live again to add another photo to the set
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<ScanError>()
  const camera = useRef<CameraView>(null)
  const lock = useRef(false)
  const lastInput = useRef<ScanInput>(undefined)
  const known = useRef<Product>(undefined) // named by a barcode scan, attached to the label photo that follows
  const shown = adding ? undefined : photos[photos.length - 1] // the photo in the frame; the camera is live when there is none

  // The sweep is functional progress feedback, not decoration, so it keeps running with Reduce Motion on.
  // It moves by transform against the measured frame height, which is reliable on every platform.
  const line = useSharedValue(0)
  const frameH = useSharedValue(0)
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 10 + line.value * Math.max(0, frameH.value - 23) }] }))
  useEffect(() => {
    if (!busy) { cancelAnimation(line); return }
    line.value = 0
    line.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.Never }), -1, true, undefined, ReduceMotion.Never)
    setElapsed(0)
    const started = Date.now()
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy])

  const finish = (res: ScanResponse, photoUri?: string) => {
    if (!pet) return
    const id = newId()
    saveScan({ id, petId: pet.id, createdAt: Date.now(), source: res.source, sourceUrl: res.sourceUrl, label: res.label, result: res.result, photoUri, ...(res.productId ? { productId: res.productId } : {}), ...(res.image ? { image: res.image } : {}) })
    setState({ coachSeen: true })
    tapForGrade(res.result.grade)
    router.replace(`/result/${id}?fresh=1`)
  }

  // The extra photo fills the gaps in the saved scan. A rescore is only needed when something the score reads changed.
  const absorb = async (res: ScanResponse) => {
    if (!target || !pet) return
    const old = target.label
    const label = mergeLabel(old, res.label)
    const result = label.aafco !== old.aafco || label.analysis !== old.analysis || label.ingredients !== old.ingredients ? (await rescoreLabel({ species: pet.species, lifeStage: stageFor(pet), label })).result : target.result
    updateScan(target.id, (x) => ({ ...x, label, result }))
    tap('success')
    router.back()
  }

  // Their answer wins. When it differs from what the server scored, the same label is scored again the other way, which is free and instant.
  const answer = async (isTreat: boolean) => {
    if (!ask || !pet) return
    if (isTreat === Boolean(ask.res.label.isTreat)) return finish(ask.res, ask.photoUri)
    setAsk({ ...ask, fixing: true, failed: undefined })
    try {
      const again = await rescoreLabel({ species: pet.species, lifeStage: stageFor(pet), label: { ...ask.res.label, isTreat } })
      finish({ ...ask.res, label: again.label, result: again.result }, ask.photoUri)
    } catch (e) {
      tap('warning')
      setAsk({ ...ask, fixing: false, failed: e instanceof ScanError && e.code === 'offline' ? e.message : 'We could not score it that way just now. Try again, or keep our reading.' })
    }
  }

  const run = async (input: ScanInput, photoUri?: string) => {
    if (!pet) return
    lastInput.current = input
    setBusy(true)
    setError(undefined)
    try {
      const res = await scanFood({ species: pet.species, lifeStage: stageFor(pet), product: known.current, ...input })
      if (target) return absorb(res)
      if (Boolean(res.label.isTreat) === (kind === 'treat')) return finish(res, photoUri)
      tap('light')
      setAsk({ res, photoUri })
      setBusy(false)
    } catch (e) {
      const err = e instanceof ScanError ? e : new ScanError('server', 'Something went wrong on our side. Please try again in a moment.')
      tap('warning')
      // A close up of the calorie line has no ingredients, which the server reads as an unreadable label.
      setError(target && err.code === 'unreadable' ? new ScanError('unreadable', 'We could not read that. Get the ingredients in the photo too.') : err)
      if (err.code === 'barcode_not_found') { known.current = err.product; setMode('label') } // never a dead end: fall back to a label photo
      setBusy(false)
      lock.current = false
    }
  }

  // Every photo goes in one request, so the model reads the set as one label. `saved` is the bag photo of a scan
  // that is getting one more picture: it may have left the cache since, and the read still works without it.
  const send = async (uris: string[], saved?: string) => {
    setBusy(true) // feedback starts right away, while the photos are still being prepared
    try {
      const images: string[] = []
      if (saved) await toBase64(saved).then((b) => images.push(b)).catch(() => {})
      for (const u of uris) images.push(await toBase64(u))
      run({ images }, uris[0])
    } catch {
      setBusy(false)
      setError(new ScanError('unreadable', 'We could not open that photo. Please try another one.'))
    }
  }

  const took = (uri: string) => {
    const next = [...photos, uri].slice(-MAX_PHOTOS)
    setPhotos(next)
    setAdding(false)
    // The saved photo of the bag goes along, so the ingredients are in the set and the server does not reject the read.
    if (target) send([uri], target.photoUri)
  }

  const shoot = async () => {
    if (busy || !camera.current) return
    tap('medium')
    const photo = await camera.current.takePictureAsync({ quality: 0.8 }).catch(() => undefined)
    if (photo) took(photo.uri)
  }

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    const uri = res.assets?.[0]?.uri
    if (uri) took(uri)
  }

  const retake = () => { setPhotos([]); setAdding(false); setError(undefined); lastInput.current = undefined }
  const remove = (i: number) => { tap('select'); setPhotos((p) => p.filter((_, j) => j !== i)) }

  const onBarcode = ({ data }: { data: string }) => {
    if (mode !== 'barcode' || busy || lock.current) return
    lock.current = true
    tap('medium')
    run({ barcode: data })
  }

  if (!permission) return <View style={s.root} />
  if (!permission.granted && !shown)
    return (
      <SafeAreaView style={[s.root, { backgroundColor: color.bg }]}>
        <Pressable style={s.closeLight} onPress={() => router.back()} accessibilityLabel="Close"><X size={24} weight="bold" color={color.ink} /></Pressable>
        <View style={s.primer}>
          <Mascot pose="puppy-sniffing" size={180} />
          <Text style={[type.h1, { textAlign: 'center' }]}>Let BowlScore see the label</Text>
          <Text style={[type.body, { color: color.ink2, textAlign: 'center' }]}>The camera reads the ingredients list so we can score the food. Photos are never saved on our servers.</Text>
          <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 8 }}>
            <PillButton label="Allow camera" onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} />
            <PillButton label="Choose a photo instead" variant="quiet" onPress={pick} />
          </View>
        </View>
      </SafeAreaView>
    )

  const showGuide = mode === 'label' && !shown && !busy && !ask && !target && (guide || !guideSeen)
  const review = Boolean(shown) && !busy && !ask && !error && !target

  return (
    <View style={s.root}>
      {shown ? null : (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={mode === 'barcode' ? onBarcode : undefined} />
      )}
      <SafeAreaView style={s.overlay}>
        <View style={s.topRow}>
          <Pressable style={s.round} onPress={() => router.back()} accessibilityLabel="Close"><X size={22} weight="bold" color={color.surface} /></Pressable>
          {/* Who the scan is for and what is being scanned. Locked while a scan is in flight so the answer cannot change under it. */}
          <View style={[s.topMid, (busy || ask || target) && { opacity: 0.5 }]} pointerEvents={busy || ask || target ? 'none' : 'auto'}>
            <Pressable style={s.petChip} disabled={pets.length < 2} onPress={() => { tap('select'); setPicking((p) => !p) }} accessibilityRole="button" accessibilityLabel={`Scanning for ${pet?.name}`} accessibilityHint={pets.length > 1 ? 'Choose another pet' : undefined}>
              {pet ? <PetHead pet={pet} size={24} /> : null}
              <Text style={[type.label, { color: color.surface, flexShrink: 1 }]} numberOfLines={1}>For {pet?.name}</Text>
              {pets.length > 1 ? <CaretDown size={14} weight="bold" color={color.surface} /> : null}
            </Pressable>
            <View style={s.segment}>
              {KINDS.map(([k, word, Icon]) => (
                <Pressable key={k} onPress={() => { tap('select'); setKind(k) }} style={[s.kindItem, kind === k && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: kind === k }}>
                  <Icon size={16} weight="fill" color={kind === k ? color.ink : color.surface} />
                  <Text style={[type.label, { color: kind === k ? color.ink : color.surface }]}>{word}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {shown ? <View style={{ width: 44 }} /> : (
            <Pressable style={[s.round, torch && { backgroundColor: color.yellow }]} onPress={() => setTorch((t) => !t)} accessibilityLabel="Flashlight"><Lightning size={22} weight="fill" color={torch ? color.ink : color.surface} /></Pressable>
          )}
        </View>

        {showGuide ? <Guide onDone={() => { setGuide(false); setState({ guideSeen: true }) }} /> : (
          /* With a photo, the frame grows to hold the WHOLE picture, sharp and uncropped, and the sweep covers all of it. */
          <View style={[s.frame, shown ? s.framePhoto : mode === 'barcode' && s.frameBarcode]} onLayout={(e) => { frameH.value = e.nativeEvent.layout.height }}>
            {shown ? <Image source={{ uri: shown }} style={s.photo} contentFit="contain" /> : null}
            {(['tl', 'tr', 'bl', 'br'] as const).map((k) => <View key={k} style={[s.corner, s[k], busy && { borderColor: color.green }]} />)}
            {busy ? <Animated.View style={[s.scanLine, lineStyle]} /> : null}
          </View>
        )}

        {ask ? (
          <Animated.View entering={FadeIn} style={[s.sheet, shadow]}>
            <View style={s.sheetHead}>
              <View style={s.sheetIcon}>{ask.res.label.isTreat ? <Bone size={22} weight="fill" color={color.ink} /> : <BowlFood size={22} weight="fill" color={color.ink} />}</View>
              <Text style={[type.h2, { flex: 1 }]}>{ask.res.label.isTreat ? 'This looks like a treat' : 'This looks like a food'}</Text>
            </View>
            <Text style={[type.body, { color: color.ink2 }]}>{ask.res.label.isTreat ? 'Treats are scored on ingredients only. Score it as a treat?' : 'Foods are scored on ingredients and nutrition. Score it as a food?'}</Text>
            {ask.failed ? <Text style={[type.label, { color: color.bad }]}>{ask.failed}</Text> : null}
            <PillButton label={ask.res.label.isTreat ? 'Yes, it is a treat' : 'Yes, it is a food'} disabled={ask.fixing} onPress={() => answer(Boolean(ask.res.label.isTreat))} />
            <PillButton label={ask.res.label.isTreat ? 'No, it is a food' : 'No, it is a treat'} variant="quiet" loading={ask.fixing} onPress={() => answer(!ask.res.label.isTreat)} />
          </Animated.View>
        ) : busy ? (
          <Animated.View entering={FadeIn} style={s.busy}>
            <View style={s.busyRow}>
              <ActivityIndicator color={color.surface} />
              <Text style={[type.title, { color: color.surface, flexShrink: 1 }]}>{statusAt(elapsed, pet?.name ?? 'your pet')}</Text>
            </View>
            <Text style={[type.caption, { color: 'rgba(255,255,255,0.7)' }]}>Usually 5 to 15 seconds</Text>
          </Animated.View>
        ) : error && shown ? (
          <View style={s.bottom}>
            <View style={s.error}><Text style={[type.label, { color: color.ink, textAlign: 'center' }]}>{error.message}</Text></View>
            <View style={{ alignSelf: 'stretch', paddingHorizontal: 24, gap: 12 }}>
              {lastInput.current && error.code !== 'unreadable' ? <PillButton label="Try again" onPress={() => run(lastInput.current!, photos[0])} /> : null}
              <PillButton label="Take a new photo" variant={error.code === 'unreadable' ? 'primary' : 'quiet'} onPress={retake} />
            </View>
          </View>
        ) : review ? (
          <Animated.View entering={FadeIn} style={s.bottom}>
            <View style={s.thumbs}>
              {photos.map((u, i) => (
                <View key={u} style={s.thumb}>
                  <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable style={s.thumbX} hitSlop={8} onPress={() => remove(i)} accessibilityLabel="Remove this photo"><X size={12} weight="bold" color={color.surface} /></Pressable>
                </View>
              ))}
            </View>
            <View style={{ alignSelf: 'stretch', paddingHorizontal: 24, gap: 12 }}>
              <PillButton label="Score it" onPress={() => send(photos)} />
              {photos.length < MAX_PHOTOS ? <PillButton label="Add another photo" variant="quiet" onPress={() => setAdding(true)} /> : null}
            </View>
          </Animated.View>
        ) : (
          <View style={s.bottom}>
            {error ? <View style={s.error}><Text style={[type.label, { color: color.ink, textAlign: 'center' }]}>{error.message}</Text></View> : <Text style={[type.label, s.hint]}>{target ? 'Get the calorie line and the life stage statement in the frame' : adding ? 'Get the rest of the label in the frame' : mode === 'label' ? 'Fit the label in the frame' : 'Point at the barcode'}</Text>}
            <View style={s.controls}>
              <Pressable style={s.round} onPress={pick} accessibilityLabel="Choose a photo"><Images size={22} weight="bold" color={color.surface} /></Pressable>
              {mode === 'label' ? <Pressable onPress={shoot} style={({ pressed }) => [s.shutter, pressed && { transform: [{ scale: 0.94 }] }]} accessibilityLabel="Take photo" /> : <View style={{ width: 76, height: 76 }} />}
              <View style={{ width: 44 }} />
            </View>
            {target ? null : adding ? <TextLink label="Back to the photos" tone={color.surface} onPress={() => setAdding(false)} /> : (
              <>
                <View style={s.segment}>
                  {(['label', 'barcode'] as const).map((m) => (
                    <Pressable key={m} onPress={() => { tap('select'); setMode(m); setError(undefined) }} style={[s.segItem, mode === m && s.segOn]}>
                      <Text style={[type.label, { color: mode === m ? color.ink : color.surface }]}>{m === 'label' ? 'Label' : 'Barcode'}</Text>
                    </Pressable>
                  ))}
                </View>
                {mode === 'label' && guideSeen && !showGuide ? <TextLink label="What to scan" tone={color.surface} onPress={() => setGuide(true)} /> : null}
              </>
            )}
          </View>
        )}

        {picking ? (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicking(false)} accessibilityLabel="Close the pet list" />
            <Animated.View entering={FadeIn.duration(140)} style={[s.menu, shadow, { top: insets.top + 50 }]}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {pets.map((p, i) => (
                  <Pressable key={p.id} onPress={() => { tap('select'); setState({ activePetId: p.id }); setPicking(false) }} style={({ pressed }) => [s.menuRow, i > 0 && s.menuDivider, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityState={{ selected: p.id === pet?.id }}>
                    <View style={s.menuAvatar}><PetHead pet={p} size={28} /></View>
                    <Text style={[type.title, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                    {p.id === pet?.id ? <Check size={18} weight="bold" color={color.green} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          </>
        ) : null}
      </SafeAreaView>
    </View>
  )
}

const bracket = { position: 'absolute', width: 36, height: 36, borderColor: color.surface } as const
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.scanChrome },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  topMid: { flex: 1, alignItems: 'center', gap: 6, marginHorizontal: 8, paddingTop: 4 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,17,13,0.55)', alignItems: 'center', justifyContent: 'center' },
  petChip: { height: 36, maxWidth: '100%', paddingLeft: 8, paddingRight: 16, borderRadius: 18, backgroundColor: 'rgba(20,17,13,0.55)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  menu: { position: 'absolute', alignSelf: 'center', width: 240, maxHeight: 300, backgroundColor: color.surface, borderRadius: radius.card, paddingHorizontal: 14, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  menuDivider: { borderTopWidth: 1, borderTopColor: color.hairline },
  menuAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheet: { backgroundColor: color.surface, borderRadius: radius.sheet, padding: 20, gap: 12, marginHorizontal: 12, marginBottom: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  guide: { alignSelf: 'center', width: '90%', flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: color.surface, borderRadius: radius.sheet, padding: 20 },
  bag: { width: 112, height: 160, borderRadius: 14, borderWidth: 2, borderColor: color.ink, backgroundColor: color.bg, padding: 10, gap: 8 },
  bagSeal: { height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: color.ink3, marginHorizontal: -4 },
  bagBlock: { flex: 1, borderRadius: 8, backgroundColor: color.yellowSoft, borderWidth: 1.5, borderColor: color.yellow, paddingHorizontal: 6, paddingVertical: 5, gap: 4 },
  bagLabel: { fontFamily: font.textBold, fontSize: 10, lineHeight: 12, color: color.ink },
  bagLine: { width: '80%', height: 3, borderRadius: 2, backgroundColor: color.yellowEdge, opacity: 0.4 },
  // The taller top bar costs a few points on the smallest phones, so the guide frame gives them back.
  frame: { alignSelf: 'center', width: '78%', aspectRatio: 0.78, flexShrink: 1 },
  frameBarcode: { aspectRatio: 1.7 },
  framePhoto: { flex: 1, width: '90%', aspectRatio: undefined, marginVertical: 16 },
  photo: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 12 },
  corner: bracket,
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  scanLine: { position: 'absolute', top: 0, left: 6, right: 6, height: 3, borderRadius: 2, backgroundColor: color.green },
  busy: { alignItems: 'center', gap: 6, paddingBottom: 40, paddingHorizontal: 24 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bottom: { alignItems: 'center', gap: 16, paddingBottom: 12 },
  thumbs: { flexDirection: 'row', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: color.surface, backgroundColor: color.scanChrome },
  thumbX: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(20,17,13,0.75)', alignItems: 'center', justifyContent: 'center' },
  hint: { color: color.surface, backgroundColor: 'rgba(20,17,13,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, overflow: 'hidden', marginHorizontal: 24, textAlign: 'center' },
  error: { backgroundColor: color.yellow, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 24 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 32 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: color.surface, borderWidth: 5, borderColor: 'rgba(255,255,255,0.4)' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(20,17,13,0.55)', borderRadius: radius.pill, padding: 4 },
  segItem: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: radius.pill },
  segOn: { backgroundColor: color.surface },
  closeLight: { padding: 20 },
  primer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 40 },
})
