import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/LegalPage'
import { AMAZON_SENTENCE, EFFECTIVE_DATE, NOT_VET_LONG, PRICE_MONTHLY, PRICE_YEARLY, SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'BowlScore Terms of Use and end user license agreement, including subscription prices, the free trial, automatic renewal and how to cancel.',
  alternates: { canonical: '/terms' },
}

export default function Terms() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
  return (
    <LegalPage title="Terms of Use" updated={EFFECTIVE_DATE}>
      <p>
        These terms are a license agreement between you and Peter Broas (&quot;BowlScore&quot;, &quot;we&quot;, &quot;us&quot;), the individual developer of the BowlScore app. By downloading or using the app you agree to them. If you do not agree, do not use the app. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle data.
      </p>

      <h2>1. Subscriptions, free trial and automatic renewal</h2>
      <p>Scanning your own foods requires BowlScore Premium, an automatically renewing subscription sold through Apple. Two plans are offered:</p>
      <ul>
        <li>
          <strong>BowlScore Premium Yearly: ${PRICE_YEARLY} per year.</strong> New subscribers get a 3 day free trial. When the trial ends, your Apple Account is charged ${PRICE_YEARLY}, and then again every year, until you cancel.
        </li>
        <li>
          <strong>BowlScore Premium Monthly: ${PRICE_MONTHLY} per month.</strong> There is no free trial. Your Apple Account is charged ${PRICE_MONTHLY} at purchase, and then again every month, until you cancel.
        </li>
      </ul>
      <ul>
        <li>Prices are in US dollars. Apple may show a different price in other countries and may add tax. The price shown on the purchase screen is the price you pay.</li>
        <li>Payment is charged to your Apple Account when you confirm the purchase, or at the end of the free trial if there is one.</li>
        <li>The subscription renews automatically for the same price and period unless you cancel at least 24 hours before the current period ends. Your account is charged for renewal within 24 hours before the period ends.</li>
        <li>To avoid being charged after a free trial, cancel at least 24 hours before the trial ends. Any unused part of a free trial is forfeited when you buy a subscription.</li>
        <li>To manage or cancel: open the Settings app on your iPhone, tap your name, tap Subscriptions, then choose BowlScore. Deleting the app does not cancel a subscription. After you cancel, Premium stays active until the end of the period you paid for.</li>
        <li>Apple handles all billing and refunds. To ask for a refund, visit <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>. We cannot issue refunds for App Store purchases ourselves.</li>
        <li>If we change a price, Apple will notify you first, and where required will ask for your consent before the new price applies.</li>
      </ul>

      <h2>2. Not veterinary advice</h2>
      <p>{NOT_VET_LONG}</p>
      <p>Scores are opinions produced by a published rubric from the text of a label. We do not test food in a laboratory, and we do not claim that any product is safe, unsafe, healthy or harmful. Labels are read by software that can make mistakes, so always check the ingredient list shown in the app against the package. If your pet is unwell, contact a veterinarian right away.</p>

      <h2>3. Your license</h2>
      <p>We grant you a personal, limited license, which you may not transfer or sublicense, to use the app on any Apple branded device that you own or control, as permitted by the Usage Rules in the Apple Media Services Terms and Conditions. The app may also be used by other accounts associated with you through Family Sharing. We keep all rights that these terms do not expressly grant.</p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to copy, resell or reverse engineer the app, except where the law allows it. You agree not to scrape or bulk download scores, not to get around the paywall or the rate limits, not to upload content that is unlawful or that is not yours to share, and not to present BowlScore scores as professional, veterinary or laboratory findings.</p>

      <h2>5. Affiliate links</h2>
      <p>
        The app and this site may link to products sold by others. {AMAZON_SENTENCE} We may earn a commission if you buy through these links. Commissions never change a score or the order of suggestions. We are not the seller and are not responsible for those products. See the <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
      </p>

      <h2>6. Data from others</h2>
      <p>Barcode lookups use Open Pet Food Facts, an open database made available under the Open Database License. Label reading uses the Google Gemini API. These services may be inaccurate or unavailable at times, and you must follow any terms of theirs that apply to you when you use the app.</p>

      <h2>7. Disclaimer of warranties</h2>
      <p>The app is provided as is and as available, without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose and noninfringement, to the fullest extent the law allows. We do not promise that scores are complete, accurate or free of errors.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the fullest extent the law allows, we are not liable for any indirect, incidental, special or consequential damages, or for any harm to a pet, that results from using or relying on the app. Our total liability for any claim is limited to the amount you paid for BowlScore in the 12 months before the claim. Some places do not allow these limits, so they may not apply to you.</p>

      <h2>9. Terms required by Apple</h2>
      <ul>
        <li>Acknowledgement. These terms are between you and Peter Broas only, not Apple. We, not Apple, are solely responsible for the app and its content.</li>
        <li>Maintenance and support. We are solely responsible for maintenance and support of the app. Apple has no obligation to provide any maintenance or support for it.</li>
        <li>Warranty. We are solely responsible for any product warranty, to the extent one is not effectively disclaimed. If the app fails to conform to a warranty that applies, you may notify Apple, and Apple will refund the purchase price. To the fullest extent the law allows, Apple has no other warranty obligation for the app.</li>
        <li>Product claims. We, not Apple, are responsible for addressing any claims about the app or your use of it, including product liability claims, claims that the app fails to meet a legal or regulatory requirement, and claims under consumer protection, privacy or similar laws.</li>
        <li>Intellectual property. If anyone claims that the app or your use of it infringes their intellectual property rights, we, not Apple, are solely responsible for investigating, defending, settling and discharging that claim.</li>
        <li>Legal compliance. You confirm that you are not located in a country under a US Government embargo or one the US Government has designated as a terrorist supporting country, and that you are not on any US Government list of prohibited or restricted parties.</li>
        <li>Third party beneficiary. Apple and its subsidiaries are third party beneficiaries of these terms. Once you accept them, Apple has the right, and is deemed to have accepted the right, to enforce these terms against you as a third party beneficiary.</li>
      </ul>
      <p>
        Where these terms are silent, Apple&apos;s <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Licensed Application End User License Agreement</a> applies. If the two conflict, these terms apply to the extent that Apple permits.
      </p>

      <h2>10. Ending these terms</h2>
      <p>You can stop at any time by cancelling your subscription and deleting the app. We may suspend or end your access if you break these terms. Sections 2, 7, 8 and 9 continue to apply afterwards.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of the United States and of the state where the developer lives, without regard to conflict of law rules. If you are a consumer, you keep any protections that the law of your own country makes mandatory.</p>

      <h2>12. Changes</h2>
      <p>We may update these terms. If a change is meaningful we will update the effective date above and tell you in the app. Using the app after a change means you accept the new terms.</p>

      <h2>13. Contact</h2>
      <p>Peter Broas, United States. Questions, complaints or claims about the app go to {mail}.</p>
    </LegalPage>
  )
}
