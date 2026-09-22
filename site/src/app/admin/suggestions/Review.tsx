'use client'
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth'
import { collection, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

// The same public web config the app ships with.
const app = getApps()[0] ?? initializeApp({ apiKey: 'AIzaSyAsdAe5xauPZHaQOOOT7e5C9C_RhlV6PIc', authDomain: 'bowlscore-5e75a.firebaseapp.com', projectId: 'bowlscore-5e75a', appId: '1:3163562272:web:89a8dd812b405a7772b745' })

type Row = { id: string; at?: string; [k: string]: unknown }

export function Review() {
  const [user, setUser] = useState<User | null>()
  const [rows, setRows] = useState<Row[]>()
  const [error, setError] = useState('')
  useEffect(() => onAuthStateChanged(getAuth(app), setUser), [])
  useEffect(() => {
    if (!user) return
    getDocs(query(collection(getFirestore(app), 'suggestions'), orderBy('at', 'desc'), limit(1000)))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data(), at: d.data().at?.toDate?.().toISOString() }))))
      .catch((e) => setError(String(e?.message ?? e)))
  }, [user])

  if (user === undefined) return <p>Loading</p>
  if (!user) return <button className="btn" onClick={() => signInWithPopup(getAuth(app), new GoogleAuthProvider()).catch((e) => setError(String(e?.message ?? e)))}><span>Sign in with Google</span></button>
  if (error) return <p>{error}</p>
  if (!rows) return <p>Loading suggestions</p>
  const scans = rows.filter((r) => r.kind === 'scan').length
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-bold">Suggestions</h1>
      <p id="summary">{rows.length} total, {scans} scans, {rows.length - scans} links</p>
      <pre id="data" className="overflow-auto rounded-card bg-surface p-4 text-xs whitespace-pre-wrap">{JSON.stringify(rows, null, 1)}</pre>
    </div>
  )
}
