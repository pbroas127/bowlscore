// BowlScore scoring rubric. Pure TypeScript, no runtime imports, so the same file runs in the
// Next.js API route (src/app/api/scan/route.ts), in the browser demo on the landing page, and in
// the node test (rubric.test.ts).
//
// The vision model only READS the label. Every point below is decided here, so the same
// label always gets the same score. Bump RUBRIC_VERSION whenever a number changes.
//
// Sources: AAFCO Dog and Cat Food Nutrient Profiles (dry matter minimums), FDA 21 CFR 589.1001
// (propylene glycol prohibited in cat food), Merck Veterinary Manual (taurine, allium toxicity).
//
// ponytail: substring and regex matching on ingredient names. Ceiling: novel ingredient spellings
// score as neutral. Upgrade path: a curated ingredient table in Firestore once scan volume shows gaps.

export const RUBRIC_VERSION = 1

export type Species = 'dog' | 'cat'
export type LifeStage = 'growth' | 'adult' | 'senior'
export type FoodForm = 'dry' | 'wet' | 'semi_moist' | 'freeze_dried' | 'raw' | 'unknown'
export type AafcoStatement = 'complete' | 'supplemental' | 'not_found'
export type Severity = 'good' | 'info' | 'caution' | 'warning' | 'critical'

export interface LabelData {
  productName?: string
  brand?: string
  foodForm: FoodForm
  isTreat?: boolean
  ingredients: string[] // label order
  analysis?: {
    proteinMin?: number // percent as fed
    fatMin?: number
    fiberMax?: number
    moistureMax?: number
    ashMax?: number
    taurineMin?: number
  }
  aafco: AafcoStatement
  // Read off the label for the app's "fit for this pet" card and feeding guide. None of these change the score:
  // the same label always gets the same score, whoever scans it.
  lifeStageClaim?: 'all' | 'growth' | 'adult' | 'unknown' // what the AAFCO statement says the food is for
  largeSizeGrowth?: 'included' | 'excluded' | 'unknown' // "including / except for growth of large size dogs (70 lb or more as an adult)"
  calories?: { kcalPerKg?: number; kcalPerCup?: number; kcalPerUnit?: number; unit?: string } // unit: can, treat, pouch, piece...
}

export interface Flag {
  severity: Severity
  title: string
  detail: string
  ingredient?: string
}

export interface ScoreResult {
  rubricVersion: number
  score: number
  grade: 'Excellent' | 'Good' | 'Poor' | 'Bad'
  complete: boolean // false for treats, toppers and supplemental foods
  components: { ingredients: number; nutrition: number | null; additives: number }
  dryMatter: { protein?: number; fat?: number; fiber?: number; carbs?: number; moistureUsed: number }
  flags: Flag[]
  cap?: { limit: number; reason: string }
}

const ANIMALS =
  'chicken|turkey|duck|goose|quail|beef|bison|buffalo|lamb|mutton|goat|pork|venison|elk|rabbit|kangaroo|boar|salmon|tuna|whitefish|herring|menhaden|mackerel|sardine|anchov|trout|cod|pollock|haddock|flounder|catfish|tilapia|minnow|smelt|capelin|shrimp|crab|mussel|clam|egg'
const rx = (s: string) => new RegExp(s, 'i')

const NOT_A_PROTEIN = rx('\\b(fat|oil|flavor|flavour|broth|stock|digest|cartilage|bone broth)\\b')
const NAMED_ANIMAL = rx(`\\b(${ANIMALS})`)
const BYPRODUCT = rx('by[- ]?products?')
const GENERIC_ANIMAL = rx('\\b(meat|poultry|animal|fish)\\b')
const WATER_OR_BROTH = rx('^(water|.*\\bbroth\\b|.*\\bstock\\b)')
const ORGAN = rx('\\b(liver|heart|kidney|gizzard|lung|spleen|tripe)\\b')
const OMEGA_OIL = rx('\\b(salmon oil|fish oil|menhaden oil|herring oil|krill|flaxseed|algae)\\b')

const PLANT_PROTEIN = rx(
  '\\b(corn gluten|corn protein|wheat gluten|pea protein|soy protein|potato protein|rice protein|soybean meal|soy flour)\\b',
)
const FILLER = rx(
  '\\b(corn|maize|wheat|soy|brewers rice|rice hulls|cellulose|middlings|mill run|hulls|sorghum)\\b',
)
const LEGUME = rx('\\b(pea|peas|lentil|lentils|chickpea|chickpeas|garbanzo|fava)\\b')

const has = (list: string[], re: RegExp) => list.find((i) => re.test(i))
const all = (list: string[], re: RegExp) => list.filter((i) => re.test(i))
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const round1 = (n: number) => Math.round(n * 10) / 10

type ProteinKind = 'named_fresh' | 'named_meal' | 'named_byproduct' | 'generic' | 'none'

export function classifyProtein(ingredient: string): ProteinKind {
  const i = ingredient.toLowerCase()
  if (NOT_A_PROTEIN.test(i)) return 'none'
  if (NAMED_ANIMAL.test(i)) {
    if (BYPRODUCT.test(i)) return 'named_byproduct'
    return /\bmeal\b/.test(i) ? 'named_meal' : 'named_fresh'
  }
  if (GENERIC_ANIMAL.test(i) && (BYPRODUCT.test(i) || /\b(meal|bone)\b/.test(i))) return 'generic'
  return 'none'
}

function scoreIngredients(species: Species, ingredients: string[], flags: Flag[]): number {
  // Wet foods list water or broth first for processing. Skip it when judging the first ingredient.
  const solid = ingredients.filter((i) => !WATER_OR_BROTH.test(i.toLowerCase().trim()))
  const top5 = solid.slice(0, 5)
  const cat = species === 'cat'
  let pts = 12

  const first = solid[0]
  const kind = first ? classifyProtein(first) : 'none'
  if (kind === 'named_fresh') {
    pts += 15
    flags.push({ severity: 'good', title: 'Real meat comes first', detail: `${first} is the main ingredient.`, ingredient: first })
  } else if (kind === 'named_meal') {
    pts += 13
    flags.push({ severity: 'good', title: 'Named meat meal comes first', detail: `${first} is a concentrated, named protein source.`, ingredient: first })
  } else if (kind === 'named_byproduct') {
    pts += 8
    flags.push({ severity: 'caution', title: 'Byproduct is the main ingredient', detail: `${first} is a named source, but byproducts vary a lot in quality.`, ingredient: first })
  } else if (kind === 'generic') {
    pts += 4
    flags.push({ severity: 'warning', title: 'Unnamed meat source comes first', detail: `"${first}" does not say which animal it comes from.`, ingredient: first })
  } else if (first) {
    pts += cat ? 0 : 3
    flags.push({
      severity: cat ? 'warning' : 'caution',
      title: 'No meat in first place',
      detail: cat
        ? `Cats must eat meat to thrive, but the main ingredient here is ${first}.`
        : `The main ingredient is ${first}, not an animal protein.`,
      ingredient: first,
    })
  }

  const namedTop = top5.filter((i) => ['named_fresh', 'named_meal'].includes(classifyProtein(i)))
  pts += Math.min(namedTop.length, 3) * 5

  const plantProteins = all(top5, PLANT_PROTEIN)
  pts -= plantProteins.length * (cat ? 6 : 4)
  if (plantProteins.length)
    flags.push({
      severity: cat ? 'warning' : 'caution',
      title: 'Plant protein boosters',
      detail: `${plantProteins.join(', ')} can raise the protein number on the label without adding meat.`,
    })

  const fillers = top5.filter((i) => FILLER.test(i) && !PLANT_PROTEIN.test(i))
  pts -= fillers.length * (cat ? 5 : 3)
  if (fillers.length)
    flags.push({ severity: 'caution', title: 'Fillers near the top', detail: `${fillers.join(', ')} appear in the first five ingredients.` })

  const legumes = all(solid.slice(0, 10), LEGUME)
  if (legumes.length >= 3) {
    pts -= 4
    flags.push({ severity: 'caution', title: 'Ingredient splitting', detail: 'Several pea or legume ingredients are listed separately, which can push meat higher on the list than it deserves.' })
  } else if (!cat && legumes.length >= 2) {
    pts -= 2
    flags.push({ severity: 'info', title: 'Legume heavy recipe', detail: 'The FDA has looked into a possible link between legume heavy diets and heart disease in dogs. Nothing is proven, but it is worth knowing.' })
  }

  const unnamed = ingredients.filter((i) => classifyProtein(i) === 'generic' || /\banimal (fat|digest)\b/i.test(i))
  pts -= Math.min(unnamed.length, 3) * 3
  if (unnamed.length && kind !== 'generic')
    flags.push({ severity: 'caution', title: 'Unnamed animal ingredients', detail: `${unnamed.slice(0, 3).join(', ')}: the label does not say which animal.` })

  let bonus = 0
  if (has(ingredients, ORGAN)) bonus += 3
  if (has(ingredients, OMEGA_OIL)) bonus += 3
  if (ingredients.some((i) => NAMED_ANIMAL.test(i) && /\bfat\b/i.test(i))) bonus += 2
  pts += bonus
  if (has(ingredients, OMEGA_OIL))
    flags.push({ severity: 'good', title: 'Omega rich oils', detail: 'Contains a named source of omega fatty acids for skin and coat.' })

  return clamp(pts, 0, 50)
}

const ASSUMED_MOISTURE: Record<FoodForm, number> = { dry: 10, wet: 78, semi_moist: 30, freeze_dried: 5, raw: 70, unknown: 10 }

function scoreNutrition(
  species: Species,
  stage: LifeStage,
  label: LabelData,
  flags: Flag[],
): { pts: number | null; dm: ScoreResult['dryMatter'] } {
  const a = label.analysis ?? {}
  const moistureUsed = a.moistureMax ?? ASSUMED_MOISTURE[label.foodForm]
  const solids = 100 - moistureUsed
  if (a.proteinMin == null || a.fatMin == null || solids <= 0) {
    flags.push({ severity: 'info', title: 'Nutrition panel not read', detail: 'We could not read the guaranteed analysis, so this score is based on ingredients only. Try a photo of the nutrition panel.' })
    return { pts: null, dm: { moistureUsed } }
  }
  // AAFCO minimums are on a dry matter basis, so remove the water first. This is what makes wet food comparable to kibble.
  const toDm = (v: number) => (v / solids) * 100
  const protein = toDm(a.proteinMin)
  const fat = toDm(a.fatMin)
  const fiber = toDm(a.fiberMax ?? (label.foodForm === 'wet' ? 1 : 4))
  const ash = toDm(a.ashMax ?? (label.foodForm === 'wet' ? 2 : 7))
  const carbs = clamp(100 - protein - fat - fiber - ash, 0, 100)
  const cat = species === 'cat'
  const growth = stage === 'growth'

  const proteinMin = cat ? (growth ? 30 : 26) : growth ? 22.5 : 18
  const proteinIdeal = cat ? 45 : 30
  let pts = 0
  if (protein < proteinMin) {
    flags.push({ severity: 'critical', title: 'Protein below the minimum', detail: `About ${round1(protein)}% protein once water is removed. The AAFCO minimum for ${growth ? (cat ? 'kittens' : 'puppies') : `adult ${cat ? 'cats' : 'dogs'}`} is ${proteinMin}%.` })
  } else {
    pts += 6 + 8 * clamp((protein - proteinMin) / (proteinIdeal - proteinMin), 0, 1)
    if (protein >= proteinIdeal)
      flags.push({ severity: 'good', title: 'High protein', detail: `About ${round1(protein)}% protein once water is removed.` })
  }

  const fatMin = cat ? 9 : growth ? 8.5 : 5.5
  const [bandLo, bandHi] = cat ? [15, 28] : [12, 22]
  if (fat < fatMin) {
    flags.push({ severity: 'warning', title: 'Fat below the minimum', detail: `About ${round1(fat)}% fat once water is removed. The AAFCO minimum is ${fatMin}%.` })
  } else if (fat >= bandLo && fat <= bandHi) pts += 8
  else if (fat > bandHi + 10) {
    pts += 5
    flags.push({ severity: 'info', title: 'Very high fat', detail: `About ${round1(fat)}% fat once water is removed. Fine for active pets, heavy for couch potatoes.` })
  } else pts += 6

  const steps: [number, number][] = cat ? [[15, 8], [25, 6], [35, 3]] : [[30, 8], [45, 6], [55, 3]]
  pts += steps.find(([limit]) => carbs <= limit)?.[1] ?? (cat ? 0 : 1)
  if (carbs > steps[2][0])
    flags.push({
      severity: cat ? 'warning' : 'caution',
      title: 'Heavy on carbs',
      detail: `Roughly ${Math.round(carbs)}% of the dry food is carbohydrate.${cat ? ' Cats have very little need for carbs.' : ''}`,
    })

  return { pts: clamp(pts, 0, 30), dm: { protein: round1(protein), fat: round1(fat), fiber: round1(fiber), carbs: round1(carbs), moistureUsed } }
}

interface AdditiveRule {
  re: RegExp
  title: string
  detail: string
  severity: Severity
  penalty: number
  group: string
  groupMax: number
  capCat?: number
  capDog?: number
}

const ADDITIVES: AdditiveRule[] = [
  { re: rx('\\b(red ?(40|3)|yellow ?(5|6)|blue ?(1|2)|titanium dioxide|artificial colou?r|added colou?r|caramel colou?r)\\b'), title: 'Artificial color', detail: 'Dyes are there for the human buying the bag. Your pet does not care what color the food is.', severity: 'caution', penalty: 4, group: 'color', groupMax: 8 },
  { re: rx('\\b(bha|bht|ethoxyquin|tbhq|butylated hydroxy)'), title: 'Synthetic preservative', detail: 'BHA, BHT and ethoxyquin are legal but controversial. Better foods preserve with vitamin E instead.', severity: 'warning', penalty: 5, group: 'preservative', groupMax: 10 },
  { re: rx('\\bpropylene glycol\\b'), title: 'Propylene glycol', detail: 'Keeps soft food moist. The FDA prohibits it in cat food because it damages feline red blood cells.', severity: 'warning', penalty: 5, group: 'pg', groupMax: 5, capCat: 15 },
  { re: rx('\\bxylitol|birch sugar\\b'), title: 'Xylitol', detail: 'Xylitol is toxic to dogs even in small amounts.', severity: 'critical', penalty: 10, group: 'xylitol', groupMax: 10, capDog: 5, capCat: 20 },
  { re: rx('\\bonions?\\b'), title: 'Onion', detail: 'Onion in any form damages red blood cells in dogs and cats.', severity: 'critical', penalty: 8, group: 'allium', groupMax: 8, capDog: 30, capCat: 25 },
  { re: rx('\\bgarlic\\b'), title: 'Garlic', detail: 'Garlic belongs to the same family as onion. Cats are especially sensitive to it.', severity: 'warning', penalty: 4, group: 'allium', groupMax: 8, capCat: 35 },
  { re: rx('\\b(sugar|sucrose|corn syrup|fructose|dextrose|molasses|cane)\\b'), title: 'Added sugar', detail: 'Sweeteners make food more tempting and add nothing your pet needs.', severity: 'caution', penalty: 3, group: 'sugar', groupMax: 3 },
  { re: rx('\\bcarrageenan\\b'), title: 'Carrageenan', detail: 'A common thickener in wet food. Evidence is mixed, but some pets with sensitive stomachs do better without it.', severity: 'info', penalty: 2, group: 'carrageenan', groupMax: 2 },
  { re: rx('\\bmenadione\\b'), title: 'Menadione', detail: 'A synthetic vitamin K source that many premium brands have moved away from.', severity: 'info', penalty: 2, group: 'menadione', groupMax: 2 },
]

function scoreAdditives(species: Species, ingredients: string[], flags: Flag[]): { pts: number; cap?: ScoreResult['cap'] } {
  let pts = 20
  let cap: ScoreResult['cap']
  const spent: Record<string, number> = {}
  for (const rule of ADDITIVES) {
    for (const ingredient of all(ingredients, rule.re)) {
      const left = rule.groupMax - (spent[rule.group] ?? 0)
      const penalty = Math.min(rule.penalty, left)
      spent[rule.group] = (spent[rule.group] ?? 0) + penalty
      pts -= penalty
      const limit = species === 'cat' ? rule.capCat : rule.capDog
      const capped = limit != null
      flags.push({ severity: capped ? 'critical' : rule.severity, title: rule.title, detail: rule.detail, ingredient })
      if (capped && (!cap || limit < cap.limit)) cap = { limit, reason: rule.title }
    }
  }
  if (has(ingredients, rx('\\b(mixed tocopherols|rosemary extract)\\b')))
    flags.push({ severity: 'good', title: 'Natural preservatives', detail: 'Preserved with vitamin E or rosemary instead of synthetic chemicals.' })
  return { pts: clamp(pts, 0, 20), cap }
}

export function gradeFor(score: number): ScoreResult['grade'] {
  return score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Poor' : 'Bad'
}

export function scoreFood(label: LabelData, species: Species, stage: LifeStage = 'adult'): ScoreResult {
  const flags: Flag[] = []
  const ingredients = label.ingredients.map((i) => i.trim()).filter(Boolean)
  const complete = label.aafco === 'complete' && !label.isTreat

  const ing = scoreIngredients(species, ingredients, flags)
  const nut = complete ? scoreNutrition(species, stage, label, flags) : { pts: null, dm: { moistureUsed: label.analysis?.moistureMax ?? ASSUMED_MOISTURE[label.foodForm] } }
  const add = scoreAdditives(species, ingredients, flags)

  if (!complete)
    flags.push(
      label.isTreat
        ? { severity: 'info', title: 'This is a treat', detail: 'Scored on ingredients only. Treats should stay under ten percent of daily calories.' }
        : label.aafco === 'supplemental'
          ? { severity: 'warning', title: 'Not a complete meal', detail: 'The label says this food is for intermittent or supplemental feeding only. It should not be the whole diet.' }
          : { severity: 'caution', title: 'No complete and balanced statement found', detail: 'We could not find an AAFCO statement on the label, so this is scored on ingredients only.' },
    )

  if (species === 'cat' && complete) {
    const taurine = label.analysis?.taurineMin != null || has(ingredients, rx('\\btaurine\\b'))
    if (taurine) flags.push({ severity: 'good', title: 'Taurine included', detail: 'Cats cannot make enough taurine on their own, and this food adds it.' })
    else flags.push({ severity: 'critical', title: 'No taurine listed', detail: 'Cats need taurine for heart and eye health, and we could not find it on this label.' })
  }

  // Nutrition is worth 30 of 100. When it cannot be judged, rescale the other 70 points to 100.
  let score = nut.pts == null ? ((ing + add.pts) / 70) * 100 : ing + nut.pts + add.pts
  if (species === 'cat' && complete && flags.some((f) => f.title === 'No taurine listed')) score -= 8
  if (flags.some((f) => f.title === 'Protein below the minimum')) score = Math.min(score, 45)
  if (add.cap) score = Math.min(score, add.cap.limit)
  score = Math.round(clamp(score, 1, 100))

  // Three dyes should read as one "Artificial color" row listing all three, not three identical rows.
  const merged: Flag[] = []
  for (const f of flags) {
    const same = merged.find((m) => m.title === f.title)
    if (!same) merged.push({ ...f })
    else if (f.ingredient && !same.ingredient?.includes(f.ingredient)) same.ingredient = same.ingredient ? `${same.ingredient}, ${f.ingredient}` : f.ingredient
  }
  const order: Severity[] = ['critical', 'warning', 'caution', 'info', 'good']
  merged.sort((x, y) => order.indexOf(x.severity) - order.indexOf(y.severity))

  return {
    rubricVersion: RUBRIC_VERSION,
    score,
    grade: gradeFor(score),
    complete,
    components: { ingredients: ing, nutrition: nut.pts == null ? null : Math.round(nut.pts), additives: add.pts },
    dryMatter: nut.dm,
    flags: merged,
    cap: add.cap,
  }
}
