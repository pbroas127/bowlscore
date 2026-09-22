// The bag tracker and the puppy weigh in: both are a bit of pet state that owns a local reminder, like the switch plan.
import { askToNotify, cancelNotifications, canNotify, notify } from './notify'
import { bagStatus, gramsPerDay, stageFor } from './fit'
import { getState, updatePet } from './store'
import { suggestLink } from './suggest'
import type { Pet, Scan } from './types'

const at = (t: number, hour: number) => { const d = new Date(t); d.setHours(hour, 0, 0, 0); return d }

export async function stopBag(pet: Pet) {
  if (pet.bag) await cancelNotifications(pet.bag.notificationIds)
  updatePet(pet.id, ({ bag: _bag, ...p }) => p)
}

// Reminds five days before the bag runs out, which is about how long a delivery takes.
// `openedAt` can be in the past: a bag bought last week is tracked from last week.
export async function startBag(pet: Pet, scan: Scan, lb: number, openedAt = Date.now(), reorderUrl?: string) {
  const link = pet.bag?.scanId === scan.id ? pet.bag.link : undefined // a new bag of the same food keeps its reorder link
  await stopBag(pet)
  const grams = gramsPerDay(pet, scan.label)
  const ids: (string | undefined)[] = []
  if (grams && (await askToNotify())) {
    const when = at(bagStatus({ lb, openedAt }, grams).emptyAt - 5 * 86_400_000, 9)
    if (when.getTime() > Date.now()) ids.push(await notify(`${pet.name}'s food runs out in about 5 days`, `Reorder ${scan.label.productName || 'the same bag'} in one tap.`, when, reorderUrl))
  }
  updatePet(pet.id, (p) => ({ ...p, bag: { lb, openedAt, scanId: scan.id, notificationIds: ids.filter((id) => id != null), link } }))
}

export function setBagLink(pet: Pet, link?: string) {
  updatePet(pet.id, (p) => (p.bag ? { ...p, bag: { ...p.bag, link } } : p))
  // A pasted link names the exact product people buy, the best lead for the next catalog addition.
  const scan = getState().scans.find((x) => x.id === pet.bag?.scanId)
  if (link && scan && !scan.productId) suggestLink(link, scan.label, pet.species)
}

// Call after a weight is saved. Never prompts: the reminder is a bonus for people who already allow notifications.
export async function scheduleWeighIn(pet: Pet) {
  if (pet.weighInId) await cancelNotifications([pet.weighInId])
  const due = pet.weightLb && stageFor(pet) === 'growth' && (await canNotify())
  const id = due ? await notify(`Time to weigh ${pet.name}`, 'Growing pets change fast. A fresh weight keeps the portions right.', at(Date.now() + 30 * 86_400_000, 10)) : undefined
  updatePet(pet.id, (p) => ({ ...p, weighInId: id ?? undefined }))
}
