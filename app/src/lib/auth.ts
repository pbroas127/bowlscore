// Firebase Authentication. Everyone starts anonymous (no sign up wall); Apple, Google or email can be linked later
// from Settings, which keeps the same user id so purchases and history carry over.
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { getApps, initializeApp } from 'firebase/app'
import * as FirebaseAuth from 'firebase/auth'
import { Platform } from 'react-native'
import { useSyncExternalStore } from 'react'

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}
export const authEnabled = Boolean(config.apiKey && config.projectId)

let auth: FirebaseAuth.Auth | undefined
let user: FirebaseAuth.User | null = null
const listeners = new Set<() => void>()

export function startAuth() {
  if (!authEnabled || auth) return
  const app = getApps()[0] ?? initializeApp(config)
  // getReactNativePersistence only exists in the React Native build of firebase/auth, so it is absent from the web types.
  const rnPersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: unknown) => FirebaseAuth.Persistence }).getReactNativePersistence
  auth = Platform.OS === 'web' || !rnPersistence ? FirebaseAuth.getAuth(app) : FirebaseAuth.initializeAuth(app, { persistence: rnPersistence(AsyncStorage) })
  FirebaseAuth.onAuthStateChanged(auth, (u) => {
    user = u
    listeners.forEach((l) => l())
    if (!u && auth) FirebaseAuth.signInAnonymously(auth).catch(() => {})
  })
}

export const currentUser = () => user
export const idToken = async () => (user ? user.getIdToken() : undefined)
export function useUser() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => user, () => user)
}

// Link to the anonymous account when possible; if that identity already has an account, sign into it instead.
async function linkOrSignIn(credential: FirebaseAuth.AuthCredential) {
  if (!auth) throw new Error('Sign in is not available right now.')
  try {
    if (auth.currentUser?.isAnonymous) return (await FirebaseAuth.linkWithCredential(auth.currentUser, credential)).user
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') throw e
  }
  return (await FirebaseAuth.signInWithCredential(auth, credential)).user
}

export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID()
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)
  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
    nonce: hashed,
  })
  if (!apple.identityToken) throw new Error('Apple did not return a sign in token.')
  return linkOrSignIn(new FirebaseAuth.OAuthProvider('apple.com').credential({ idToken: apple.identityToken, rawNonce }))
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    if (!auth) throw new Error('Sign in is not available right now.')
    return (await FirebaseAuth.signInWithPopup(auth, new FirebaseAuth.GoogleAuthProvider())).user
  }
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin')
  GoogleSignin.configure({ iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })
  const res = await GoogleSignin.signIn()
  const token = res.data?.idToken
  if (!token) throw new Error('Google sign in was cancelled.')
  return linkOrSignIn(FirebaseAuth.GoogleAuthProvider.credential(token))
}

export async function signInWithEmail(email: string, password: string, create: boolean) {
  if (!auth) throw new Error('Sign in is not available right now.')
  if (create) return linkOrSignIn(FirebaseAuth.EmailAuthProvider.credential(email, password))
  return (await FirebaseAuth.signInWithEmailAndPassword(auth, email, password)).user
}

export const resetPassword = (email: string) => (auth ? FirebaseAuth.sendPasswordResetEmail(auth, email) : Promise.resolve())
export const signOut = () => (auth ? FirebaseAuth.signOut(auth) : Promise.resolve())
export const deleteAccount = () => (auth?.currentUser ? FirebaseAuth.deleteUser(auth.currentUser) : Promise.resolve())

export function authMessage(e: unknown) {
  const code = (e as { code?: string }).code ?? ''
  if (code.includes('ERR_REQUEST_CANCELED') || code.includes('cancel')) return ''
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'That email and password do not match.'
  if (code.includes('weak-password')) return 'Use a password with at least 6 characters.'
  if (code.includes('invalid-email')) return 'That email address does not look right.'
  if (code.includes('requires-recent-login')) return 'For your security, sign in again and then retry.'
  return (e as Error).message || 'Something went wrong. Please try again.'
}
