// Cloud backup for signed in accounts: one Firestore document per user holding pets and recent scans.
// Anonymous users stay local only, so nothing is stored about people who never made an account.
// ponytail: whole document, last write wins. Fine for one person with one or two phones; move to per scan
// documents if people start sharing an account across a household.
import { getApps } from 'firebase/app'
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { getState, setState, subscribe } from './store'

const ref = (uid: string) => doc(getFirestore(getApps()[0]), 'users', uid)
let stop: (() => void) | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const snapshot = () => {
  const { pets, scans, activePetId } = getState()
  return { pets, activePetId: activePetId ?? null, scans: scans.slice(0, 100).map(({ photoUri: _photoUri, ...s }) => s), updatedAt: Date.now() }
}

export async function startSync(user: User | null) {
  stop?.()
  stop = undefined
  if (!user || user.isAnonymous) return
  try {
    const remote = (await getDoc(ref(user.uid))).data()
    // A fresh install signing back in adopts the backup; otherwise this device's data wins and is pushed up.
    if (remote?.pets?.length && !getState().scans.length) setState({ pets: remote.pets, scans: remote.scans ?? [], activePetId: remote.activePetId ?? remote.pets[0]?.id, onboarded: true })
    else await setDoc(ref(user.uid), snapshot())
  } catch {}
  stop = subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(() => setDoc(ref(user.uid), snapshot()).catch(() => {}), 2000)
  })
}

export const deleteBackup = (uid: string) => deleteDoc(ref(uid)).catch(() => {})
