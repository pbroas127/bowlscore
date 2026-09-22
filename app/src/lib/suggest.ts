// The catalog grows from real scans: a food or treat that is not in the catalog yet, or a reorder link someone pastes,
// is sent in as an anonymous suggestion. Product data only (what the label says), never photos, pets or accounts.
// Suggestions are reviewed by hand once a week and added through the free catalog path (site/scripts/build-catalog.mjs).
import { getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore'
import { PREVIEW } from './config'
import type { LabelData, Species } from './types'

const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x)) // Firestore refuses undefined fields

async function send(data: Record<string, unknown>) {
  const app = getApps()[0]
  if (PREVIEW || !app || !getAuth(app).currentUser) return // rules only accept signed in (anonymous is fine) writers
  await addDoc(collection(getFirestore(app), 'suggestions'), { ...clean(data), at: serverTimestamp() }).catch(() => {})
}

export function suggestScan(label: LabelData, species: Species | 'unknown', source: string) {
  // A read with too little on it is not worth a reviewer's time, and nothing without a name can be looked up.
  if (label.ingredients.length < 3 || !(label.productName || label.brand)) return
  const { productName, brand, foodForm, isTreat, ingredients, analysis, aafco, lifeStageClaim, largeSizeGrowth, calories } = label
  send({ kind: 'scan', source, species, label: { productName, brand, foodForm, isTreat, ingredients: ingredients.slice(0, 120), analysis, aafco, lifeStageClaim, largeSizeGrowth, calories } })
}

export function suggestLink(link: string, label: LabelData, species: Species) {
  send({ kind: 'link', link: link.slice(0, 500), species, productName: label.productName, brand: label.brand })
}
