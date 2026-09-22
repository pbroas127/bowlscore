// The product catalog: src/data/catalog.json (built by scripts/build-catalog.mjs) scored by the rubric.
// Scores are always computed here, never stored, so a rubric change can never leave a stale number behind.
import data from '../data/catalog.json' with { type: 'json' }
import { RUBRIC_VERSION, scoreFood, type LabelData, type ScoreResult, type Species } from './rubric.ts'
import { SITE_URL } from './site.ts'

export interface CatalogEntry {
  id: string
  brand: string
  name: string
  species: Species
  form: 'dry' | 'wet' | 'freeze_dried' | 'raw' | 'treat'
  lifeStage: 'all' | 'growth' | 'adult' | 'senior'
  priceTier: 1 | 2 | 3
  label: LabelData
  sourceUrl: string
  image: string | null
  amazonQuery: string
  sizes?: { label: string; lb: number; asin?: string }[] // small to large; lb is the whole pack for wet food
  asin?: string // the most common size, the default link
  line?: string // shared by entries that are flavors or life stages of one product line
}

export type CatalogSize = { label: string; lb: number; asin?: string; url: string }
export type CatalogProduct = Omit<CatalogEntry, 'amazonQuery' | 'sizes'> & { sizes?: CatalogSize[]; result: ScoreResult; links: { amazon: string } }

export const CATALOG = data as CatalogEntry[]

const absolute = (image: string | null) => (image ? SITE_URL + image : null)

const TAG = 'bowlscore-20'
// A known ASIN opens that exact product page; otherwise an Amazon search, which still carries the tag.
const amazon = (asin: string | undefined, query: string) =>
  asin ? `https://www.amazon.com/dp/${asin}?tag=${TAG}` : `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${TAG}`

// A size without its own listing links to the nearest size that has one (then the product's own listing): the same food
// in a different bag beats dropping the shopper into a whole search page. Search is the last resort.
const nearestAsin = (lb: number, sizes: { lb: number; asin?: string }[], fallback?: string) =>
  sizes.filter((s) => s.asin).sort((a, b) => Math.abs(a.lb - lb) - Math.abs(b.lb - lb))[0]?.asin ?? fallback

export const PRODUCTS: CatalogProduct[] = CATALOG.map(({ amazonQuery, sizes, ...entry }) => ({
  ...entry,
  ...(sizes && { sizes: sizes.map((s) => ({ ...s, url: amazon(s.asin ?? nearestAsin(s.lb, sizes, entry.asin), `${amazonQuery} ${s.label}`) })) }),
  image: absolute(entry.image),
  result: scoreFood(entry.label, entry.species, entry.lifeStage === 'growth' ? 'growth' : 'adult'),
  links: { amazon: amazon(entry.asin, amazonQuery) },
}))

// Changes whenever the rubric or any catalog byte changes, so the app knows when to refresh its copy.
const text = JSON.stringify(data)
let hash = 5381
for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
export const CATALOG_VERSION = `${RUBRIC_VERSION}.${CATALOG.length}.${hash.toString(36)}`

// ---- matching a scanned product to a catalog entry ----
// ponytail: token overlap, no fuzzy spelling. Ceiling: a typo in a UPC database title means no match, which is the
// safe direction (a wrong match shows the wrong photo). Upgrade path: a barcode column in the catalog.

const NOISE = new Set('dog dogs cat cats pet food foods dry wet canned can kibble natural premium recipe formula flavor flavors flavour with and in for the a of real adult high protein lb lbs oz bag pack count ct case'.split(' '))
export function tokens(s: string): string[] {
  const words = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\x00-\x7f]/g, '') // after NFD the accent is its own code point, so "pâté" becomes "pate"
    .replace(/&|\+/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/\b[\d.]+\s*(lbs?|oz|kg|g|ct|count|pack)\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !NOISE.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)) // flavors and flavor, peas and pea
  return [...new Set(words)]
}

// Words that name a different product when they differ. A scan and an entry must agree on all of them.
const VARIANT = new Set(
  tokens(
    'puppy kitten senior small large mini toy giant medium breed bites indoor weight healthy sensitive hairball urinary lite light grain free limited wilderness chicken turkey duck beef bison venison lamb pork rabbit salmon tuna whitefish fish seafood ocean trout herring egg liver giblets rice oatmeal barley potato pea pate gravy stew shredded loaf morsels patties freeze dried raw air treats biscuits dental',
  ),
)

export function matchCatalog(scan: { brand?: string; name?: string; species?: Species | 'unknown'; isTreat?: boolean; form?: string }): CatalogEntry | null {
  if (!scan.name) return null
  const scanned = new Set(tokens(`${scan.brand ?? ''} ${scan.name}`))
  let best: { entry: CatalogEntry; score: number } | null = null
  let tie = false
  for (const entry of CATALOG) {
    if ((scan.species === 'dog' || scan.species === 'cat') && scan.species !== entry.species) continue
    if (scan.isTreat != null && scan.isTreat !== (entry.form === 'treat')) continue
    if ((scan.form === 'dry' || scan.form === 'wet') && (entry.form === 'dry' || entry.form === 'wet') && scan.form !== entry.form) continue
    const brand = tokens(entry.brand)
    if (!brand.every((t) => scanned.has(t))) continue
    const name = tokens(entry.name).filter((t) => !brand.includes(t))
    const rest = [...scanned].filter((t) => !brand.includes(t))
    const variantsAgree = rest.filter((t) => VARIANT.has(t)).sort().join() === name.filter((t) => VARIANT.has(t)).sort().join()
    if (!variantsAgree) continue
    const hit = name.filter((t) => scanned.has(t)).length
    // A one word recipe name ("Original", "Complete") is only trusted when the species is known.
    if (hit < 2 && !(name.length === 1 && hit === 1 && scan.species === entry.species)) continue
    if (hit / name.length < 0.8) continue
    const score = hit / name.length + hit / Math.max(rest.length, 1)
    if (best && Math.abs(score - best.score) < 0.05) tie = true
    else if (!best || score > best.score) { best = { entry, score }; tie = false }
  }
  return tie ? null : (best?.entry ?? null)
}

// What the scan route adds to its response. Empty when nothing matches with confidence.
export function scanMatch(label: LabelData, species: Species | 'unknown'): { productId?: string; image?: string | null } {
  const entry = matchCatalog({ brand: label.brand, name: label.productName, species, isTreat: label.isTreat, form: label.foodForm })
  return entry ? { productId: entry.id, image: absolute(entry.image) } : {}
}
