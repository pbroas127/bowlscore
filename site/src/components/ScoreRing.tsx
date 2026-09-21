'use client'
import { useEffect, useRef } from 'react'
import { animate, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { GRADE_COLOR } from '@/lib/site'

type Grade = keyof typeof GRADE_COLOR
const RAMP: Grade[] = ['Bad', 'Poor', 'Good', 'Excellent']

// The signature moment. One motion value (t, 0 to 1) drives the sweep, the count and the color, so they
// can never drift apart. The color travels red, orange, green and always lands exactly on the grade color.
// live={false} renders the finished ring with no animation (used for small rings and the pinned story).
export function ScoreRing({ score, grade, size = 160, live = true, className = '' }: { score: number; grade: Grade; size?: number; live?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()

  const stroke = size * 0.0875
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const finalOffset = c * (1 - score / 100)

  const colors = RAMP.slice(0, RAMP.indexOf(grade) + 1).map((g) => GRADE_COLOR[g])
  if (colors.length === 1) colors.push(colors[0])

  const t = useMotionValue(live ? 0 : 1)
  const pop = useMotionValue(1)
  const offset = useTransform(t, (v) => c * (1 - (v * score) / 100))
  const color = useTransform(t, colors.map((_, i) => i / (colors.length - 1)), colors)
  const shown = useTransform(t, (v) => Math.round(v * score))

  useEffect(() => {
    if (!live || !inView) return
    if (reduce) return t.set(1)
    t.set(0)
    const sweep = animate(t, 1, { duration: 0.9, ease: [0.33, 1, 0.68, 1] })
    sweep.then(() => animate(pop, [1, 1.045, 1], { duration: 0.4, ease: 'easeOut' }))
    return () => sweep.stop()
  }, [live, inView, reduce, t, pop])

  return (
    <m.div
      ref={ref}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size, scale: pop, ['--ring-final' as string]: finalOffset, ['--ring-color' as string]: GRADE_COLOR[grade] }}
      role="img"
      aria-label={`Score ${score} out of 100, ${grade}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFE6D6" strokeWidth={stroke} />
        <m.circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} style={{ strokeDashoffset: offset, stroke: color }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
        <span className="num leading-none" style={{ fontSize: size * 0.4 }}>
          <m.span className="ring-live">{shown}</m.span>
          <span className="ring-final">{score}</span>
        </span>
      </div>
    </m.div>
  )
}
