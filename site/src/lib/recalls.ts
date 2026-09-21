// Pet food recalls, filtered by brand.
//
// Where the data comes from (researched with real queries on 2026-09-21):
//   openFDA food/enforcement     human food only (CFSAN). "dog food" finds 2 rows ever (a grocery wholesaler, 2019),
//                                "cat food" finds none, and known pet food recallers (Blue Ridge Beef, Mid America
//                                Pet Food) are absent. product_type is always "Food", there is no "Veterinary" type.
//   openFDA animalandveterinary  only has /event (adverse drug events). /enforcement and /recall do not exist (404).
//   So openFDA does not carry animal food recalls at all. The FDA's own recall table does:
//   https://www.fda.gov/datatables-json/recalls-market-withdrawals.json is the free, keyless JSON behind
//   fda.gov/safety/recalls-market-withdrawals-safety-alerts. About 1,000 rows back to 2017, each with a structured
//   brand name, company, product, reason and a product type ("Animal & Veterinary"), about 30 animal rows a year.
//
// Brand matching is reliable here because the feed has a real brand field. A requested brand must appear as whole
// words in the brand or company name. The free text product description is only searched for brands of two or more
// words ("Blue Buffalo"), since a single common word ("Wellness", "Instinct") could show up in any description.
// ponytail: whole word match, no alias table. Ceiling: "Purina ONE" will not find a recall filed under plain "Purina".
// The app should send the parent brand too when it wants those. Upgrade path: a brand to parent map in the catalog.

export const FDA_RECALLS_URL = 'https://www.fda.gov/datatables-json/recalls-market-withdrawals.json'

export interface FdaRow {
  path: string
  field_change_date_2: string // MM/DD/YYYY
  field_brand_name: string // an <a> tag around the brand
  field_product_description: string
  field_recall_reason_description: string
  field_company_name: string
  field_regulated_product_field: string
}

export interface Recall { id: string; date: string; brand: string; product: string; reason: string; url: string }

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ', reg: '®', trade: '™' }
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

const words = (s: string) => ` ${s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `

export function pickRecalls(rows: FdaRow[], brands: string[], now = new Date()): Recall[] {
  const since = new Date(now)
  since.setMonth(since.getMonth() - 24)
  const wanted = brands.map(words).filter((b) => b.trim())
  const out: Recall[] = []
  for (const row of rows) {
    if (!/animal/i.test(row.field_regulated_product_field ?? '')) continue
    const [mm, dd, yyyy] = (row.field_change_date_2 ?? '').split('/')
    const date = `${yyyy}-${mm}-${dd}`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < since.toISOString().slice(0, 10)) continue
    const brand = plain(row.field_brand_name ?? '')
    const product = plain(row.field_product_description ?? '')
    const named = words(`${brand} | ${plain(row.field_company_name ?? '')}`)
    const described = words(product)
    if (wanted.length && !wanted.some((b) => named.includes(b) || (b.trim().includes(' ') && described.includes(b)))) continue
    out.push({ id: row.path.split('/').pop() ?? row.path, date, brand, product, reason: plain(row.field_recall_reason_description ?? ''), url: `https://www.fda.gov${row.path}` })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}
