// Private review page for catalog suggestions sent in by the app (see app/src/lib/suggest.ts). Firestore rules only let
// the owner's verified Google account read them; everyone else sees a sign in button that cannot load anything.
import type { Metadata } from 'next'
import { Review } from './Review'

export const metadata: Metadata = { title: 'Suggestions', robots: { index: false, follow: false } }

export default function Page() {
  return <main className="mx-auto max-w-5xl px-5 py-10"><Review /></main>
}
