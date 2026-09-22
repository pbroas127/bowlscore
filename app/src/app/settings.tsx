import Constants from 'expo-constants'
import { router } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import * as WebBrowser from 'expo-web-browser'
import type { ReactNode } from 'react'
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, CaretRight } from 'phosphor-react-native'
import { Mascot } from '@/components/Mascot'
import { Card, Screen } from '@/components/ui'
import { deleteAccount, useUser } from '@/lib/auth'
import { SITE, SUPPORT_EMAIL } from '@/lib/links'
import { askToNotify } from '@/lib/notify'
import { restore, useProStatus } from '@/lib/purchases'
import { resetState } from '@/lib/store'
import { deleteBackup } from '@/lib/sync'
import { color, type } from '@/theme'

function Row({ label, value, onPress, danger, last }: { label: string; value?: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.divider, pressed && { opacity: 0.6 }]}>
      <Text style={[type.body, { flex: 1 }, danger && { color: color.bad }]}>{label}</Text>
      {value ? <Text style={type.caption} numberOfLines={1}>{value}</Text> : null}
      <CaretRight size={16} weight="bold" color={color.ink3} />
    </Pressable>
  )
}
const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={{ gap: 8, marginBottom: 24 }}><Text style={[type.label, { color: color.ink2, paddingLeft: 4 }]}>{title}</Text><Card style={{ paddingVertical: 0 }}>{children}</Card></View>
)
const web = (url: string) => () => WebBrowser.openBrowserAsync(url)

export default function Settings() {
  const user = useUser()
  const signedIn = user && !user.isAnonymous
  const sub = useProStatus()
  const until = sub.expires ? new Date(sub.expires).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined
  const subValue = !sub.active ? 'Not active' : until ? `${sub.plan}, ${sub.renews ? 'renews' : 'ends'} ${until}` : sub.plan
  const mail = (subject: string) => () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`\n\nBowlScore ${Constants.expoConfig?.version}`)}`)

  const onRestore = async () => {
    const ok = await restore().catch(() => false)
    Alert.alert(ok ? 'Subscription restored' : 'Nothing to restore', ok ? 'You are all set.' : 'We could not find an active subscription for this Apple ID.')
  }
  const onRecalls = () =>
    Alert.alert('Recall alerts', 'BowlScore checks the brands of every main food and treat you have saved against new recall notices, about twice a day. A match shows at the top of Home. Turn on notifications to also hear about it right away.', [
      { text: 'Close', style: 'cancel' },
      { text: 'Turn on notifications', onPress: async () => { if (!(await askToNotify())) Linking.openSettings() } },
    ])
  const onDelete = () =>
    Alert.alert('Delete all my data?', 'This removes your pets, your scan history and your account from this device and our servers. Your subscription is managed by Apple and must be cancelled separately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: async () => {
        try { if (user) await deleteBackup(user.uid); await deleteAccount() } catch { return Alert.alert('Please sign in again', 'For your security, sign in again and then retry.') }
        await resetState()
        router.replace('/')
      } },
    ])

  return (
    <Screen scroll>
      <View style={s.nav}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back"><ArrowLeft size={24} weight="bold" color={color.ink} /></Pressable>
        <Text style={type.h2}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <Group title="Account">
        <Row label={signedIn ? 'Signed in' : 'Sign in to back up your pets'} value={signedIn ? user.email ?? 'Apple ID' : undefined} onPress={() => router.push('/account')} last />
      </Group>
      <Group title="Subscription">
        <Row label="BowlScore Pro" value={subValue} onPress={() => (sub.active ? Linking.openURL('https://apps.apple.com/account/subscriptions') : router.push('/paywall'))} />
        <Row label="Manage subscription" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} />
        <Row label="Restore purchases" onPress={onRestore} last />
      </Group>
      <Group title="Notifications">
        <Row label="Recall alerts" value="Always on in the app" onPress={onRecalls} last />
      </Group>
      <Group title="Trust">
        <Row label="How we score" onPress={web(SITE.methodology)} />
        <Row label="Affiliate disclosure" onPress={web(SITE.affiliate)} />
        <Row label="Not veterinary advice" onPress={() => Alert.alert('Not veterinary advice', 'BowlScore rates what is printed on the label. It cannot examine your pet. For medical questions and prescription diets, always ask your veterinarian.')} last />
      </Group>
      <Group title="Support">
        <Row label="Help and FAQ" onPress={() => router.push('/faq')} />
        <Row label="Contact us" value={SUPPORT_EMAIL} onPress={mail('BowlScore support')} />
        <Row label="Send feedback" onPress={mail('BowlScore feedback')} />
        <Row label="Rate BowlScore" onPress={async () => { if (await StoreReview.isAvailableAsync().catch(() => false)) StoreReview.requestReview() }} />
        <Row label="Share with a friend" onPress={() => Share.share({ message: `I use BowlScore to check what is really in my pet's food. ${SITE.home}` })} last />
      </Group>
      <Group title="Legal">
        <Row label="Terms of Use" onPress={web(SITE.terms)} />
        <Row label="Privacy Policy" onPress={web(SITE.privacy)} />
        <Row label="Delete my data" danger onPress={onDelete} last />
      </Group>

      <View style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
        <Mascot pose="pair-sleeping" size={120} bob={false} />
        <Text style={type.caption}>BowlScore {Constants.expoConfig?.version}</Text>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 54 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
})
