// The 7 day food switch: the schedule math, plus starting and cancelling a plan (which owns its notifications).
import { askToNotify, cancelNotifications, notify } from './notify'
import { updatePet } from './store'
import type { CatalogProduct, Pet } from './types'

export const SWITCH_STEPS = [
  { from: 1, days: 'Days 1 and 2', percent: 25 },
  { from: 3, days: 'Days 3 and 4', percent: 50 },
  { from: 5, days: 'Days 5 and 6', percent: 75 },
  { from: 7, days: 'Day 7', percent: 100 },
] as const
export const PLAN_DAYS = 7

const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0)
// Calendar days, not 24 hour blocks: a plan started at 9pm is on day 2 the next morning. Rounding absorbs daylight saving shifts.
export const planDay = (startedAt: number, now = Date.now()) => Math.round((midnight(now) - midnight(startedAt)) / 86_400_000) + 1
export const stepIndex = (day: number) => Math.min(SWITCH_STEPS.length - 1, Math.max(0, Math.floor((day - 1) / 2)))
const stepLine = (percent: number, food: string) => (percent === 100 ? `All ${food} from today.` : `Mix ${percent} percent ${food} with ${100 - percent} percent of the old food.`)

export async function cancelPlan(pet: Pet) {
  if (pet.switchPlan) await cancelNotifications(pet.switchPlan.notificationIds)
  updatePet(pet.id, ({ switchPlan: _plan, ...p }) => p)
}

export async function startPlan(pet: Pet, product: CatalogProduct) {
  await cancelPlan(pet)
  const startedAt = Date.now()
  const ids: (string | undefined)[] = []
  if (await askToNotify()) {
    for (const step of SWITCH_STEPS) {
      const when = new Date(startedAt)
      when.setDate(when.getDate() + step.from - 1)
      when.setHours(8, 0, 0, 0)
      // ponytail: a step whose 8am has already passed (day 1, usually) gets no notification; the person is looking at it in the app.
      if (when.getTime() > startedAt) ids.push(await notify(`${pet.name}'s switch plan, day ${step.from}`, stepLine(step.percent, product.name), when))
    }
  }
  updatePet(pet.id, (p) => ({ ...p, switchPlan: { productId: product.id, name: product.name, startedAt, notificationIds: ids.filter((id) => id != null) } }))
}
