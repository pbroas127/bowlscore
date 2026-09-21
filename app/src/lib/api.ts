import { newId } from './store'
import { SAMPLE_GOOD, SAMPLE_POOR } from './sample'
import { idToken } from './auth'
import type { LabelData, LifeStage, ScoreResult, Species } from './types'

import { API_URL, PREVIEW } from './config'

export class ScanError extends Error {
  constructor(public code: 'unreadable' | 'barcode_not_found' | 'rate_limited' | 'offline' | 'timeout' | 'server', message: string) { super(message) }
}

export interface ScanResponse { id: string; source: 'label' | 'barcode'; label: LabelData; result: ScoreResult; speciesOnLabel?: Species | 'unknown' }

const MESSAGES = {
  unreadable: 'That photo was too blurry to read. Try again with more light.',
  barcode_not_found: 'New one for us. Snap the ingredients list and we will score it.',
  rate_limited: 'That is a lot of scans for one day. Try again tomorrow.',
  offline: 'No connection. Check your internet and try again.',
  timeout: 'That took too long. Your photo is still here, so just try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
} as const

export async function scanFood(input: { species: Species; lifeStage: LifeStage; images?: string[]; barcode?: string }): Promise<ScanResponse> {
  if (PREVIEW) {
    // Preview mode: no backend configured. Alternate the two canned results so every state can be seen.
    await new Promise((r) => setTimeout(r, 2600))
    const pick = Math.random() < 0.5 ? SAMPLE_POOR : SAMPLE_GOOD
    return { id: newId(), source: input.barcode ? 'barcode' : 'label', ...pick }
  }
  let res: Response
  // React Native fetch never times out on its own, so a stuck request would leave the scanner spinning forever.
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 58_000)
  try {
    const token = await idToken()
    res = await fetch(`${API_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(input),
      signal: abort.signal,
    })
  } catch {
    throw abort.signal.aborted ? new ScanError('timeout', MESSAGES.timeout) : new ScanError('offline', MESSAGES.offline)
  } finally {
    clearTimeout(timer)
  }
  if (res.ok) return res.json()
  const code = res.status === 502 || res.status === 504 ? 'timeout' : res.status === 422 ? 'unreadable' : res.status === 404 ? 'barcode_not_found' : res.status === 429 ? 'rate_limited' : 'server'
  throw new ScanError(code, MESSAGES[code])
}
