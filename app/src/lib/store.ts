// App state: one object, persisted to AsyncStorage on every change. Small enough that a library would be overhead.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { PREVIEW } from './config'
import { PROTEINS } from './recommend'
import { SAMPLE_PET } from './sample'
import { suggestScan } from './suggest'
import type { Pet, Recall, Scan } from './types'

export interface Quiz {
  step: number
  petType?: 'dog' | 'cat' | 'both'
  name?: string
  breed?: string
  bornAt?: number
  weightLb?: number
  stage?: Pet['stage']
  size?: string
  foodType?: string
  protein?: string
  heardFrom?: string
  concerns: string[]
  allergies: string[]
}

export interface AppState {
  ready: boolean
  onboarded: boolean
  mockPro: boolean // only used when purchases run in mock mode (web preview or no RevenueCat key)
  coachSeen: boolean
  guideSeen: boolean // the "what to scan" diagram on the scanner
  ratingAsks: number
  quiz: Quiz
  pets: Pet[]
  activePetId?: string
  scans: Scan[]
  recalls: Recall[] // every notice fetched for the brands in the pantry
  recallsSeen: string[] // ids the person dismissed
  recallsCheck?: { at: number; brands: string }
}

const KEY = 'bowlscore.state.v1'
const initial: AppState = { ready: false, onboarded: false, mockPro: false, coachSeen: false, guideSeen: false, ratingAsks: 0, quiz: { step: 0, concerns: [], allergies: [] }, pets: [], scans: [], recalls: [], recallsSeen: [] }

// Pets saved by an older build (or restored from an older backup) lack the newer fields. Breed, age, weight and meals are optional everywhere, so only the list needs a default.
export const withDefaults = (pets: Pet[]): Pet[] => pets.map((p) => ({ ...p, treatScanIds: p.treatScanIds ?? [] }))

let state = initial
const listeners = new Set<() => void>()

export const getState = () => state
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  listeners.forEach((l) => l())
  const { ready: _ready, ...persisted } = state
  AsyncStorage.setItem(KEY, JSON.stringify(persisted)).catch(() => {})
}

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) state = { ...initial, ...JSON.parse(raw) }
    state = { ...state, pets: withDefaults(state.pets) }
  } catch {}
  state = { ...state, ready: true }
  listeners.forEach((l) => l())
}

export async function resetState() {
  await AsyncStorage.removeItem(KEY).catch(() => {})
  state = { ...initial, ready: true }
  listeners.forEach((l) => l())
}

export function useStore<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => select(state),
    () => select(state),
  )
}

export const setQuiz = (patch: Partial<Quiz>) => setState((s) => ({ quiz: { ...s.quiz, ...patch } }))
export const activePet = (s: AppState) => s.pets.find((p) => p.id === s.activePetId) ?? s.pets[0]
export const updatePet = (id: string | undefined, patch: (p: Pet) => Pet) => setState((s) => ({ pets: s.pets.map((p) => (p.id === id ? patch(p) : p)) }))
export const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

// The quiz answers as a pet profile. Onboarding also reads it to show the life stage that the age works out to.
export function petFromQuiz(q: Quiz): Pet {
  const species = q.petType === 'cat' ? 'cat' : 'dog'
  return { id: newId(), name: q.name?.trim() || 'My pet', species, breed: q.breed?.trim() || undefined, bornAt: q.bornAt, weightLb: q.weightLb, stage: q.stage ?? 'adult', size: q.size, foodType: q.foodType, protein: q.protein && PROTEINS.includes(q.protein) ? q.protein : undefined, concerns: q.concerns, allergies: q.allergies, treatScanIds: [] }
}

// "Both" starts with one profile; the Pets tab invites adding the second.
export function finishQuiz() {
  const pet = petFromQuiz(state.quiz)
  // A design preview that skipped breed, age and weight still shows the fit and feeding cards filled in.
  const pets = [PREVIEW && pet.species === 'dog' && !pet.breed && !pet.bornAt && !pet.weightLb ? { ...pet, ...SAMPLE_PET } : pet]
  setState({ pets, activePetId: pets[0].id })
}

export function saveScan(scan: Scan) {
  setState((s) => ({ scans: [scan, ...s.scans].slice(0, 200) }))
  // Not in the catalog yet: offer it to the catalog (product data only, reviewed by hand before anything is published).
  if (!scan.productId && scan.source !== 'sample') suggestScan(scan.label, state.pets.find((p) => p.id === scan.petId)?.species ?? 'unknown', scan.source)
}
export const updateScan = (id: string, patch: (x: Scan) => Scan) => setState((s) => ({ scans: s.scans.map((x) => (x.id === id ? patch(x) : x)) }))
