import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque'
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { startAuth, useUser } from '@/lib/auth'
import { identify, startPurchases } from '@/lib/purchases'
import { loadState, useStore } from '@/lib/store'
import { color } from '@/theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold })
  const ready = useStore((s) => s.ready)
  const user = useUser()

  useEffect(() => {
    loadState().then(() => startPurchases())
    startAuth()
  }, [])

  // RevenueCat follows the Firebase user id, so a subscription survives reinstalling and signing back in.
  useEffect(() => { if (user) identify(user.uid) }, [user])

  useEffect(() => { if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {}) }, [fontsLoaded, ready])
  if (!fontsLoaded || !ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: color.scanChrome } }} />
        <Stack.Screen name="result/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
