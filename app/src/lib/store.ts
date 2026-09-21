// App state: one object, persisted to AsyncStorage on every change. Small enough that a library would be overhead.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import type { Pet, Scan } from './types'

export interface Quiz {
  step: number
  petType?: 'dog' | 'cat' | 'both'
  name?: string
  stage?: Pet['stage']
  size?: string
  foodType?: string
  heardFrom?: string
  concerns: string[]
  allergies: string[]
  confidence?: number
  goal?: string
}

export interface AppState {
  ready: boolean
  onboarded: boolean
  mockPro: boolean // only used when purchases run in mock mode (web preview or no RevenueCat key)
  coachSeen: boolean
  ratingAsks: number
  quiz: Quiz
  pets: Pet[]
  activePetId?: string
  scans: Scan[]
}

const KEY = 'bowlscore.state.v1'
const initial: AppState = { ready: false, onboarded: false, mockPro: false, coachSeen: false, ratingAsks: 0, quiz: { step: 0, concerns: [], allergies: [] }, pets: [], scans: [] }

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
export const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

// Turns the quiz answers into the first pet profile.
export function finishQuiz() {
  const q = state.quiz
  const base = { stage: q.stage ?? 'adult', size: q.size, foodType: q.foodType, concerns: q.concerns, allergies: q.allergies } as const
  const name = q.name?.trim() || 'My pet'
  // "Both" starts with one profile; the Pets tab invites adding the second.
  const pets: Pet[] = [{ id: newId(), name, species: q.petType === 'cat' ? 'cat' : 'dog', ...base }]
  setState({ pets, activePetId: pets[0].id })
}

export function saveScan(scan: Scan) {
  setState((s) => ({ scans: [scan, ...s.scans].slice(0, 200) }))
}
