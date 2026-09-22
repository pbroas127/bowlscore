// The catalog grows from real scans: a food or treat that is not in the catalog yet, or a reorder link someone pastes,
// is sent in as an anonymous suggestion. Product data only (what the label says), never photos, pets or accounts.
// Suggestions are reviewed by hand once a week and added through the free catalog path (site/scripts/build-catalog.mjs).
import { getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'
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

// ---- barcodes the catalog does not know yet ----
// The first person to scan an unknown barcode photographs the label once. That reading is saved under the barcode
// (create only: the first reading stays, nobody can overwrite it), and everyone after gets the full label from the
// barcode alone. UPC-A and EAN-13 print the same number with or without a leading 0, so ids drop leading zeros.
const barcodeId = (code: string) => code.replace(/\D/g, '').replace(/^0+/, '')

export function learnBarcode(code: string, label: LabelData, species: Species | 'unknown') {
  const app = getApps()[0]
  if (PREVIEW || !app || !getAuth(app).currentUser || label.ingredients.length < 3) return
  const { productName, brand, foodForm, isTreat, ingredients, analysis, aafco, lifeStageClaim, largeSizeGrowth, calories } = label
  setDoc(doc(getFirestore(app), 'barcodes', barcodeId(code)), { label: clean({ productName, brand, foodForm, isTreat, ingredients: ingredients.slice(0, 120), analysis, aafco, lifeStageClaim, largeSizeGrowth, calories }), species, at: serverTimestamp() }).catch(() => {})
}

// A label someone already read for this barcode, or undefined. Gives up after 3 s so a slow network never blocks a scan.
export async function knownBarcode(code: string): Promise<LabelData | undefined> {
  const app = getApps()[0]
  if (PREVIEW || !app) return undefined
  const read = getDoc(doc(getFirestore(app), 'barcodes', barcodeId(code))).then((d) => (d.exists() ? (d.data().label as LabelData) : undefined)).catch(() => undefined)
  return Promise.race([read, new Promise<undefined>((r) => setTimeout(() => r(undefined), 3000))])
}
