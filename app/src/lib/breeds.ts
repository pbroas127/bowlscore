// Breed table: [name, typical adult weight in lb, optional diet note]. Pure data, no imports.
// Size drives the rules that matter (large breed puppy food, when a puppy becomes an adult, portions).
// Notes are only included where the evidence is solid; everything else is left to the size rules.
// ponytail: about 110 common breeds. Anything else is typed in by hand and falls back to the pet's weight and size.
import type { Species } from './types'

type Row = [name: string, adultLb: number, note?: string]

const BLOAT = 'Deep chested breeds are prone to bloat. Split food into two or three meals and keep exercise away from meal times.'
const LEAN = 'This breed gains weight easily. Measure meals and keep treats inside the daily allowance.'
const DCM = 'The FDA has looked into heart disease reports linked to grain free foods heavy in peas and lentils, and this breed showed up often. Worth a word with your vet before feeding one.'
const TINY = 'Very small puppies can run low on blood sugar. Feed three or four small meals a day while growing.'

const DOGS: Row[] = [
  ['Mixed breed', 45],
  ['Affenpinscher', 9], ['Airedale Terrier', 55], ['Akita', 100, BLOAT], ['Alaskan Malamute', 85], ['American Bulldog', 90],
  ['American Pit Bull Terrier', 50], ['American Staffordshire Terrier', 60], ['Australian Cattle Dog', 42], ['Australian Shepherd', 55],
  ['Basenji', 23], ['Basset Hound', 55, LEAN], ['Beagle', 25, LEAN], ['Bedlington Terrier', 20, 'This breed can store too much copper in the liver. Ask your vet about a copper test before choosing a food.'],
  ['Belgian Malinois', 60], ['Bernese Mountain Dog', 95, BLOAT], ['Bichon Frise', 14], ['Bloodhound', 95, BLOAT], ['Border Collie', 40],
  ['Border Terrier', 14], ['Boston Terrier', 18], ['Boxer', 65, BLOAT], ['Brittany', 35], ['Bull Terrier', 60], ['Bulldog', 50, LEAN],
  ['Bullmastiff', 115, BLOAT], ['Cairn Terrier', 14], ['Cane Corso', 100, BLOAT], ['Cavalier King Charles Spaniel', 16, LEAN],
  ['Chesapeake Bay Retriever', 70], ['Chihuahua', 5, TINY], ['Chinese Shar Pei', 50], ['Chow Chow', 60], ['Cocker Spaniel', 26, LEAN],
  ['Collie', 62], ['Corgi (Pembroke Welsh)', 27, LEAN], ['Corgi (Cardigan Welsh)', 32, LEAN], ['Dachshund', 22, LEAN],
  ['Miniature Dachshund', 10, LEAN], ['Dalmatian', 55, 'Dalmatians are prone to urate bladder stones. Foods built on organ meats and other high purine ingredients are worth avoiding. Ask your vet.'],
  ['Doberman Pinscher', 80, DCM], ['English Setter', 60], ['English Springer Spaniel', 45], ['French Bulldog', 24, LEAN],
  ['German Shepherd', 75, BLOAT], ['German Shorthaired Pointer', 60], ['Goldendoodle', 60], ['Golden Retriever', 65, DCM],
  ['Great Dane', 140, BLOAT], ['Great Pyrenees', 100, BLOAT], ['Greyhound', 65], ['Havanese', 10], ['Irish Setter', 65, BLOAT],
  ['Irish Wolfhound', 130, BLOAT], ['Italian Greyhound', 10], ['Jack Russell Terrier', 15], ['Labradoodle', 60],
  ['Labrador Retriever', 70, LEAN], ['Leonberger', 130, BLOAT], ['Lhasa Apso', 15], ['Maltese', 6, TINY], ['Maltipoo', 10],
  ['Mastiff', 180, BLOAT], ['Miniature Pinscher', 9], ['Miniature Schnauzer', 15, 'Miniature Schnauzers often run high blood fats and are prone to pancreatitis. Lower fat foods are usually the safer pick. Ask your vet.'],
  ['Newfoundland', 125, BLOAT], ['Old English Sheepdog', 80], ['Papillon', 8], ['Pekingese', 11], ['Pomeranian', 5, TINY],
  ['Poodle (Standard)', 55, BLOAT], ['Poodle (Miniature)', 13], ['Poodle (Toy)', 5, TINY], ['Portuguese Water Dog', 48], ['Pug', 16, LEAN],
  ['Rhodesian Ridgeback', 78], ['Rottweiler', 105, BLOAT], ['Saint Bernard', 150, BLOAT], ['Samoyed', 50], ['Schnauzer (Standard)', 40],
  ['Schnauzer (Giant)', 75, BLOAT], ['Scottish Terrier', 20], ['Shetland Sheepdog', 20], ['Shiba Inu', 20], ['Shih Tzu', 12],
  ['Siberian Husky', 50], ['Soft Coated Wheaten Terrier', 38], ['Staffordshire Bull Terrier', 32], ['Vizsla', 52],
  ['Weimaraner', 72, BLOAT], ['West Highland White Terrier', 18], ['Whippet', 32], ['Yorkshire Terrier', 6, TINY],
]

const SLOW = 'This breed keeps growing for three to four years. Kitten or all life stages food suits it longer than most cats.'
const CATS: Row[] = [
  ['Domestic Shorthair', 10], ['Domestic Longhair', 10], ['Mixed breed', 10],
  ['Abyssinian', 9], ['American Shorthair', 11], ['Bengal', 12], ['Birman', 10], ['British Shorthair', 13, LEAN], ['Burmese', 10],
  ['Devon Rex', 8], ['Exotic Shorthair', 11], ['Maine Coon', 17, SLOW], ['Norwegian Forest Cat', 14, SLOW], ['Oriental Shorthair', 9],
  ['Persian', 10], ['Ragdoll', 15, SLOW], ['Russian Blue', 10], ['Scottish Fold', 10], ['Siamese', 10], ['Siberian', 14, SLOW],
  ['Sphynx', 9, 'Hairless cats burn more energy keeping warm. Expect to feed a little above the usual portion.'],
]

export interface Breed { name: string; adultLb: number; note?: string }
const toBreed = ([name, adultLb, note]: Row): Breed => ({ name, adultLb, note })
export const breedsFor = (species: Species): Breed[] => (species === 'dog' ? DOGS : CATS).map(toBreed)
export const findBreed = (species: Species, name?: string): Breed | undefined =>
  name ? breedsFor(species).find((b) => b.name.toLowerCase() === name.trim().toLowerCase()) : undefined
