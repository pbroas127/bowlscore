// Recall alerts: checks the brands in every pet's pantry (main food and treats) against /api/recalls,
// at most once per 12 hours unless the pantry changed. Never prompts for notification permission.
import { API_URL, PREVIEW } from './config'
import { canNotify, notify } from './notify'
import { getState, setState } from './store'
import type { Recall } from './types'

const EVERY_MS = 12 * 60 * 60 * 1000
let running = false

export function pantryBrands() {
  const { pets, scans } = getState()
  const ids = new Set(pets.flatMap((p) => [p.currentScanId, ...p.treatScanIds]))
  return [...new Set(scans.filter((x) => ids.has(x.id)).map((x) => x.label.brand?.trim()).filter((b): b is string => Boolean(b)))].sort()
}

async function fetchRecalls(brands: string[]): Promise<Recall[]> {
  if (PREVIEW) return [{ id: `preview:${brands[0]}`, date: '2026-09-01', brand: brands[0], product: 'Adult recipe, 30 lb bags', reason: 'Possible salmonella contamination in one production lot.', url: API_URL }]
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 15_000)
  try {
    const res = await fetch(`${API_URL}/api/recalls?brands=${brands.map(encodeURIComponent).join(',')}`, { signal: abort.signal })
    if (!res.ok) throw new Error(String(res.status))
    const list = (await res.json())?.recalls
    return Array.isArray(list) ? list.filter((r: Recall) => r?.id && r.brand && r.url) : []
  } finally {
    clearTimeout(timer)
  }
}

export async function checkRecalls() {
  const st = getState()
  const brands = pantryBrands()
  const key = brands.join(',')
  if (running || !st.ready || !brands.length) return
  if (st.recallsCheck?.brands === key && Date.now() - st.recallsCheck.at < EVERY_MS) return
  running = true
  try {
    const fetched = await fetchRecalls(brands)
    const known = new Set([...getState().recalls.map((r) => r.id), ...getState().recallsSeen])
    const fresh = fetched.filter((r) => !known.has(r.id))
    setState((s) => ({ recalls: [...fresh, ...s.recalls].slice(0, 50), recallsCheck: { at: Date.now(), brands: key } }))
    if (fresh.length && (await canNotify())) for (const r of fresh) notify(`Recall notice for ${r.brand}`, [r.product, r.reason].filter(Boolean).join('. '))
  } catch {
    // Offline or the server is down: try again on the next focus.
  } finally {
    running = false
  }
}

export const dismissRecall = (id: string) => setState((s) => ({ recallsSeen: [...new Set([...s.recallsSeen, id])].slice(-200) }))
export const recallDate = (date: string) => {
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}
