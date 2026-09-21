'use client'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'

// LazyMotion plus the m component keeps the motion runtime small. reducedMotion="user" turns off
// transform animations for visitors who ask for that; the ring and story have CSS fallbacks too.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
