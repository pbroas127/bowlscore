import { CameraView, useCameraPermissions } from 'expo-camera'
import { Image } from 'expo-image'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, FadeIn, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Images, Lightning, X } from 'phosphor-react-native'
import { Mascot } from '@/components/Mascot'
import { PillButton, TextLink } from '@/components/ui'
import { scanFood, ScanError } from '@/lib/api'
import { tap, tapForGrade } from '@/lib/haptics'
import { activePet, newId, saveScan, setState, useStore } from '@/lib/store'
import { color, radius, type } from '@/theme'

type Mode = 'barcode' | 'label'
type ScanInput = { images?: string[]; barcode?: string }

// ponytail: one label photo per scan. If users report missing nutrition panels, allow a second photo.
async function toBase64(uri: string) {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync()
  const out = await ref.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG })
  return out.base64!
}

// What the person sees while waiting, keyed by seconds elapsed. Label reading usually takes 3 to 15 seconds.
const statusAt = (sec: number, pet: string) =>
  sec < 3 ? 'Reading the label' : sec < 7 ? 'Checking the ingredients' : sec < 13 ? `Scoring for ${pet}` : sec < 28 ? 'Still working. Long labels take a little longer' : 'Almost there. Thanks for waiting'

export default function ScanScreen() {
  const pet = useStore(activePet)
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<Mode>('label')
  const [torch, setTorch] = useState(false)
  const [frozen, setFrozen] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<ScanError>()
  const camera = useRef<CameraView>(null)
  const lock = useRef(false)
  const lastInput = useRef<ScanInput>(undefined)

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

  const run = async (input: ScanInput, photoUri?: string) => {
    if (!pet) return
    lastInput.current = input
    setBusy(true)
    setError(undefined)
    try {
      const res = await scanFood({ species: pet.species, lifeStage: pet.stage, ...input })
      const id = newId()
      saveScan({ id, petId: pet.id, createdAt: Date.now(), source: res.source, label: res.label, result: res.result, photoUri })
      setState({ coachSeen: true })
      tapForGrade(res.result.grade)
      router.replace(`/result/${id}?fresh=1`)
    } catch (e) {
      const err = e instanceof ScanError ? e : new ScanError('server', 'Something went wrong on our side. Please try again in a moment.')
      tap('warning')
      setError(err)
      if (err.code === 'barcode_not_found') setMode('label') // never a dead end: fall back to a label photo
      setBusy(false)
      lock.current = false
    }
  }

  const sendPhoto = async (uri: string) => {
    setFrozen(uri)
    setBusy(true) // feedback starts right away, while the photo is still being prepared
    try {
      run({ images: [await toBase64(uri)] }, uri)
    } catch {
      setBusy(false)
      setError(new ScanError('unreadable', 'We could not open that photo. Please try another one.'))
    }
  }

  const shoot = async () => {
    if (busy || !camera.current) return
    tap('medium')
    const photo = await camera.current.takePictureAsync({ quality: 0.8 }).catch(() => undefined)
    if (photo) sendPhoto(photo.uri)
  }

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    const uri = res.assets?.[0]?.uri
    if (uri) sendPhoto(uri)
  }

  const retake = () => { setFrozen(undefined); setError(undefined); lastInput.current = undefined }

  const onBarcode = ({ data }: { data: string }) => {
    if (mode !== 'barcode' || busy || lock.current) return
    lock.current = true
    tap('medium')
    run({ barcode: data })
  }

  if (!permission) return <View style={s.root} />
  if (!permission.granted && !frozen)
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

  return (
    <View style={s.root}>
      {frozen ? null : (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={mode === 'barcode' ? onBarcode : undefined} />
      )}
      <SafeAreaView style={s.overlay}>
        <View style={s.topRow}>
          <Pressable style={s.round} onPress={() => router.back()} accessibilityLabel="Close"><X size={22} weight="bold" color={color.surface} /></Pressable>
          <View style={s.petChip}><Text style={[type.label, { color: color.surface }]}>For {pet?.name}</Text></View>
          {frozen ? <View style={{ width: 44 }} /> : (
            <Pressable style={[s.round, torch && { backgroundColor: color.yellow }]} onPress={() => setTorch((t) => !t)} accessibilityLabel="Flashlight"><Lightning size={22} weight="fill" color={torch ? color.ink : color.surface} /></Pressable>
          )}
        </View>

        {/* With a photo, the frame grows to hold the WHOLE picture, sharp and uncropped, and the sweep covers all of it. */}
        <View style={[s.frame, frozen ? s.framePhoto : mode === 'barcode' && s.frameBarcode]} onLayout={(e) => { frameH.value = e.nativeEvent.layout.height }}>
          {frozen ? <Image source={{ uri: frozen }} style={s.photo} contentFit="contain" /> : null}
          {(['tl', 'tr', 'bl', 'br'] as const).map((k) => <View key={k} style={[s.corner, s[k], busy && { borderColor: color.green }]} />)}
          {busy ? <Animated.View style={[s.scanLine, lineStyle]} /> : null}
        </View>

        {busy ? (
          <Animated.View entering={FadeIn} style={s.busy}>
            <View style={s.busyRow}>
              <ActivityIndicator color={color.surface} />
              <Text style={[type.title, { color: color.surface, flexShrink: 1 }]}>{statusAt(elapsed, pet?.name ?? 'your pet')}</Text>
            </View>
            <Text style={[type.caption, { color: 'rgba(255,255,255,0.7)' }]}>Usually 5 to 15 seconds</Text>
          </Animated.View>
        ) : error && frozen ? (
          <View style={s.bottom}>
            <View style={s.error}><Text style={[type.label, { color: color.ink, textAlign: 'center' }]}>{error.message}</Text></View>
            <View style={{ alignSelf: 'stretch', paddingHorizontal: 24, gap: 12 }}>
              {lastInput.current && error.code !== 'unreadable' ? <PillButton label="Try again" onPress={() => run(lastInput.current!, frozen)} /> : null}
              <PillButton label="Take a new photo" variant={error.code === 'unreadable' ? 'primary' : 'quiet'} onPress={retake} />
            </View>
          </View>
        ) : (
          <View style={s.bottom}>
            {error ? <View style={s.error}><Text style={[type.label, { color: color.ink, textAlign: 'center' }]}>{error.message}</Text></View> : <Text style={[type.label, s.hint]}>{mode === 'label' ? 'Fit the ingredients list in the frame' : 'Point at the barcode'}</Text>}
            <View style={s.controls}>
              <Pressable style={s.round} onPress={pick} accessibilityLabel="Choose a photo"><Images size={22} weight="bold" color={color.surface} /></Pressable>
              {mode === 'label' ? <Pressable onPress={shoot} style={({ pressed }) => [s.shutter, pressed && { transform: [{ scale: 0.94 }] }]} accessibilityLabel="Take photo" /> : <View style={{ width: 76, height: 76 }} />}
              <View style={{ width: 44 }} />
            </View>
            <View style={s.segment}>
              {(['label', 'barcode'] as const).map((m) => (
                <Pressable key={m} onPress={() => { tap('select'); setMode(m); setError(undefined) }} style={[s.segItem, mode === m && s.segOn]}>
                  <Text style={[type.label, { color: mode === m ? color.ink : color.surface }]}>{m === 'label' ? 'Label' : 'Barcode'}</Text>
                </Pressable>
              ))}
            </View>
            {frozen ? <TextLink label="Take a new photo" tone={color.surface} onPress={retake} /> : null}
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const bracket = { position: 'absolute', width: 36, height: 36, borderColor: color.surface } as const
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.scanChrome },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,17,13,0.55)', alignItems: 'center', justifyContent: 'center' },
  petChip: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(20,17,13,0.55)', justifyContent: 'center' },
  frame: { alignSelf: 'center', width: '78%', aspectRatio: 0.78 },
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
  hint: { color: color.surface, backgroundColor: 'rgba(20,17,13,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, overflow: 'hidden' },
  error: { backgroundColor: color.yellow, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 24 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 32 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: color.surface, borderWidth: 5, borderColor: 'rgba(255,255,255,0.4)' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(20,17,13,0.55)', borderRadius: radius.pill, padding: 4 },
  segItem: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: radius.pill },
  segOn: { backgroundColor: color.surface },
  closeLight: { padding: 20 },
  primer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 40 },
})
