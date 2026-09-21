import * as AppleAuthentication from 'expo-apple-authentication'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { EnvelopeSimple, GoogleLogo, X } from 'phosphor-react-native'
import { Mascot } from '@/components/Mascot'
import { PillButton, Screen, TextLink } from '@/components/ui'
import { authEnabled, googleEnabled, authMessage, resetPassword, signInWithApple, signInWithEmail, signInWithGoogle, signOut, useUser } from '@/lib/auth'
import { color, radius, type } from '@/theme'

export default function Account() {
  const user = useUser()
  const signedIn = user && !user.isAnonymous
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'choose' | 'create' | 'signin'>('choose')
  const [busy, setBusy] = useState(false)

  const attempt = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn(); router.back() } catch (e) { const msg = authMessage(e); if (msg) Alert.alert('Could not sign in', msg) } finally { setBusy(false) }
  }

  return (
    <Screen scroll>
      <View style={s.nav}>
        <Text style={type.h2}>{signedIn ? 'Your account' : 'Back up your pets'}</Text>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Close"><X size={24} weight="bold" color={color.ink} /></Pressable>
      </View>

      {signedIn ? (
        <View style={{ gap: 16, alignItems: 'center', paddingTop: 24 }}>
          <Mascot pose="pair-happy" size={160} />
          <Text style={[type.body, { textAlign: 'center' }]}>Signed in as {user.email ?? 'your Apple ID'}. Your pets and scans follow you to any device.</Text>
          <View style={{ alignSelf: 'stretch' }}><PillButton label="Sign out" variant="quiet" onPress={() => attempt(signOut)} /></View>
        </View>
      ) : !authEnabled ? (
        <Text style={[type.body, { color: color.ink2, paddingTop: 24 }]}>Sign in is not available in this preview build.</Text>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 12, paddingTop: 8 }}>
          <Text style={[type.body, { color: color.ink2, marginBottom: 8 }]}>Optional. Sign in so your pets, scans and subscription move with you to a new phone.</Text>
          {mode === 'choose' ? (
            <>
              {Platform.OS === 'ios' ? (
                <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={28} style={{ height: 56 }} onPress={() => attempt(signInWithApple)} />
              ) : null}
              {googleEnabled ? <PillButton label="Continue with Google" variant="quiet" icon={<GoogleLogo size={20} weight="bold" color={color.ink} />} loading={busy} onPress={() => attempt(signInWithGoogle)} /> : null}
              <PillButton label="Continue with email" variant="quiet" icon={<EnvelopeSimple size={20} weight="bold" color={color.ink} />} onPress={() => setMode('create')} />
            </>
          ) : (
            <>
              <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={color.ink3} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" style={s.input} />
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={color.ink3} secureTextEntry textContentType={mode === 'create' ? 'newPassword' : 'password'} style={s.input} />
              <PillButton label={mode === 'create' ? 'Create account' : 'Sign in'} loading={busy} disabled={!email.includes('@') || password.length < 6} onPress={() => attempt(() => signInWithEmail(email.trim(), password, mode === 'create'))} />
              <View style={s.links}>
                <TextLink label={mode === 'create' ? 'I already have an account' : 'Create a new account'} onPress={() => setMode(mode === 'create' ? 'signin' : 'create')} />
                {mode === 'signin' ? <TextLink label="Forgot password" onPress={() => email.includes('@') ? resetPassword(email.trim()).then(() => Alert.alert('Check your email', 'We sent a link to reset your password.')).catch(() => {}) : Alert.alert('Enter your email first')} /> : null}
                <TextLink label="Other ways to sign in" onPress={() => setMode('choose')} />
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </Screen>
  )
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 12 },
  input: { ...type.body, height: 56, borderRadius: radius.chip, borderWidth: 1.5, borderColor: color.hairline, backgroundColor: color.surface, paddingHorizontal: 16 },
  links: { alignItems: 'center', gap: 14, paddingTop: 8 },
})
