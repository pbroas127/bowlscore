// Maps an Open Pet Food Facts product (api/v2/product/{barcode}.json) to the LabelData the rubric scores.
import type { AafcoStatement, FoodForm, LabelData } from './rubric.ts'

// "Chicken, rice (brown, white), salt." splits into 3 items: commas inside brackets stay put.
export function splitIngredients(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text.replace(/^\s*ingredients?\s*:\s*/i, '')) {
    if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1)
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(current)
      current = ''
    } else current += ch
  }
  out.push(current)
  return out.map((i) => i.replace(/[_*]/g, '').replace(/\.\s*$/, '').trim()).filter(Boolean)
}

export interface OpffProduct {
  product_name?: string
  brands?: string
  generic_name?: string
  ingredients_text_en?: string
  ingredients_text?: string
  categories?: string
  categories_tags?: string[]
  labels?: string
  nutriments?: Record<string, unknown>
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)

export function labelFromOpff(p: OpffProduct): { label: LabelData; speciesOnLabel: 'dog' | 'cat' | 'unknown' } | null {
  const ingredients = splitIngredients(p.ingredients_text_en || p.ingredients_text || '')
  if (!ingredients.length) return null

  const about = [p.product_name, p.generic_name, p.categories, p.labels, ...(p.categories_tags ?? [])].filter(Boolean).join(' ').toLowerCase()
  const n = p.nutriments ?? {}
  const proteinMin = num(n.proteins_100g)
  const moistureMax = num(n.moisture_100g)

  let foodForm: FoodForm = /\b(wet|canned|cans?|pouch|pate|pâté|gravy|jelly|humide)\b/.test(about) ? 'wet' : /\b(dry|kibble|croquettes?|sec|seche)\b/.test(about) ? 'dry' : 'unknown'
  // ponytail: the rubric assumes 10 percent moisture for unknown forms. As fed protein under 14 percent
  // is almost never a dry food, so treat it as wet instead of failing it on dry matter protein.
  if (foodForm === 'unknown' && moistureMax == null && proteinMin != null && proteinMin < 14) foodForm = 'wet'

  // Open Pet Food Facts numbers are crowd sourced and sometimes entered per serving. A panel that cannot be
  // real (under 4 percent protein, or a dry food under 10) is dropped so it cannot trigger a false protein cap.
  const plausible = proteinMin == null || (proteinMin >= 4 && !(foodForm === 'dry' && proteinMin < 10))

  const aafco: AafcoStatement = /complete (and|&) balanced|aafco|complete (pet |dog |cat )?food|aliment complet/.test(about)
    ? 'complete'
    : /supplemental|intermittent|complementary|aliment compl[eé]mentaire/.test(about)
      ? 'supplemental'
      : 'not_found'

  const dog = /\b(dogs?|pupp(y|ies)|chiens?)\b/.test(about)
  const cat = /\b(cats?|kittens?|chats?)\b/.test(about)

  return {
    label: {
      productName: p.product_name || undefined,
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      foodForm,
      isTreat: /\b(treats?|snacks?|chews?|biscuits?|friandises?)\b/.test(about),
      ingredients,
      analysis: plausible ? { proteinMin, fatMin: num(n.fat_100g), fiberMax: num(n.fiber_100g), moistureMax, ashMax: num(n.ash_100g) } : undefined,
      aafco,
    },
    speciesOnLabel: dog === cat ? 'unknown' : dog ? 'dog' : 'cat',
  }
}
