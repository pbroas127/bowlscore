import { Redirect } from 'expo-router'
import { usePro } from '@/lib/purchases'
import { useStore } from '@/lib/store'

// The gate: quiz first, then the paywall, then the app. Subscribers skip straight in.
export default function Index() {
  const onboarded = useStore((s) => s.onboarded)
  const pro = usePro()
  if (!onboarded) return <Redirect href="/onboarding" />
  if (!pro) return <Redirect href="/paywall" />
  return <Redirect href="/(tabs)" />
}
