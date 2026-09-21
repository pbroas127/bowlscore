import { newId } from './store'
import { SAMPLE_GOOD, SAMPLE_POOR } from './sample'
import { idToken } from './auth'
import type { LabelData, LifeStage, ScoreResult, Species } from './types'

import { API_URL, PREVIEW } from './config'

export class ScanError extends Error {
  constructor(public code: 'unreadable' | 'barcode_not_found' | 'rate_limited' | 'offline' | 'timeout' | 'server', message: string, public product?: Product) { super(message) }
}

export interface Product { name: string; brand?: string }
export interface ScanResponse { id: string; source: 'label' | 'barcode' | 'web'; sourceUrl?: string; label: LabelData; result: ScoreResult; speciesOnLabel?: Species | 'unknown'; productId?: string; image?: string }

const MESSAGES = {
  unreadable: 'That photo was too blurry to read. Try again with more light.',
  barcode_not_found: 'New one for us. Snap the ingredients list and we will score it.',
  rate_limited: 'That is a lot of scans for one day. Try again tomorrow.',
  offline: 'No connection. Check your internet and try again.',
  timeout: 'That took too long. Your photo is still here, so just try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
} as const

export async function scanFood(input: { species: Species; lifeStage: LifeStage; images?: string[]; barcode?: string; product?: Product }): Promise<ScanResponse> {
  if (PREVIEW) {
    // Preview mode: no backend configured. Alternate the two canned results so every state can be seen.
    await new Promise((r) => setTimeout(r, 2600))
    const pick = Math.random() < 0.5 ? SAMPLE_POOR : SAMPLE_GOOD
    return { id: newId(), source: input.barcode ? 'barcode' : 'label', ...pick }
  }
  return post(input, 58_000)
}

// Scores a label that was already read, for when the person corrects food against treat. No photo, no AI call, so it is instant.
export async function rescoreLabel(input: { species: Species; lifeStage: LifeStage; label: LabelData }): Promise<ScanResponse> {
  if (PREVIEW) return { id: newId(), source: 'label', label: input.label, result: (input.label.productName === SAMPLE_POOR.label.productName ? SAMPLE_POOR : SAMPLE_GOOD).result }
  return post(input, 15_000)
}

async function post(body: object, ms: number): Promise<ScanResponse> {
  let res: Response
  // React Native fetch never times out on its own, so a stuck request would leave the scanner spinning forever.
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), ms)
  try {
    const token = await idToken()
    res = await fetch(`${API_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: abort.signal,
    })
  } catch {
    throw abort.signal.aborted ? new ScanError('timeout', MESSAGES.timeout) : new ScanError('offline', MESSAGES.offline)
  } finally {
    clearTimeout(timer)
  }
  if (res.ok) return res.json()
  const code = res.status === 502 || res.status === 504 ? 'timeout' : res.status === 422 ? 'unreadable' : res.status === 404 ? 'barcode_not_found' : res.status === 429 ? 'rate_limited' : 'server'
  // A barcode the databases do not know still tells us WHICH product it is, so say so and carry the name forward.
  const product: Product | undefined = code === 'barcode_not_found' ? (await res.json().catch(() => null))?.product ?? undefined : undefined
  throw new ScanError(code, product ? `Found ${product.name}. Snap the ingredients list on the bag and we will score it.` : MESSAGES[code], product)
}
