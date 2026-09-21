// Subscriptions through RevenueCat. With no key (web preview, local dev) it runs in mock mode so the whole
// paywall flow can still be clicked through; mock purchases never touch real money.
import { Platform } from 'react-native'
import { useSyncExternalStore } from 'react'
import type { PurchasesPackage } from 'react-native-purchases'
import { getState, setState } from './store'

import { RC_IOS_KEY as KEY } from './config'
export const ENTITLEMENT = 'pro'
export const mock = Platform.OS === 'web' || !KEY

export interface Plan {
  id: 'yearly' | 'monthly'
  price: number
  priceString: string
  perMonthString?: string
  trialDays: number // 0 when the user is not eligible for the intro offer
  pkg?: PurchasesPackage
}

const MOCK_PLANS: Plan[] = [
  { id: 'yearly', price: 34.99, priceString: '$34.99', perMonthString: '$2.92', trialDays: 3 },
  { id: 'monthly', price: 5.99, priceString: '$5.99', trialDays: 0 },
]

let pro = false
const listeners = new Set<() => void>()
const setPro = (v: boolean) => { if (v !== pro) { pro = v; listeners.forEach((l) => l()) } }
const rc = async () => (await import('react-native-purchases')).default

export async function startPurchases(appUserID?: string) {
  if (mock) return setPro(getState().mockPro)
  const Purchases = await rc()
  Purchases.configure({ apiKey: KEY!, appUserID })
  Purchases.addCustomerInfoUpdateListener((info) => setPro(Boolean(info.entitlements.active[ENTITLEMENT])))
  try { setPro(Boolean((await Purchases.getCustomerInfo()).entitlements.active[ENTITLEMENT])) } catch {}
}

export async function identify(appUserID: string) {
  if (mock) return
  try { await (await rc()).logIn(appUserID) } catch {}
}

export function usePro() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => pro, () => pro)
}
export const isPro = () => pro

export async function loadPlans(): Promise<Plan[]> {
  if (mock) return MOCK_PLANS
  const Purchases = await rc()
  const current = (await Purchases.getOfferings()).current
  if (!current) return []
  const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(current.availablePackages.map((p) => p.product.identifier)).catch(() => ({}) as Record<string, { status: number }>)
  const plans: Plan[] = []
  for (const [id, pkg] of [['yearly', current.annual], ['monthly', current.monthly]] as const) {
    if (!pkg) continue
    const p = pkg.product
    const intro = p.introPrice
    // status 2 is INTRO_ELIGIBILITY_STATUS_ELIGIBLE. Anything else hides the trial copy (Apple guideline 3.1.2).
    const eligible = eligibility[p.identifier]?.status === 2
    const trialDays = intro && intro.price === 0 && eligible ? intro.periodNumberOfUnits * ({ DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 }[intro.periodUnit as 'DAY'] ?? 1) : 0
    const perMonth = id === 'yearly' ? new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currencyCode }).format(p.price / 12) : undefined
    plans.push({ id, price: p.price, priceString: p.priceString, perMonthString: perMonth, trialDays, pkg })
  }
  return plans
}

// Resolves true when the user ends up subscribed, false when they cancel the sheet.
export async function purchase(plan: Plan): Promise<boolean> {
  if (mock || !plan.pkg) {
    await new Promise((r) => setTimeout(r, 900))
    setState({ mockPro: true })
    setPro(true)
    return true
  }
  try {
    const { customerInfo } = await (await rc()).purchasePackage(plan.pkg)
    const active = Boolean(customerInfo.entitlements.active[ENTITLEMENT])
    setPro(active)
    return active
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false
    throw e
  }
}

export async function restore(): Promise<boolean> {
  if (mock) return pro
  const info = await (await rc()).restorePurchases()
  const active = Boolean(info.entitlements.active[ENTITLEMENT])
  setPro(active)
  return active
}
