import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/LegalPage'
import { FAQ, SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with BowlScore: contact us by email, cancel a subscription, restore purchases, request a refund, report a wrong score or delete your data.',
  alternates: { canonical: '/support' },
}

export default function Support() {
  return (
    <LegalPage title="Support">
      <p className="!mt-6 text-[1.15em]">
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and a real person replies, usually within two business days.
      </p>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=BowlScore%20support`} className="btn">
          <span>Email support</span>
        </a>
      </p>

      <h2>How to cancel your subscription</h2>
      <ol>
        <li>Open the Settings app on your iPhone.</li>
        <li>Tap your name at the top.</li>
        <li>Tap Subscriptions.</li>
        <li>Choose BowlScore, then tap Cancel Subscription (or Cancel Free Trial).</li>
      </ol>
      <p>Cancel at least 24 hours before the renewal date, or before the 3 day trial ends, and you will not be charged again. Premium stays active until the end of the period you already paid for. Deleting the app does not cancel a subscription.</p>

      <h2>How to restore purchases</h2>
      <p>New phone, or reinstalled the app? Open BowlScore, go to Settings, and tap Restore purchases. You can also tap Restore on the subscription screen. Make sure you are signed in with the same Apple Account that bought the subscription.</p>

      <h2>How to request a refund</h2>
      <p>
        Apple handles all App Store billing. Go to <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>, sign in, choose Request a refund, and pick your BowlScore purchase. We cannot issue App Store refunds ourselves, but email us if you get stuck.
      </p>

      <h2>How to report a wrong score</h2>
      <p>
        Email us the product name and a clear photo of the ingredient list. If the app misread the label we will fix the reading, and if the rubric got it wrong we will say so and correct it in the next scoring model version. The full method is on the <Link href="/methodology">methodology page</Link>.
      </p>

      <h2>How to delete your data</h2>
      <p>In the app, open Settings, then tap Delete my data. That erases your account, pet profiles and scan history. You can also email us and we will do it for you within 30 days. Deleting your data does not cancel a subscription, so cancel that first using the steps above.</p>

      <h2>Scanning tips</h2>
      <ul>
        <li>Fill the frame with the ingredient list and hold the phone steady.</li>
        <li>Use plenty of light and tilt the bag to avoid glare.</li>
        <li>On a can, take two photos so the text that wraps around the curve is covered.</li>
        <li>Add a photo of the guaranteed analysis panel to unlock the nutrition part of the score.</li>
      </ul>

      <h2>Common questions</h2>
      {FAQ.map(({ q, a }) => (
        <div key={q}>
          <h3>{q}</h3>
          <p>{a}</p>
        </div>
      ))}
    </LegalPage>
  )
}
