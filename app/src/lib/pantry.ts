// A pet's pantry: one main food and any number of treats. A food is one or the other, never both.
// Used by the score screen and the product page, so both ask the same questions before changing anything.
import { Alert } from 'react-native'
import { stopBag } from './bag'
import { proteinOf } from './recommend'
import { checkRecalls } from './recalls'
import { getState, newId, saveScan, updatePet } from './store'
import type { CatalogProduct, Pet, Scan } from './types'

const named = (scan?: Scan) => scan?.label.productName || 'this food'

function apply(pet: Pet, scan: Scan, as: 'main' | 'treat', on: boolean) {
  updatePet(pet.id, ({ currentScanId, ...p }) => ({
    ...p,
    ...(as === 'main' ? (on ? { currentScanId: scan.id, protein: proteinOf(scan.label.ingredients) ?? p.protein } : {}) : currentScanId && currentScanId !== scan.id ? { currentScanId } : {}),
    treatScanIds: as === 'treat' && on ? [...p.treatScanIds.filter((t) => t !== scan.id), scan.id] : p.treatScanIds.filter((t) => t !== scan.id),
  }))
  // The bag tracker follows the main food, so a new main food (or none) ends the old bag and its reminder.
  const mainAfter = as === 'main' ? (on ? scan.id : undefined) : pet.currentScanId === scan.id ? undefined : pet.currentScanId
  if (pet.bag && pet.bag.scanId !== mainAfter) stopBag(pet)
  checkRecalls() // the pantry changed, so its brands may have too
}

// Tapping the active choice again takes it away. Replacing or removing the main food asks first.
export function toggle(pet: Pet, scan: Scan, as: 'main' | 'treat', onDone?: () => void) {
  const on = as === 'main' ? pet.currentScanId !== scan.id : !pet.treatScanIds.includes(scan.id)
  const go = () => { apply(pet, scan, as, on); onDone?.() }
  const current = getState().scans.find((x) => x.id === pet.currentScanId)
  const bagNote = pet.bag ? ' Its bag tracker stops too.' : ''
  if (as === 'main' && on && current)
    return Alert.alert(`Replace ${named(current)}?`, `${named(scan)} becomes ${pet.name}'s food.${bagNote}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace', onPress: go }])
  if (as === 'main' && !on)
    return Alert.alert(`Remove as ${pet.name}'s food?`, `${pet.name} will have no main food set.${bagNote}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }])
  if (as === 'treat' && on && pet.currentScanId === scan.id)
    return Alert.alert(`Make it a treat?`, `${named(scan)} stops being ${pet.name}'s main food.${bagNote}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Make it a treat', onPress: go }])
  go()
}

// Picking a food from the catalog without scanning: reuse this pet's earlier save of it, else save it like a scan.
export function scanFor(pet: Pet, product: CatalogProduct): Scan {
  const had = getState().scans.find((x) => x.petId === pet.id && x.productId === product.id)
  if (had) return had
  const scan: Scan = { id: newId(), petId: pet.id, createdAt: Date.now(), source: 'catalog', label: product.label, result: product.result, productId: product.id, ...(product.image ? { image: product.image } : {}) }
  saveScan(scan)
  return scan
}
