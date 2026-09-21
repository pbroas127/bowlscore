// The bag tracker and the puppy weigh in: both are a bit of pet state that owns a local reminder, like the switch plan.
import { askToNotify, cancelNotifications, canNotify, notify } from './notify'
import { bagStatus, gramsPerDay, stageFor } from './fit'
import { updatePet } from './store'
import type { Pet, Scan } from './types'

const at = (t: number, hour: number) => { const d = new Date(t); d.setHours(hour, 0, 0, 0); return d }

export async function stopBag(pet: Pet) {
  if (pet.bag) await cancelNotifications(pet.bag.notificationIds)
  updatePet(pet.id, ({ bag: _bag, ...p }) => p)
}

// Reminds five days before the bag runs out, which is about how long a delivery takes.
export async function startBag(pet: Pet, scan: Scan, lb: number) {
  await stopBag(pet)
  const openedAt = Date.now()
  const grams = gramsPerDay(pet, scan.label)
  const ids: (string | undefined)[] = []
  if (grams && (await askToNotify())) {
    const when = at(bagStatus({ lb, openedAt }, grams).emptyAt - 5 * 86_400_000, 9)
    if (when.getTime() > openedAt) ids.push(await notify(`${pet.name}'s food is running low`, `About 5 days of ${scan.label.productName || 'food'} left. Open BowlScore to reorder.`, when))
  }
  updatePet(pet.id, (p) => ({ ...p, bag: { lb, openedAt, scanId: scan.id, notificationIds: ids.filter((id) => id != null) } }))
}

// Call after a weight is saved. Never prompts: the reminder is a bonus for people who already allow notifications.
export async function scheduleWeighIn(pet: Pet) {
  if (pet.weighInId) await cancelNotifications([pet.weighInId])
  const due = pet.weightLb && stageFor(pet) === 'growth' && (await canNotify())
  const id = due ? await notify(`Time to weigh ${pet.name}`, 'Growing pets change fast. A fresh weight keeps the portions right.', at(Date.now() + 30 * 86_400_000, 10)) : undefined
  updatePet(pet.id, (p) => ({ ...p, weighInId: id ?? undefined }))
}
