import { Image } from 'expo-image'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { ArrowLeft, Bell, Cat, Check, Dog, Heart, MagnifyingGlass, PawPrint, Scan, ShieldCheck, Sparkle } from 'phosphor-react-native'
import { FlagRow } from '@/components/FlagRow'
import { Mascot, mascotFor } from '@/components/Mascot'
import { ScoreRing } from '@/components/ScoreRing'
import { Card, Chip, OptionRow, PillButton, ProgressBar, Screen, TextLink } from '@/components/ui'
import { tap, tapForGrade } from '@/lib/haptics'
import { restore } from '@/lib/purchases'
import { SAMPLE_POOR } from '@/lib/sample'
import { finishQuiz, setQuiz, setState, useStore, type Quiz } from '@/lib/store'
import { color, radius, type } from '@/theme'

type StepProps = { quiz: Quiz; next: () => void; pet: string }

const STEPS: ((p: StepProps) => ReactNode)[] = [Welcome, PetType, PetName, Stage, Size, FoodType, HeardFrom, Concerns, Allergies, Fact, Confidence, Goal, Trust, DemoScan, NotifyPrimer, Building, Reveal, Recap]

export default function Onboarding() {
  const quiz = useStore((s) => s.quiz)
  const step = Math.min(quiz.step, STEPS.length - 1)
  const pet = quiz.name?.trim() || 'your pet'

  const go = (to: number) => setQuiz({ step: to })
  const next = () => {
    let to = step + 1
    if (STEPS[to] === Size && quiz.petType === 'cat') to++ // cats skip the size question
    if (to >= STEPS.length) {
      finishQuiz()
      setState({ onboarded: true })
      return router.replace('/paywall')
    }
    go(to)
  }
  const back = () => {
    let to = step - 1
    if (STEPS[to] === Size && quiz.petType === 'cat') to--
    go(Math.max(0, to))
  }

  const Step = STEPS[step]
  const chromeless = Step === Welcome || Step === Building
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Screen edges={['top', 'bottom']} style={{ paddingHorizontal: 0 }}>
        {chromeless ? null : (
          <View style={s.header}>
            <Pressable hitSlop={16} onPress={back} accessibilityLabel="Back"><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
            <ProgressBar value={step / (STEPS.length - 1)} />
            <View style={{ width: 24 }} />
          </View>
        )}
        <Animated.View key={step} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
          <Step quiz={quiz} next={next} pet={pet} />
        </Animated.View>
      </Screen>
    </View>
  )
}

// Shared layout for a question: headline, optional sub line, body, pinned footer.
function Q({ title, sub, children, footer }: { title: string; sub?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <View style={s.q}>
      <View style={{ gap: 8, marginBottom: 24 }}>
        <Text style={type.h1}>{title}</Text>
        {sub ? <Text style={[type.body, { color: color.ink2 }]}>{sub}</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 12 }}>{children}</View>
      {footer ? <View style={{ paddingTop: 12, gap: 12 }}>{footer}</View> : null}
    </View>
  )
}

// Single choice: tapping an answer selects it, then moves on after a beat so the selection is seen.
function Single({ title, sub, options, value, onPick, next }: { title: string; sub?: string; options: { label: string; hint?: string; left?: ReactNode }[]; value?: string; onPick: (v: string) => void; next: () => void }) {
  return (
    <Q title={title} sub={sub}>
      {options.map((o, i) => (
        <Animated.View key={o.label} entering={FadeInDown.delay(i * 40).duration(260)}>
          <OptionRow {...o} selected={value === o.label} onPress={() => { onPick(o.label); setTimeout(next, 250) }} />
        </Animated.View>
      ))}
    </Q>
  )
}

function Multi({ title, sub, options, value, onChange, next, none }: { title: string; sub?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; next: () => void; none: string }) {
  const toggle = (o: string) => onChange(o === none ? [none] : value.includes(o) ? value.filter((v) => v !== o) : [...value.filter((v) => v !== none), o])
  return (
    <Q title={title} sub={sub} footer={<PillButton label="Continue" onPress={next} disabled={!value.length} />}>
      <View style={s.chips}>{[...options, none].map((o) => <Chip key={o} label={o} selected={value.includes(o)} onPress={() => toggle(o)} />)}</View>
    </Q>
  )
}

function Welcome({ next }: StepProps) {
  const [restoring, setRestoring] = useState(false)
  return (
    <View style={[s.q, { paddingTop: 12 }]}>
      <View style={s.heroArt}>
        <View style={s.heroGlow} />
        <Mascot pose="pair-happy" size={280} />
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={s.heroRing}><ScoreRing score={92} size={92} stroke={9} delay={700} /></Animated.View>
      </View>
      <View style={{ gap: 12, marginBottom: 28 }}>
        <Text style={type.display}>Know what is really in the bowl</Text>
        <Text style={[type.body, { color: color.ink2 }]}>Scan any dog or cat food and see an honest score in seconds.</Text>
      </View>
      <View style={{ gap: 16, alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch' }}><PillButton label="Get started" onPress={next} /></View>
        <TextLink
          label={restoring ? 'Checking' : 'I already subscribe'}
          onPress={async () => {
            setRestoring(true)
            const ok = await restore().catch(() => false)
            setRestoring(false)
            if (ok) { finishQuiz(); setState({ onboarded: true }); router.replace('/') }
          }}
        />
      </View>
    </View>
  )
}

function PetType({ quiz, next }: StepProps) {
  const opts = [
    { label: 'Dog', left: <Dog size={28} weight="fill" color={color.ink} />, v: 'dog' },
    { label: 'Cat', left: <Cat size={28} weight="fill" color={color.ink} />, v: 'cat' },
    { label: 'Both', hint: 'Start with one, add the other later', left: <PawPrint size={28} weight="fill" color={color.ink} />, v: 'both' },
  ] as const
  return <Single title="Who are we feeding?" sub="Dogs and cats need very different things, so we score them differently." options={[...opts]} value={opts.find((o) => o.v === quiz.petType)?.label} onPick={(l) => setQuiz({ petType: opts.find((o) => o.label === l)!.v })} next={next} />
}

function PetName({ quiz, next }: StepProps) {
  const [name, setName] = useState(quiz.name ?? '')
  const done = () => { setQuiz({ name: name.trim() }); next() }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={24}>
      <Q title={quiz.petType === 'cat' ? 'What is your cat called?' : quiz.petType === 'both' ? 'Who should we start with?' : 'What is your dog called?'} sub="We will use the name to make every score personal." footer={<PillButton label="Continue" onPress={done} disabled={!name.trim()} />}>
        <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={color.ink3} autoFocus autoCapitalize="words" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => name.trim() && done()} maxLength={24} style={s.input} />
        <Mascot pose={mascotFor(quiz.petType, 'happy')} size={150} style={{ alignSelf: 'center', marginTop: 12 }} />
      </Q>
    </KeyboardAvoidingView>
  )
}

function Stage({ quiz, next, pet }: StepProps) {
  const young = quiz.petType === 'cat' ? 'Kitten' : 'Puppy'
  const map = { [young]: 'growth', Adult: 'adult', Senior: 'senior' } as Record<string, Quiz['stage']>
  const current = Object.keys(map).find((k) => map[k] === quiz.stage)
  return <Single title={`How old is ${pet}?`} sub="Growing pets need more protein and fat than adults." options={[{ label: young, hint: 'Under one year' }, { label: 'Adult', hint: 'One to seven years' }, { label: 'Senior', hint: 'Over seven years' }]} value={current} onPick={(l) => setQuiz({ stage: map[l] })} next={next} />
}

function Size({ quiz, next, pet }: StepProps) {
  return <Single title={`How big is ${pet}?`} options={[{ label: 'Small', hint: 'Under 20 lb' }, { label: 'Medium', hint: '20 to 50 lb' }, { label: 'Large', hint: '50 to 90 lb' }, { label: 'Giant', hint: 'Over 90 lb' }]} value={quiz.size} onPick={(size) => setQuiz({ size })} next={next} />
}

function FoodType({ quiz, next, pet }: StepProps) {
  return <Single title={`What does ${pet} eat most days?`} options={[{ label: 'Dry kibble' }, { label: 'Wet or canned' }, { label: 'Fresh or raw' }, { label: 'A mix' }]} value={quiz.foodType} onPick={(foodType) => setQuiz({ foodType })} next={next} />
}

function HeardFrom({ quiz, next }: StepProps) {
  return <Single title="Where did you hear about us?" options={['TikTok', 'Instagram', 'YouTube', 'A friend', 'App Store', 'Somewhere else'].map((label) => ({ label }))} value={quiz.heardFrom} onPick={(heardFrom) => setQuiz({ heardFrom })} next={next} />
}

function Concerns({ quiz, next, pet }: StepProps) {
  return <Multi title={`Anything bothering ${pet}?`} sub="Pick all that apply. We will watch for ingredients linked to each one." options={['Itchy skin', 'Sensitive stomach', 'Weight', 'Picky eater', 'Dull coat', 'Joint health']} none="None of these" value={quiz.concerns} onChange={(concerns) => setQuiz({ concerns })} next={next} />
}

function Allergies({ quiz, next, pet }: StepProps) {
  return <Multi title={`Does ${pet} have any allergies?`} sub="We will warn you whenever a scanned food contains one." options={['Chicken', 'Beef', 'Dairy', 'Grain', 'Fish', 'Egg']} none="None that I know of" value={quiz.allergies} onChange={(allergies) => setQuiz({ allergies })} next={next} />
}

function Fact({ quiz, next }: StepProps) {
  return (
    <Q title="" footer={<PillButton label="Good to know" onPress={next} />}>
      <View style={s.factCard}>
        <Text style={[type.label, { color: color.ink2 }]}>DID YOU KNOW</Text>
        <Text style={[type.h1, { fontSize: 30, lineHeight: 36 }]}>A food called “with chicken” only has to contain 3 percent chicken.</Text>
        <Text style={type.caption}>Source: AAFCO pet food labeling rules</Text>
      </View>
      <Mascot pose={mascotFor(quiz.petType, 'worried')} size={190} style={{ alignSelf: 'center', marginTop: 8 }} />
    </Q>
  )
}

function Confidence({ quiz, next, pet }: StepProps) {
  const labels = ['No idea', 'Not very', 'Somewhat', 'Fairly', 'Very sure']
  const v = quiz.confidence
  return (
    <Q title={`How sure are you that ${pet}'s food is good?`} footer={<PillButton label="Continue" onPress={next} disabled={v == null} />}>
      <Mascot pose={mascotFor(quiz.petType, v != null && v >= 3 ? 'happy' : 'worried')} size={170} style={{ alignSelf: 'center' }} />
      <View style={s.scale}>
        {labels.map((l, i) => (
          <Pressable key={l} onPress={() => { tap('select'); setQuiz({ confidence: i }) }} style={[s.scaleDot, v === i && s.scaleDotOn]} accessibilityLabel={l}>
            <Text style={[type.title, v === i && { color: color.bg }]}>{i + 1}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[type.title, { textAlign: 'center', minHeight: 24 }]}>{v != null ? labels[v] : ' '}</Text>
    </Q>
  )
}

function Goal({ quiz, next, pet }: StepProps) {
  return <Single title={`What matters most for ${pet}?`} options={['A longer, healthier life', 'Fewer tummy troubles', 'A shinier coat', 'Paying for quality, not marketing'].map((label) => ({ label }))} value={quiz.goal} onPick={(goal) => setQuiz({ goal })} next={next} />
}

function Trust({ next }: StepProps) {
  const rows = [
    { icon: <MagnifyingGlass size={24} weight="bold" color={color.ink} />, title: 'Scored from the label', body: 'Every point comes from the ingredients and the nutrition panel. Never from advertising.' },
    { icon: <ShieldCheck size={24} weight="bold" color={color.ink} />, title: 'Brands cannot pay for a score', body: 'No sponsored ratings. The same label always gets the same score.' },
    { icon: <Heart size={24} weight="bold" color={color.ink} />, title: 'Built on real standards', body: 'AAFCO nutrient profiles and FDA rules, with separate math for dogs and cats.' },
  ]
  return (
    <Q title="A score you can trust" footer={<PillButton label="Continue" onPress={next} />}>
      {rows.map((r, i) => (
        <Animated.View key={r.title} entering={FadeInDown.delay(i * 90).duration(300)}>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <View style={s.iconBubble}>{r.icon}</View>
            <View style={{ flex: 1, gap: 2 }}><Text style={type.title}>{r.title}</Text><Text style={[type.label, { color: color.ink2, fontFamily: type.body.fontFamily }]}>{r.body}</Text></View>
          </Card>
        </Animated.View>
      ))}
    </Q>
  )
}

// The aha moment before the paywall: a real scan animation and result with canned data, zero API cost.
function DemoScan({ next, pet }: StepProps) {
  const [phase, setPhase] = useState<'ready' | 'scanning' | 'done'>('ready')
  const line = useSharedValue(0)
  const lineStyle = useAnimatedStyle(() => ({ top: `${line.value * 100}%`, opacity: line.value > 0 && line.value < 1 ? 1 : 0 }))
  const shoot = () => {
    tap('medium')
    setPhase('scanning')
    line.value = 0
    line.value = withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) })
    setTimeout(() => { setPhase('done'); tapForGrade('Poor') }, 1800)
  }
  if (phase === 'done')
    return (
      <Q title="That is a real BowlScore" sub={`This popular style of kibble scores low. Now let us check what ${pet} actually eats.`} footer={<PillButton label="Continue" onPress={next} />}>
        <Card style={{ alignItems: 'center', paddingVertical: 20, gap: 4 }}>
          <ScoreRing score={SAMPLE_POOR.result.score} size={132} stroke={12} />
        </Card>
        <Card style={{ paddingVertical: 2 }}>
          {SAMPLE_POOR.result.flags.slice(0, 3).map((f, i) => (
            <Animated.View key={f.title} entering={FadeInDown.delay(950 + i * 90).duration(280)}><FlagRow flag={f} last={i === 2} /></Animated.View>
          ))}
        </Card>
      </Q>
    )
  return (
    <Q title="Try a scan" sub="Tap the button to scan this sample bag.">
      <View style={s.finder}>
        <Image source={require('../../assets/mascots/sample-bag.png')} style={{ width: '62%', height: '84%' }} contentFit="contain" />
        {(['tl', 'tr', 'bl', 'br'] as const).map((k) => <View key={k} style={[s.corner, s[k]]} />)}
        <Animated.View style={[s.scanLine, lineStyle]} />
        <Text style={[type.label, s.finderHint]}>{phase === 'scanning' ? 'Reading the label' : 'Sample bag'}</Text>
      </View>
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <Pressable onPress={shoot} disabled={phase === 'scanning'} style={({ pressed }) => [s.shutter, pressed && { transform: [{ scale: 0.94 }] }]} accessibilityLabel="Scan the sample bag">
          <Scan size={30} weight="bold" color={color.ink} />
        </Pressable>
      </View>
    </Q>
  )
}

function NotifyPrimer({ next, pet }: StepProps) {
  const allow = async () => {
    if (Platform.OS !== 'web') await Notifications.requestPermissionsAsync().catch(() => {})
    next()
  }
  return (
    <Q title={`Stay ahead for ${pet}`} sub="Two kinds of alerts, nothing else." footer={<><PillButton label="Turn on alerts" onPress={allow} /><View style={{ alignItems: 'center' }}><TextLink label="Not now" onPress={next} /></View></>}>
      <Card style={{ gap: 16 }}>
        {[['Trial reminder', 'We remind you the day before your free trial ends.'], ['Score updates', `A heads up when we learn something new about ${pet}'s food.`]].map(([t, b]) => (
          <View key={t} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={s.iconBubble}><Bell size={22} weight="bold" color={color.ink} /></View>
            <View style={{ flex: 1 }}><Text style={type.title}>{t}</Text><Text style={type.caption}>{b}</Text></View>
          </View>
        ))}
      </Card>
    </Q>
  )
}

function Building({ next, pet, quiz }: StepProps) {
  const items = ['Life stage needs', 'Allergy watchlist', 'Ingredient red flags', 'Better food matches']
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPct((p) => Math.min(100, p + 2)), 80)
    return () => clearInterval(t)
  }, [])
  const done = Math.floor(pct / 25)
  useEffect(() => { if (done > 0 && done <= 4) tap('light') }, [done])
  useEffect(() => { if (pct >= 100) { const t = setTimeout(next, 500); return () => clearTimeout(t) } }, [pct, next])
  return (
    <View style={[s.q, { justifyContent: 'center', gap: 24 }]}>
      <Mascot pose={quiz.petType === 'cat' ? 'kitten-happy' : 'puppy-sniffing'} size={170} style={{ alignSelf: 'center' }} />
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[type.score, { fontSize: 56, lineHeight: 60 }]}>{pct}%</Text>
        <Text style={type.h2}>Building {pet}'s food profile</Text>
      </View>
      <Card style={{ gap: 14 }}>
        {items.map((label, i) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.tick, i < done && { backgroundColor: color.green, borderColor: color.green }]}>{i < done ? <Check size={13} weight="bold" color={color.surface} /> : null}</View>
            <Text style={[type.label, { color: i < done ? color.ink : color.ink3 }]}>{label}</Text>
          </View>
        ))}
      </Card>
    </View>
  )
}

function Reveal({ next, pet, quiz }: StepProps) {
  const allergy = quiz.allergies.find((a) => !a.startsWith('None'))
  const concern = quiz.concerns.find((c) => !c.startsWith('None'))
  const watch = [
    allergy ? `Watching for ${allergy.toLowerCase()}` : 'Flagging artificial colors and preservatives',
    concern ? `Checking ingredients linked to ${concern.toLowerCase()}` : 'Checking protein against life stage needs',
    'Target score of 75 or higher',
  ]
  return (
    <Q title={`${pet}'s food profile is ready`} footer={<PillButton label={`See ${pet}'s plan`} onPress={next} />}>
      <Card style={{ gap: 16, borderRadius: radius.sheet, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.avatar}><Mascot pose={mascotFor(quiz.petType, 'head')} size={56} bob={false} /></View>
          <View><Text style={type.h2}>{pet}</Text><Text style={type.caption}>{[quiz.petType === 'cat' ? 'Cat' : 'Dog', quiz.stage === 'growth' ? 'Growing' : quiz.stage === 'senior' ? 'Senior' : 'Adult', quiz.foodType].filter(Boolean).join(' · ')}</Text></View>
        </View>
        {watch.map((w, i) => (
          <Animated.View key={w} entering={FadeInDown.delay(200 + i * 120).duration(300)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[s.tick, { backgroundColor: color.green, borderColor: color.green }]}><Check size={13} weight="bold" color={color.surface} /></View>
            <Text style={[type.body, { flex: 1 }]}>{w}</Text>
          </Animated.View>
        ))}
      </Card>
      <Mascot pose={mascotFor(quiz.petType, 'happy')} size={180} style={{ alignSelf: 'center', marginTop: 12 }} />
    </Q>
  )
}

function Recap({ next, pet }: StepProps) {
  const rows = [
    { icon: <Scan size={24} weight="bold" color={color.ink} />, title: 'Unlimited scans', body: 'Every bag, can, pouch and treat.' },
    { icon: <Sparkle size={24} weight="bold" color={color.ink} />, title: `Flags matched to ${pet}`, body: 'Allergies and life stage built into every score.' },
    { icon: <Heart size={24} weight="bold" color={color.ink} />, title: 'Better foods, ranked', body: 'See what to look for in the next bag.' },
  ]
  return (
    <Q title={`Everything ${pet} needs`} footer={<PillButton label="Continue" onPress={next} />}>
      {rows.map((r) => (
        <View key={r.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 8 }}>
          <View style={s.iconBubble}>{r.icon}</View>
          <View style={{ flex: 1 }}><Text style={type.title}>{r.title}</Text><Text style={type.caption}>{r.body}</Text></View>
        </View>
      ))}
      <Mascot pose="pair-celebrating" size={200} style={{ alignSelf: 'center', marginTop: 8 }} />
    </Q>
  )
}

const bracket = { position: 'absolute', width: 34, height: 34, borderColor: color.surface } as const
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, height: 44 },
  q: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: { ...type.h2, height: 64, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.ink, backgroundColor: color.surface, paddingHorizontal: 20 },
  heroArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: color.yellowSoft },
  heroRing: { position: 'absolute', right: 12, top: '12%', backgroundColor: color.surface, borderRadius: 60, padding: 8, borderWidth: 1, borderColor: color.hairline },
  factCard: { backgroundColor: color.yellow, borderRadius: radius.sheet, padding: 24, gap: 14 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  scaleDot: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  scaleDotOn: { backgroundColor: color.ink, borderColor: color.ink },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  finder: { flex: 1, borderRadius: radius.sheet, backgroundColor: color.scanChrome, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  finderHint: { position: 'absolute', bottom: 16, color: color.surface },
  corner: bracket,
  tl: { top: 20, left: 20, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 20, right: 20, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 48, left: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 48, right: 20, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  scanLine: { position: 'absolute', left: 20, right: 20, height: 3, borderRadius: 2, backgroundColor: color.green },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: color.yellow, borderWidth: 5, borderColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.hairline, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.yellowSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
})
