import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import { AppStoreBadge, BadgeSprite } from '@/components/AppStoreBadge'
import { Footer } from '@/components/Footer'
import { Nav } from '@/components/Nav'
import { Providers } from '@/components/Providers'
import { ScrollFlags } from '@/components/ScrollFlags'
import { APP_STORE_ID, SITE_URL } from '@/lib/site'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap', axes: ['opsz'] })
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

const description = 'BowlScore is a dog food scanner and cat food scanner for iPhone. Snap any pet food label and get a 0 to 100 ingredient score with every red flag explained.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'BowlScore: pet food scanner for dogs and cats', template: '%s | BowlScore' },
  description,
  applicationName: 'BowlScore',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'BowlScore', url: '/', title: 'BowlScore: know what is really in the bowl', description },
  twitter: { card: 'summary_large_image', title: 'BowlScore: know what is really in the bowl', description },
  itunes: { appId: APP_STORE_ID, appArgument: SITE_URL },
}

export const viewport: Viewport = { themeColor: '#FFF8EC' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      <head>
        {/* Impact (Chewy affiliate program) site ownership check. It reads a nonstandard `value` attribute, which the
            Next metadata API cannot produce, hence the hand written tag. */}
        <meta name="impact-site-verification" {...({ value: '5aa5e8ae-f106-4948-afc7-24733b5b8516' } as object)} />
      </head>
      <body>
        {/* Without JavaScript the score rings show their final value instead of an empty ring. */}
        <noscript>
          <style>{`.ring-live{display:none}.ring-final{display:inline}.ring-arc{stroke-dashoffset:var(--ring-final)!important;stroke:var(--ring-color)!important}`}</style>
        </noscript>
        <a href="#main" className="btn sr-only z-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          <span>Skip to content</span>
        </a>
        <div id="top-sentinel" className="pointer-events-none absolute top-0 h-20 w-px" aria-hidden="true" />
        <BadgeSprite />
        <ScrollFlags />
        <Providers>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
        <div className="sticky-bar fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-hairline bg-cream px-5 py-2.5 shadow-warm md:hidden">
          <p className="font-display text-[16px] leading-tight font-bold">Scan your first label today.</p>
          <AppStoreBadge placement="sticky_bar" className="h-11" />
        </div>
      </body>
    </html>
  )
}
