'use client'
import { useRef } from 'react'
import { useScroll, useTransform, type MotionValue } from 'motion/react'
import * as m from 'motion/react-m'
import { Phone } from './Phone'

interface Beat {
  title: string
  body: string
  screen: React.ReactNode
}

// Desktop: the phone stays pinned while three text beats scroll past and its screen changes.
// Under 768px or with reduced motion, CSS swaps this for three static crops (see .story-pin in globals.css),
// because pinned scroll on a small screen feels like a trap.
export function Story({ beats }: { beats: Beat[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  return (
    <div ref={ref} className="relative grid gap-x-6 md:grid-cols-12">
      <div className="md:col-span-5 md:col-start-2">
        {beats.map((b) => (
          <div key={b.title} className="story-beat flex flex-col justify-center py-10 md:py-0">
            <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.05]">{b.title}</h3>
            <p className="lede mt-4">{b.body}</p>
            <div className="story-crop mt-8 flex max-h-[400px] justify-center overflow-hidden rounded-b-hero border-b border-hairline">
              <Phone>{b.screen}</Phone>
            </div>
          </div>
        ))}
      </div>

      <div className="story-pin sticky top-0 h-[100svh] items-center justify-center md:col-span-5 md:col-start-8">
        <Phone>
          {beats.map((b, i) => (
            <Screen key={b.title} progress={scrollYProgress} index={i} count={beats.length}>
              {b.screen}
            </Screen>
          ))}
        </Phone>
      </div>
    </div>
  )
}

function Screen({ progress, index, count, children }: { progress: MotionValue<number>; index: number; count: number; children: React.ReactNode }) {
  // Each screen owns an equal slice of the scroll and cross fades over 8 percent at its edges.
  const start = index / count
  const end = (index + 1) / count
  const fade = 0.04
  // Offsets must stay inside 0 to 1: the browser runs this as a scroll timeline and throws on anything outside.
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  const opacity = useTransform(progress, [start - fade, start + fade, end - fade, end + fade].map(clamp), [index === 0 ? 1 : 0, 1, 1, index === count - 1 ? 1 : 0])
  return (
    <m.div className="absolute inset-0 bg-cream" style={{ opacity }}>
      {children}
    </m.div>
  )
}
