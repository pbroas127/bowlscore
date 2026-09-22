// usage: node scripts/apply-asins.mjs <results.txt> [more.txt ...]
// Turns Amazon listing lookups, gathered by hand from Amazon search pages whose titles matched the product, into a patch
// file for build-catalog.mjs --patch. Each line: "<catalog id>|<asin of the best match>|<lb>:<asin>;<lb>:<asin>..."
// Search pages mix neighbours in, so three rules keep a wrong bag from ever being linked:
//   1. a listing claimed by two different products is ambiguous and dropped from both,
//   2. dry food ignores anything under 1.5 lb (cans and samples) and wet food anything over 3 lb (bags),
//   3. a size gets a listing only when its weight matches within 0.3 lb.
import fs from 'node:fs'
import path from 'node:path'

const catalog = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/data/catalog.json'), 'utf8'))
const rows = process.argv.slice(2).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n')).map((l) => l.trim()).filter((l) => l.split('|').length === 3)
  .map((l) => { const [id, asin, sizes] = l.split('|'); return { id, asin, found: sizes.split(';').filter(Boolean).map((p) => { const [lb, a] = p.split(':'); return { lb: Number(lb), asin: a } }) } })

const owners = new Map()
for (const r of rows) for (const a of new Set([r.asin, ...r.found.map((f) => f.asin)])) owners.set(a, (owners.get(a) ?? 0) + 1)
const unique = (a) => /^[A-Z0-9]{10}$/.test(a) && owners.get(a) === 1

const label = (lb) => (lb < 1 ? `${Math.round(lb * 16)} oz` : `${lb} lb`)
const patch = []
let skipped = 0
for (const r of rows) {
  const e = catalog.find((x) => x.id === r.id)
  if (!e) continue
  const wet = e.form === 'wet'
  const plausible = (lb) => (e.form === 'treat' ? lb <= 5 : wet ? lb <= 3 : lb >= 1.5)
  const found = r.found.filter((f) => f.lb > 0 && plausible(f.lb) && unique(f.asin))
  // The default: the best match itself when its size is plausible (or unknown), else the most common real size found.
  const bestLb = r.found.find((f) => f.asin === r.asin)?.lb
  const asin = unique(r.asin) && (bestLb == null || plausible(bestLb)) ? r.asin : found.sort((a, b) => b.lb - a.lb)[Math.floor(found.length / 2)]?.asin
  if (!asin && !found.length) { skipped++; continue }
  const near = (lb) => found.find((f) => Math.abs(f.lb - lb) <= 0.3)
  const sizes = e.sizes?.length
    ? e.sizes.map((s) => (s.asin || !near(s.lb) ? s : { ...s, asin: near(s.lb).asin }))
    : found.sort((a, b) => a.lb - b.lb).map((f) => ({ label: label(f.lb), lb: f.lb, asin: f.asin }))
  patch.push({ id: r.id, ...(!e.asin && asin && { asin }), ...(sizes.length && { sizes }) })
}
const out = path.resolve(import.meta.dirname, 'catalog-batches/asins-patch.json')
fs.writeFileSync(out, JSON.stringify(patch, null, 1))
console.log(`${patch.length} products patched (${patch.filter((p) => p.asin).length} new default listings, ${patch.reduce((n, p) => n + (p.sizes ?? []).filter((s) => s.asin).length, 0)} sized listings), ${skipped} left on search, ${[...owners.values()].filter((n) => n > 1).length} ambiguous listings dropped`)
