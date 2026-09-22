// The scored product catalog: the saved copy shows instantly, and a fresh one is fetched in the background every time the
// app opens or comes back (at most every 5 minutes). About 25 KB gzipped (half a second), so it never slows the app down.
// Offline the saved copy is served; with none at all `useCatalog()` returns undefined and product sections show placeholders.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { API_URL, PREVIEW } from './config'
import { SAMPLE_CATALOG } from './sample'
import type { Catalog, CatalogProduct } from './types'

export * from './recommend'

// v2: copies saved before sizes and exact links existed are dropped instead of lingering.
const KEY = 'bowlscore.catalog.v2'
export const REFRESH_MS = 5 * 60 * 1000

let catalog: Catalog | undefined = PREVIEW ? SAMPLE_CATALOG : undefined
let fetchedAt = 0
let loading: Promise<void> | undefined
const listeners = new Set<() => void>()
const publish = (next: Catalog) => { catalog = next; listeners.forEach((l) => l()) }

// A bad row must never crash a screen, so anything without the fields the UI reads is dropped.
const usable = (p: CatalogProduct) => Boolean(p?.id && p.name && p.label?.ingredients && typeof p.result?.score === 'number' && p.result.flags && p.result.dryMatter && p.links)

async function load(force: boolean) {
  if (!catalog) {
    let cached: (Catalog & { fetchedAt?: number }) | undefined
    try { cached = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null') ?? undefined } catch {}
    if (cached?.products?.length) { fetchedAt = cached.fetchedAt ?? 0; publish({ version: cached.version, products: cached.products.filter(usable) }) }
  }
  if (!force && Date.now() - fetchedAt < REFRESH_MS) return
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 20_000)
  try {
    const res = await fetch(`${API_URL}/api/catalog`, { signal: abort.signal })
    if (!res.ok) return
    const body = (await res.json()) as Catalog
    const next = { version: String(body.version), products: (body.products ?? []).filter(usable) }
    if (!next.products.length) return
    fetchedAt = Date.now()
    if (next.version !== catalog?.version || next.products.length !== catalog.products.length) publish(next)
    AsyncStorage.setItem(KEY, JSON.stringify({ ...next, fetchedAt })).catch(() => {})
    AsyncStorage.removeItem('bowlscore.catalog.v1').catch(() => {})
  } finally {
    clearTimeout(timer)
  }
}

// Safe to call often (app start, coming back to the app, Home focus): it only hits the network every 5 minutes.
export function refreshCatalog(force = false) {
  if (PREVIEW) return Promise.resolve()
  loading ??= load(force).catch(() => {}).finally(() => { loading = undefined })
  return loading
}

export function useCatalog(): Catalog | undefined {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => catalog, () => catalog)
}
