import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/LegalPage'
import { EFFECTIVE_DATE, SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What BowlScore collects, why, who receives it, how long it is kept and how to delete it.',
  alternates: { canonical: '/privacy' },
}

export default function Privacy() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
  return (
    <LegalPage title="Privacy Policy" updated={EFFECTIVE_DATE}>
      <p>
        BowlScore is made by Peter Broas, an individual developer in the United States (&quot;we&quot;, &quot;us&quot;). This policy covers the BowlScore iOS app and this website. The short version: we collect what the app needs to work, we do not show ads, and we do not sell your data.
      </p>

      <h2>What we collect and why</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
            <th>Where it lives</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account identifier</td>
            <td>The app signs you in anonymously the first time you open it, so your data has somewhere to live. No name or email is needed.</td>
            <td>Firebase Authentication</td>
          </tr>
          <tr>
            <td>Email address and name, only if you choose to sign in with Apple, Google or email</td>
            <td>Lets you keep your pets and scans when you change phones</td>
            <td>Firebase Authentication</td>
          </tr>
          <tr>
            <td>Pet profiles: name, species, life stage, size, food type, health concerns, allergies and an optional photo</td>
            <td>To personalize flags and suggestions</td>
            <td>Cloud Firestore</td>
          </tr>
          <tr>
            <td>Scan history: the product name, the ingredient list and analysis that were read, the score and the date</td>
            <td>So you can look back at past scans</td>
            <td>Cloud Firestore</td>
          </tr>
          <tr>
            <td>Label photos</td>
            <td>To read the ingredient list</td>
            <td>Not stored by us. See below.</td>
          </tr>
          <tr>
            <td>Barcode numbers</td>
            <td>To look up a product</td>
            <td>Sent to Open Pet Food Facts, not stored apart from your scan history</td>
          </tr>
          <tr>
            <td>Purchase status and an app user identifier</td>
            <td>To unlock the subscription and restore purchases</td>
            <td>RevenueCat and Apple</td>
          </tr>
          <tr>
            <td>IP address and basic request logs</td>
            <td>Security and rate limiting on our scan server</td>
            <td>Our hosting provider, for a short time</td>
          </tr>
        </tbody>
      </table>
      <p>We do not collect your location, your contacts or an advertising identifier. We do not run ads and we do not use advertising trackers.</p>

      <h2>What happens to a label photo</h2>
      <p>
        When you scan a label, the photo is sent over an encrypted connection to our server, which passes it to the Google Gemini API so the text can be extracted. Our server keeps the photo in memory only for the length of that request. We do not save it to disk or to a database. We keep only the extracted text and the score. Google processes the photo as our service provider under the Gemini API terms. Please photograph only the package, and keep people and personal documents out of the frame.
      </p>

      <h2>How scans help the catalog</h2>
      <p>
        When you scan a food or treat that is not in our catalog yet, or save a reorder link for one, the app sends us the product details: the name, brand, ingredients, guaranteed analysis and calories as printed on the package, and the link. Nothing about you or your pet is attached, and no photo is sent. We review these by hand and may add the product to the public catalog so everyone can see its score.
      </p>

      <h2>Who receives data</h2>
      <p>We share data only with the service providers that make the app work. Each one is bound by its own terms to protect the data and to use it only to provide its service.</p>
      <ul>
        <li>Google Firebase (Authentication and Cloud Firestore): account, pet profiles and scan history.</li>
        <li>Google Gemini API: label photos, for text extraction only.</li>
        <li>RevenueCat: an app user identifier and purchase history, to manage subscriptions.</li>
        <li>Apple: handles every payment. We never see your card number.</li>
        <li>Open Pet Food Facts: the barcode number you scan. It receives nothing that identifies you beyond the request our server makes.</li>
        <li>Vercel: hosts this website and the scan server, and keeps short lived request logs.</li>
        <li>Amazon: only if you tap a link to a suggested food. Amazon then applies its own privacy policy, and may set cookies to credit the referral.</li>
      </ul>
      <p>We do not sell personal data, we do not share it for advertising, and we never have. We may disclose data if the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>Pet profiles and scan history are kept until you delete them or delete your data. Label photos are not kept at all. Server logs are kept for up to 30 days. RevenueCat and Apple keep purchase records for as long as tax and accounting rules require.</p>

      <h2>How to delete your data</h2>
      <ul>
        <li>In the app: open Settings, then tap Delete my data. This erases your account, pet profiles and scan history from our systems.</li>
        <li>By email: write to {mail} from the address on your account, or include the user ID shown in Settings, and we will delete everything within 30 days.</li>
      </ul>
      <p>Deleting your data does not cancel a subscription. Subscriptions are managed by Apple. See the <Link href="/support">support page</Link> for how to cancel.</p>

      <h2>Your rights</h2>
      <p>You can ask for a copy of your data, ask us to correct it, or ask us to delete it, wherever you live. If you are in the European Economic Area, the United Kingdom or California, the law gives you these rights formally, along with the right to object to processing and the right to complain to your data protection authority. We rely on your consent and on our contract with you (providing the app) as the legal bases for processing. To use any of these rights, email {mail}. You can withdraw consent at any time by deleting your data.</p>

      <h2>Children</h2>
      <p>BowlScore is not directed at children under 13, and we do not knowingly collect personal data from them. If you believe a child has given us data, email us and we will delete it.</p>

      <h2>Security</h2>
      <p>Data is encrypted in transit, and Firebase encrypts it at rest. Access rules limit each account to its own pets and scans. No system is perfectly secure, so we cannot promise absolute security.</p>

      <h2>This website</h2>
      <p>This site does not use advertising cookies. Our host may record privacy friendly, aggregate page view counts and standard server logs.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a meaningful way, we will update the effective date above and say so in the app before the change applies.</p>

      <h2>Contact</h2>
      <p>Peter Broas, United States. Email {mail}.</p>
    </LegalPage>
  )
}
