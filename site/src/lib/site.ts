// Facts used in more than one place. Copy rule for everything user visible: no hyphens, no dashes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bowlscore.app').replace(/\/$/, '')
export const APP_STORE_ID = '6814359922'
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`
export const SUPPORT_EMAIL = 'support@bowlscore.app'
export const EFFECTIVE_DATE = 'September 21, 2026'
export const PRICE_MONTHLY = '5.99'
export const PRICE_YEARLY = '34.99'

export const AMAZON_SENTENCE = 'As an Amazon Associate I earn from qualifying purchases.'
export const NOT_VET = 'BowlScore is not veterinary advice.'
export const NOT_VET_LONG =
  "BowlScore is an educational tool, not veterinary advice. Scores reflect ingredient lists, not your pet's individual health needs. Talk to your veterinarian before changing your pet's diet, especially for puppies, kittens, seniors, or pets with medical conditions."

export const GRADE_COLOR = { Excellent: '#22B866', Good: '#8CCB3F', Poor: '#F5862E', Bad: '#E5484D' } as const
export const SEVERITY_COLOR = { critical: '#E5484D', warning: '#E5484D', caution: '#F5862E', info: '#E0A800', good: '#22B866' } as const

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'How is the score calculated?',
    a: 'Every food starts from the same public rubric. Ingredients are worth 50 points, nutrition on a dry matter basis is worth 30, and additives are worth 20. A few ingredients, like onion or xylitol, cap the score no matter what else is in the recipe. The full method is on the methodology page.',
  },
  {
    q: 'Is this veterinary advice?',
    a: NOT_VET_LONG,
  },
  {
    q: 'Do brands pay you?',
    a: 'No. Brands cannot pay to change a score, we do not run ads, and every food is scored the same way. When we suggest a better food we may earn a commission if you buy it through our link. Commissions never change a score or the order of the suggestions.',
  },
  {
    q: 'Does it work for cats?',
    a: 'Yes, and cats get their own rules. Cats need more protein than dogs, they need taurine on the label, and propylene glycol is prohibited in cat food by the FDA, so it caps the score at 15.',
  },
  {
    q: 'What does it cost?',
    a: `BowlScore Premium is $${PRICE_YEARLY} per year with a 3 day free trial, or $${PRICE_MONTHLY} per month. Both renew automatically until you cancel.`,
  },
  {
    q: 'How do I cancel?',
    a: 'Open Settings on your iPhone, tap your name, tap Subscriptions, choose BowlScore and tap Cancel Subscription. Cancel at least 24 hours before the renewal date and you will not be charged again.',
  },
  {
    q: 'What happens to my photos?',
    a: 'A label photo is sent to our server and to Google Gemini so the text can be read. We do not store the photo. We keep only the text that was read and the score, so your scan history works.',
  },
  {
    q: 'Which foods are covered?',
    a: 'Any dog or cat food with a printed ingredient list: dry, wet, fresh, freeze dried, raw and treats. If a barcode is not in the Open Pet Food Facts database yet, snap the ingredient list instead and you still get a score.',
  },
]

export type Evidence = 'Avoid' | 'Caution' | 'Debated'

export const RED_FLAGS: { name: string; tag: Evidence; why: string; source: string; href: string }[] = [
  {
    name: 'BHA',
    tag: 'Avoid',
    why: 'A synthetic preservative the National Toxicology Program lists as reasonably anticipated to be a human carcinogen. Vitamin E does the same job.',
    source: 'NTP Report on Carcinogens',
    href: 'https://ntp.niehs.nih.gov/whatwestudy/assessments/cancer/roc',
  },
  {
    name: 'BHT',
    tag: 'Debated',
    why: 'A close cousin of BHA. The FDA allows it in animal feed and the research on it points both ways.',
    source: 'FDA, 21 CFR 582.3173',
    href: 'https://www.ecfr.gov/current/title-21/section-582.3173',
  },
  {
    name: 'Ethoxyquin',
    tag: 'Caution',
    why: 'A preservative that often arrives inside fish meal. The FDA caps how much a finished feed may contain.',
    source: 'FDA, 21 CFR 573.380',
    href: 'https://www.ecfr.gov/current/title-21/section-573.380',
  },
  {
    name: 'Artificial colors',
    tag: 'Caution',
    why: 'Red 40, Yellow 5 and Blue 2 are there for the person buying the bag. Your pet does not care what color dinner is.',
    source: 'FDA on color additives',
    href: 'https://www.fda.gov/industry/color-additives',
  },
  {
    name: 'Unnamed animal fat or meat meal',
    tag: 'Caution',
    why: 'When a label says animal fat or meat meal without naming the animal, the source can change from batch to batch.',
    source: 'AAFCO on ingredient names',
    href: 'https://www.aafco.org/consumers/understanding-pet-food/',
  },
  {
    name: 'Propylene glycol',
    tag: 'Avoid',
    why: 'Keeps soft food moist. It damages feline red blood cells, so the FDA prohibits it in cat food. For cats it caps the score at 15.',
    source: 'FDA, 21 CFR 589.1001',
    href: 'https://www.ecfr.gov/current/title-21/section-589.1001',
  },
]
