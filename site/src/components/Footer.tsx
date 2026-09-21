import Link from 'next/link'
import { AMAZON_SENTENCE, NOT_VET, SUPPORT_EMAIL } from '@/lib/site'
import { Mascot } from './Mascot'

const LINKS = [
  ['Methodology', '/methodology'],
  ['Support', '/support'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Affiliate disclosure', '/affiliate-disclosure'],
] as const

export function Footer() {
  return (
    <footer className="bg-cream-deep pt-16 pb-28 md:pb-16">
      <div className="wrap grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-display text-[26px] font-extrabold tracking-tight">BowlScore</p>
          <p className="mt-2 max-w-[38ch] text-ink2">Made by Peter Broas, one person who reads pet food labels so you do not have to.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="link link-draw mt-4 inline-block font-medium">
            {SUPPORT_EMAIL}
          </a>
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <ul className="space-y-2.5 font-medium">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="link link-draw">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Android%20waitlist`} className="link link-draw text-ink2">
                Android waitlist
              </a>
            </li>
          </ul>
        </nav>
        <div className="flex items-end md:col-span-4 md:justify-end">
          <Mascot name="pair-sleeping" size={200} alt="The BowlScore puppy and kitten asleep together" />
        </div>
      </div>
      <div className="wrap mt-12 space-y-2 border-t border-ink/10 pt-6 text-[14px] text-ink2">
        <p>
          {AMAZON_SENTENCE} {NOT_VET}
        </p>
        <p>Apple, the Apple logo, iPhone and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.</p>
        <p>© 2026 Peter Broas. All rights reserved.</p>
      </div>
    </footer>
  )
}
