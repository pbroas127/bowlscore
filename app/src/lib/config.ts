// Public client configuration. Everything here is designed to ship inside the app binary:
// the Firebase web config and the RevenueCat public SDK key identify the project, they do not grant access.
// Real secrets (the Gemini key) live only in the website's server environment.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://bowlscoreapp.vercel.app'

export const FIREBASE = {
  apiKey: 'AIzaSyAsdAe5xauPZHaQOOOT7e5C9C_RhlV6PIc',
  authDomain: 'bowlscore-5e75a.firebaseapp.com',
  projectId: 'bowlscore-5e75a',
  storageBucket: 'bowlscore-5e75a.firebasestorage.app',
  messagingSenderId: '3163562272',
  appId: '1:3163562272:web:89a8dd812b405a7772b745',
}

// RevenueCat public iOS SDK key (starts with appl_). Empty means purchases run in mock mode.
export const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? ''

// Google sign in needs an iOS OAuth client. Until it is set the Google button stays hidden.
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''

// Set EXPO_PUBLIC_PREVIEW=1 to run with canned scan results and no network (design previews, screenshots).
export const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1'
