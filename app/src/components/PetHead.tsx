// Breed heads: the app's puppy and kitten head redrawn per breed (scripts/gen-breed-sheet.mjs), so a Bernese owner
// sees a Bernese everywhere inside the app. Onboarding and the paywall keep the original pair on purpose.
import { Image } from 'expo-image'
import { findBreed } from '@/lib/breeds'
import type { Pet, Species } from '@/lib/types'

const DOG_HEADS = {
  golden: require('../../assets/mascots/puppy-head.png'),
  'affenpinscher': require('../../assets/mascots/breeds/affenpinscher-head.png'),
  'airedale-terrier': require('../../assets/mascots/breeds/airedale-terrier-head.png'),
  'akita': require('../../assets/mascots/breeds/akita-head.png'),
  'alaskan-malamute': require('../../assets/mascots/breeds/alaskan-malamute-head.png'),
  'american-bulldog': require('../../assets/mascots/breeds/american-bulldog-head.png'),
  'american-pit-bull-terrier': require('../../assets/mascots/breeds/american-pit-bull-terrier-head.png'),
  'american-staffordshire-terrier': require('../../assets/mascots/breeds/american-staffordshire-terrier-head.png'),
  'australian-cattle-dog': require('../../assets/mascots/breeds/australian-cattle-dog-head.png'),
  'australian-shepherd': require('../../assets/mascots/breeds/australian-shepherd-head.png'),
  'basenji': require('../../assets/mascots/breeds/basenji-head.png'),
  'basset-hound': require('../../assets/mascots/breeds/basset-hound-head.png'),
  'beagle': require('../../assets/mascots/breeds/beagle-head.png'),
  'bedlington-terrier': require('../../assets/mascots/breeds/bedlington-terrier-head.png'),
  'belgian-malinois': require('../../assets/mascots/breeds/belgian-malinois-head.png'),
  'bernese-mountain-dog': require('../../assets/mascots/breeds/bernese-mountain-dog-head.png'),
  'bichon-frise': require('../../assets/mascots/breeds/bichon-frise-head.png'),
  'black-labrador-retriever': require('../../assets/mascots/breeds/black-labrador-retriever-head.png'),
  'bloodhound': require('../../assets/mascots/breeds/bloodhound-head.png'),
  'border-collie': require('../../assets/mascots/breeds/border-collie-head.png'),
  'border-terrier': require('../../assets/mascots/breeds/border-terrier-head.png'),
  'boston-terrier': require('../../assets/mascots/breeds/boston-terrier-head.png'),
  'boxer': require('../../assets/mascots/breeds/boxer-head.png'),
  'brittany': require('../../assets/mascots/breeds/brittany-head.png'),
  'bull-terrier': require('../../assets/mascots/breeds/bull-terrier-head.png'),
  'bulldog': require('../../assets/mascots/breeds/bulldog-head.png'),
  'bullmastiff': require('../../assets/mascots/breeds/bullmastiff-head.png'),
  'cairn-terrier': require('../../assets/mascots/breeds/cairn-terrier-head.png'),
  'cane-corso': require('../../assets/mascots/breeds/cane-corso-head.png'),
  'cardigan-welsh-corgi': require('../../assets/mascots/breeds/cardigan-welsh-corgi-head.png'),
  'cavalier-king-charles-spaniel': require('../../assets/mascots/breeds/cavalier-king-charles-spaniel-head.png'),
  'chesapeake-bay-retriever': require('../../assets/mascots/breeds/chesapeake-bay-retriever-head.png'),
  'chihuahua': require('../../assets/mascots/breeds/chihuahua-head.png'),
  'chinese-shar-pei': require('../../assets/mascots/breeds/chinese-shar-pei-head.png'),
  'chocolate-labrador-retriever': require('../../assets/mascots/breeds/chocolate-labrador-retriever-head.png'),
  'chow-chow': require('../../assets/mascots/breeds/chow-chow-head.png'),
  'cocker-spaniel': require('../../assets/mascots/breeds/cocker-spaniel-head.png'),
  'collie': require('../../assets/mascots/breeds/collie-head.png'),
  'corgi': require('../../assets/mascots/breeds/corgi-head.png'),
  'dachshund': require('../../assets/mascots/breeds/dachshund-head.png'),
  'dalmatian': require('../../assets/mascots/breeds/dalmatian-head.png'),
  'doberman-pinscher': require('../../assets/mascots/breeds/doberman-pinscher-head.png'),
  'english-setter': require('../../assets/mascots/breeds/english-setter-head.png'),
  'english-springer-spaniel': require('../../assets/mascots/breeds/english-springer-spaniel-head.png'),
  'french-bulldog': require('../../assets/mascots/breeds/french-bulldog-head.png'),
  'german-shepherd': require('../../assets/mascots/breeds/german-shepherd-head.png'),
  'german-shorthaired-pointer': require('../../assets/mascots/breeds/german-shorthaired-pointer-head.png'),
  'giant-schnauzer': require('../../assets/mascots/breeds/giant-schnauzer-head.png'),
  'goldendoodle': require('../../assets/mascots/breeds/goldendoodle-head.png'),
  'great-dane': require('../../assets/mascots/breeds/great-dane-head.png'),
  'great-pyrenees': require('../../assets/mascots/breeds/great-pyrenees-head.png'),
  'greyhound': require('../../assets/mascots/breeds/greyhound-head.png'),
  'havanese': require('../../assets/mascots/breeds/havanese-head.png'),
  'irish-setter': require('../../assets/mascots/breeds/irish-setter-head.png'),
  'irish-wolfhound': require('../../assets/mascots/breeds/irish-wolfhound-head.png'),
  'italian-greyhound': require('../../assets/mascots/breeds/italian-greyhound-head.png'),
  'jack-russell-terrier': require('../../assets/mascots/breeds/jack-russell-terrier-head.png'),
  'labradoodle': require('../../assets/mascots/breeds/labradoodle-head.png'),
  'labrador-retriever': require('../../assets/mascots/breeds/labrador-retriever-head.png'),
  'leonberger': require('../../assets/mascots/breeds/leonberger-head.png'),
  'lhasa-apso': require('../../assets/mascots/breeds/lhasa-apso-head.png'),
  'maltese': require('../../assets/mascots/breeds/maltese-head.png'),
  'maltipoo': require('../../assets/mascots/breeds/maltipoo-head.png'),
  'mastiff': require('../../assets/mascots/breeds/mastiff-head.png'),
  'miniature-pinscher': require('../../assets/mascots/breeds/miniature-pinscher-head.png'),
  'miniature-schnauzer': require('../../assets/mascots/breeds/miniature-schnauzer-head.png'),
  'mixed-breed': require('../../assets/mascots/breeds/mixed-breed-head.png'),
  'newfoundland': require('../../assets/mascots/breeds/newfoundland-head.png'),
  'old-english-sheepdog': require('../../assets/mascots/breeds/old-english-sheepdog-head.png'),
  'papillon': require('../../assets/mascots/breeds/papillon-head.png'),
  'pekingese': require('../../assets/mascots/breeds/pekingese-head.png'),
  'pomeranian': require('../../assets/mascots/breeds/pomeranian-head.png'),
  'poodle': require('../../assets/mascots/breeds/poodle-head.png'),
  'portuguese-water-dog': require('../../assets/mascots/breeds/portuguese-water-dog-head.png'),
  'pug': require('../../assets/mascots/breeds/pug-head.png'),
  'rhodesian-ridgeback': require('../../assets/mascots/breeds/rhodesian-ridgeback-head.png'),
  'rottweiler': require('../../assets/mascots/breeds/rottweiler-head.png'),
  'saint-bernard': require('../../assets/mascots/breeds/saint-bernard-head.png'),
  'samoyed': require('../../assets/mascots/breeds/samoyed-head.png'),
  'scottish-terrier': require('../../assets/mascots/breeds/scottish-terrier-head.png'),
  'shetland-sheepdog': require('../../assets/mascots/breeds/shetland-sheepdog-head.png'),
  'shiba-inu': require('../../assets/mascots/breeds/shiba-inu-head.png'),
  'shih-tzu': require('../../assets/mascots/breeds/shih-tzu-head.png'),
  'siberian-husky': require('../../assets/mascots/breeds/siberian-husky-head.png'),
  'soft-coated-wheaten-terrier': require('../../assets/mascots/breeds/soft-coated-wheaten-terrier-head.png'),
  'staffordshire-bull-terrier': require('../../assets/mascots/breeds/staffordshire-bull-terrier-head.png'),
  'vizsla': require('../../assets/mascots/breeds/vizsla-head.png'),
  'weimaraner': require('../../assets/mascots/breeds/weimaraner-head.png'),
  'west-highland-white-terrier': require('../../assets/mascots/breeds/west-highland-white-terrier-head.png'),
  'whippet': require('../../assets/mascots/breeds/whippet-head.png'),
  'yorkshire-terrier': require('../../assets/mascots/breeds/yorkshire-terrier-head.png'),
} as const
const CAT_HEADS = {
  orange: require('../../assets/mascots/kitten-head.png'),
  'abyssinian': require('../../assets/mascots/breeds/abyssinian-head.png'),
  'american-shorthair': require('../../assets/mascots/breeds/american-shorthair-head.png'),
  'bengal': require('../../assets/mascots/breeds/bengal-head.png'),
  'birman': require('../../assets/mascots/breeds/birman-head.png'),
  'black-cat': require('../../assets/mascots/breeds/black-cat-head.png'),
  'british-shorthair': require('../../assets/mascots/breeds/british-shorthair-head.png'),
  'burmese': require('../../assets/mascots/breeds/burmese-head.png'),
  'calico-cat': require('../../assets/mascots/breeds/calico-cat-head.png'),
  'devon-rex': require('../../assets/mascots/breeds/devon-rex-head.png'),
  'domestic-longhair': require('../../assets/mascots/breeds/domestic-longhair-head.png'),
  'domestic-shorthair': require('../../assets/mascots/breeds/domestic-shorthair-head.png'),
  'exotic-shorthair': require('../../assets/mascots/breeds/exotic-shorthair-head.png'),
  'maine-coon': require('../../assets/mascots/breeds/maine-coon-head.png'),
  'norwegian-forest-cat': require('../../assets/mascots/breeds/norwegian-forest-cat-head.png'),
  'oriental-shorthair': require('../../assets/mascots/breeds/oriental-shorthair-head.png'),
  'persian': require('../../assets/mascots/breeds/persian-head.png'),
  'ragdoll': require('../../assets/mascots/breeds/ragdoll-head.png'),
  'russian-blue': require('../../assets/mascots/breeds/russian-blue-head.png'),
  'scottish-fold': require('../../assets/mascots/breeds/scottish-fold-head.png'),
  'siamese': require('../../assets/mascots/breeds/siamese-head.png'),
  'siberian': require('../../assets/mascots/breeds/siberian-head.png'),
  'sphynx': require('../../assets/mascots/breeds/sphynx-head.png'),
  'tuxedo-cat': require('../../assets/mascots/breeds/tuxedo-cat-head.png'),
  'white-cat': require('../../assets/mascots/breeds/white-cat-head.png'),
} as const

const slug = (s: string) => s.replace(/\(.*\)/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// Table names whose slug is not a head name.
const ALIAS: Record<string, string> = {
  'golden-retriever': 'golden', 'miniature-dachshund': 'dachshund', 'schnauzer': 'miniature-schnauzer', 'corgi-cardigan-welsh': 'cardigan-welsh-corgi',
  'lab': 'labrador-retriever', 'labrador': 'labrador-retriever', 'husky': 'siberian-husky', 'pitbull': 'american-pit-bull-terrier', 'pit-bull': 'american-pit-bull-terrier',
  'doodle': 'goldendoodle', 'bernedoodle': 'bernese-mountain-dog', 'yorkie': 'yorkshire-terrier', 'frenchie': 'french-bulldog', 'aussie': 'australian-shepherd',
  'westie': 'west-highland-white-terrier', 'sheltie': 'shetland-sheepdog', 'dobie': 'doberman-pinscher', 'rottie': 'rottweiler', 'mutt': 'mixed-breed', 'schnauzer-giant': 'giant-schnauzer', 'golden-doodle': 'goldendoodle', 'labra-doodle': 'labradoodle', 'black-lab': 'black-labrador-retriever', 'chocolate-lab': 'chocolate-labrador-retriever', 'tabby': 'domestic-shorthair',
}

// The head for a breed name: exact table breed, then alias, then any head whose name shares a word with what was typed.
export function headKeyFor(species: Species, breed?: string): string {
  const heads: Record<string, unknown> = species === 'cat' ? CAT_HEADS : DOG_HEADS
  const fallback = species === 'cat' ? 'orange' : 'golden'
  if (!breed?.trim()) return fallback
  const table = findBreed(species, breed)?.name
  const full = slug(breed.replace(/[()]/g, ' '))
  for (const k of [table === 'Corgi (Cardigan Welsh)' ? 'cardigan-welsh-corgi' : '', ALIAS[full] ?? '', ALIAS[slug(breed)] ?? '', slug(breed), full]) if (k && k in heads) return k
  if (species === 'cat' && table === 'Mixed breed') return fallback
  const words = full.split('-').filter((w) => w.length > 3)
  // "Boston terrier mix" should land on boston-terrier, not the first terrier: most shared words wins.
  let best = fallback, most = 0
  for (const k of Object.keys(heads)) { const n = words.filter((w) => k.split('-').includes(w)).length; if (n > most) { best = k; most = n } }
  return best
}

export const headKeysFor = (species: Species) => Object.keys(species === 'cat' ? CAT_HEADS : DOG_HEADS)
export const headSource = (species: Species, key: string) => (species === 'cat' ? CAT_HEADS : DOG_HEADS)[key as never] ?? (species === 'cat' ? CAT_HEADS.orange : DOG_HEADS.golden)
export const petHeadKey = (pet: Pet) => (pet.look && pet.look in (pet.species === 'cat' ? CAT_HEADS : DOG_HEADS) ? pet.look : headKeyFor(pet.species, pet.breed))

// The editor's "Look" row: the breed's own head first, then common coats for pets that do not match the breed picture.
const COATS = { dog: ['golden', 'labrador-retriever', 'black-labrador-retriever', 'chocolate-labrador-retriever', 'mixed-breed', 'american-pit-bull-terrier', 'german-shepherd', 'border-collie'], cat: ['orange', 'domestic-shorthair', 'black-cat', 'white-cat', 'tuxedo-cat', 'calico-cat', 'siamese', 'domestic-longhair'] }
export const lookOptions = (species: Species, breed?: string) => [...new Set([headKeyFor(species, breed), ...COATS[species]])]

export function PetHead({ pet, size }: { pet: Pet; size: number }) {
  return <Image source={headSource(pet.species, petHeadKey(pet))} style={{ width: size, height: size }} contentFit="contain" accessibilityIgnoresInvertColors />
}
