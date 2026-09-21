'use client'
import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

// Panels are rendered on the server and passed in, so the copy and mascots stay out of the client bundle.
export function SpeciesToggle({ dog, cat }: { dog: React.ReactNode; cat: React.ReactNode }) {
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  return (
    <div>
      <div role="tablist" aria-label="Species" className="relative inline-grid grid-cols-2 rounded-full bg-cream-deep p-1 font-semibold">
        <span aria-hidden="true" className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-300 ease-out ${species === 'cat' ? 'translate-x-full' : ''}`} />
        {(['dog', 'cat'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={species === s} onClick={() => setSpecies(s)} className={`relative min-h-11 rounded-full px-7 transition-colors duration-200 ${species === s ? 'text-cream' : 'text-ink'}`}>
            {s === 'dog' ? 'Dogs' : 'Cats'}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <m.div key={species} role="tabpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="mt-10">
          {species === 'dog' ? dog : cat}
        </m.div>
      </AnimatePresence>
    </div>
  )
}
