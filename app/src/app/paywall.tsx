import * as Notifications from 'expo-notifications'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Bell, Check, LockOpen, Star, X } from 'phosphor-react-native'
import { Mascot } from '@/components/Mascot'
import { PillButton, Screen, TextLink } from '@/components/ui'
import { tap } from '@/lib/haptics'
import { loadPlans, purchase, restore, usePro, type Plan } from '@/lib/purchases'
import { activePet, useStore } from '@/lib/store'
import { SITE } from '@/lib/links'
import { color, radius, type } from '@/theme'

export default function Paywall() {
  const { from } = useLocalSearchParams<{ from?: string }>() // 'free' when opened from free mode, which it returns to
  const pet = useStore((s) => activePet(s)?.name) ?? 'your pet'
  const [plans, setPlans] = useState<Plan[]>()
  const [picked, setPicked] = useState<Plan['id']>('yearly')
  const [busy, setBusy] = useState(false)

  const pro = usePro()
  useEffect(() => { loadPlans().then(setPlans).catch(() => setPlans([])) }, [])
  // A subscription confirmed late (slow network, restored on another screen) lets the user straight in.
  useEffect(() => { if (pro) router.replace('/') }, [pro])

  const plan = plans?.find((p) => p.id === picked) ?? plans?.[0]
  const yearly = plans?.find((p) => p.id === 'yearly')
  const trial = plan?.trialDays ?? 0
  const showTimeline = (yearly?.trialDays ?? 0) > 0
  const monthly = plans?.find((p) => p.id === 'monthly')
  const savePct = yearly && monthly ? Math.round((1 - yearly.price / (monthly.price * 12)) * 100) : 0

  const buy = async () => {
    if (!plan) return
    setBusy(true)
    try {
      if (await purchase(plan)) {
        if (plan.trialDays > 1) scheduleTrialReminder(plan.trialDays, pet)
        router.replace('/')
      }
    } catch (e) {
      Alert.alert('Purchase did not go through', (e as Error).message || 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const onRestore = async () => {
    setBusy(true)
    const ok = await restore().catch(() => false)
    setBusy(false)
    if (ok) router.replace('/')
    else Alert.alert('Nothing to restore', 'We could not find an active subscription for this Apple ID.')
  }

  return (
    <Screen
      footer={
        <>
          <PillButton label={trial > 0 ? `Try free for ${trial} days` : 'Continue'} onPress={buy} loading={busy || !plans} disabled={!plan} />
          <Text style={[type.caption, { textAlign: 'center', color: color.ink2 }]}>
            {plan ? (trial > 0 ? `${trial} days free, then ${plan.priceString} per year. ` : `${plan.priceString} per ${plan.id === 'yearly' ? 'year' : 'month'}. `) : ''}Renews automatically. Cancel anytime.
          </Text>
          <View style={s.legal}>
            <TextLink label="Restore purchases" onPress={onRestore} />
            <TextLink label="Terms of Use" onPress={() => WebBrowser.openBrowserAsync(SITE.terms)} />
            <TextLink label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(SITE.privacy)} />
          </View>
        </>
      }>
      {/* A quiet way out to free mode: the scored catalog and its shop links, nothing personal. */}
      <Pressable hitSlop={14} onPress={() => (from === 'free' ? router.back() : router.replace('/catalog'))} style={s.close} accessibilityRole="button" accessibilityLabel="Close, browse foods for free">
        <X size={18} weight="bold" color={color.ink3} />
      </Pressable>
      <View style={s.top}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={type.h1}>{showTimeline ? `Start ${pet}'s ${yearly?.trialDays} day free trial` : `Unlock BowlScore for ${pet}`}</Text>
        </View>
        <Mascot pose="pair-happy" size={96} />
      </View>

      {showTimeline ? (
        <View style={s.timeline}>
          {[
            { icon: <LockOpen size={18} weight="fill" color={color.ink} />, when: 'Today', what: 'Unlock every scan, flag and better food pick' },
            { icon: <Bell size={18} weight="fill" color={color.ink} />, when: `Day ${(yearly?.trialDays ?? 3) - 1}`, what: 'We remind you that your trial is ending' },
            { icon: <Star size={18} weight="fill" color={color.ink} />, when: `Day ${yearly?.trialDays ?? 3}`, what: 'Billing starts. Cancel before then and pay nothing' },
          ].map((n, i, all) => (
            <View key={n.when} style={s.node}>
              <View style={{ alignItems: 'center' }}>
                <View style={s.nodeIcon}>{n.icon}</View>
                {i < all.length - 1 ? <View style={s.nodeLine} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 14 }}>
                <Text style={type.title}>{n.when}</Text>
                <Text style={type.caption}>{n.what}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 10, marginBottom: 12 }}>
          {['Unlimited scans for dogs and cats', `Flags matched to ${pet}`, 'Better foods, ranked'].map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Check size={18} weight="bold" color={color.green} /><Text style={type.body}>{f}</Text></View>
          ))}
        </View>
      )}

      <View style={{ gap: 12 }}>
        {(plans ?? []).map((p) => {
          const on = p.id === picked
          return (
            <Pressable key={p.id} onPress={() => { tap('select'); setPicked(p.id) }} style={[s.plan, on && s.planOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              {p.id === 'yearly' && p.trialDays > 0 ? <View style={s.badge}><Text style={s.badgeText}>{p.trialDays} DAYS FREE</Text></View> : null}
              <View style={{ flex: 1 }}>
                <Text style={type.title}>{p.id === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
                <Text style={type.h2}>{p.priceString} <Text style={type.label}>per {p.id === 'yearly' ? 'year' : 'month'}</Text></Text>
                {p.perMonthString ? <Text style={type.caption}>Only {p.perMonthString} per month</Text> : null}
              </View>
              {p.id === 'yearly' && savePct > 0 ? <View style={s.save}><Text style={[type.caption, { color: color.ink, fontFamily: type.title.fontFamily }]}>Save {savePct}%</Text></View> : null}
              <View style={[s.radio, on && s.radioOn]}>{on ? <Check size={14} weight="bold" color={color.surface} /> : null}</View>
            </Pressable>
          )
        })}
      </View>

      {plans && !plans.length ? (
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 12 }}>
          <Text style={[type.body, { color: color.ink2, textAlign: 'center' }]}>Plans could not be loaded from the App Store. Check your connection and try again.</Text>
          <TextLink label="Try again" tone={color.ink} onPress={() => { setPlans(undefined); loadPlans().then(setPlans).catch(() => setPlans([])) }} />
        </View>
      ) : null}

      {trial > 0 ? (
        <View style={s.reassure}><Check size={16} weight="bold" color={color.green} /><Text style={[type.label, { color: color.ink2 }]}>No payment due now</Text></View>
      ) : null}
    </Screen>
  )
}

// The paywall promises a reminder before billing, so it has to really be scheduled.
function scheduleTrialReminder(trialDays: number, pet: string) {
  if (Platform.OS === 'web') return
  Notifications.scheduleNotificationAsync({
    content: { title: 'Your free trial ends tomorrow', body: `Keep scanning for ${pet}, or cancel anytime in your Apple ID settings.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: (trialDays - 1) * 24 * 60 * 60 },
  }).catch(() => {})
}

const s = StyleSheet.create({
  close: { alignSelf: 'flex-end', padding: 4, marginTop: 4, opacity: 0.8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 0, marginBottom: 16 },
  timeline: { marginBottom: 20 },
  node: { flexDirection: 'row', gap: 14 },
  nodeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.yellow, alignItems: 'center', justifyContent: 'center' },
  nodeLine: { width: 3, flex: 1, backgroundColor: color.yellowSoft, marginVertical: 2, borderRadius: 2 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, borderWidth: 2, borderColor: color.hairline, backgroundColor: color.surface, padding: 16 },
  planOn: { borderColor: color.green, backgroundColor: color.greenSoft },
  badge: { position: 'absolute', top: -11, left: 16, backgroundColor: color.green, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: type.title.fontFamily, fontSize: 11, lineHeight: 15, letterSpacing: 0.6, color: color.surface },
  save: { backgroundColor: color.yellow, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.hairline, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  radioOn: { backgroundColor: color.green, borderColor: color.green },
  reassure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingBottom: 4 },
})
