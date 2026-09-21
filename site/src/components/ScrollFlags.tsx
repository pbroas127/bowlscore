'use client'
import { useEffect } from 'react'

// Sets data-scrolled (nav turns solid after 80px) and data-past-hero (mobile App Store bar) on <html>.
// IntersectionObserver only, no scroll listeners. CSS does the rest.
export function ScrollFlags() {
  useEffect(() => {
    const root = document.documentElement
    const top = document.getElementById('top-sentinel')
    const hero = document.getElementById('hero')
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) root.toggleAttribute(e.target === top ? 'data-scrolled' : 'data-past-hero', !e.isIntersecting)
    })
    if (top) io.observe(top)
    if (hero) io.observe(hero)
    return () => {
      io.disconnect()
      root.removeAttribute('data-scrolled')
      root.removeAttribute('data-past-hero')
    }
  }, [])
  return null
}
