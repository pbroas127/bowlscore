import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/LegalPage'
import { AMAZON_SENTENCE, EFFECTIVE_DATE, NOT_VET, SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Affiliate disclosure',
  description: 'How BowlScore earns affiliate commissions and why they never change a score.',
  alternates: { canonical: '/affiliate-disclosure' },
}

export default function AffiliateDisclosure() {
  return (
    <LegalPage title="Affiliate disclosure" updated={EFFECTIVE_DATE}>
      <p className="!mt-8 font-display text-[1.5em] leading-snug font-bold">{AMAZON_SENTENCE}</p>
      <p>
        When BowlScore suggests a better food, the link may be an affiliate link. If you buy through it, we may earn a small commission from the retailer. You pay the same price either way.
      </p>
      <h2>What commissions never do</h2>
      <ul>
        <li>They never change a score. Scores come from a fixed public rubric, described on the <Link href="/methodology">methodology page</Link>.</li>
        <li>They never change the order of suggested foods. Suggestions are ranked by score and by how closely they match the food you scanned.</li>
        <li>They never come from brands. No brand can pay to be scored, listed or ranked.</li>
      </ul>
      <h2>Why we use them</h2>
      <p>BowlScore is built by one person and paid for by subscriptions. Affiliate commissions help keep the app free of ads.</p>
      <p>{NOT_VET}</p>
      <p>
        Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  )
}
