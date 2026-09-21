import Link from 'next/link'
import { AppStoreBadge } from '@/components/AppStoreBadge'
import { Demo } from '@/components/Demo'
import { Mascot } from '@/components/Mascot'
import { Phone } from '@/components/Phone'
import { QrCard } from '@/components/QrCard'
import { ScoreRing } from '@/components/ScoreRing'
import { PicksScreen, ResultScreen, ScanScreen } from '@/components/Screens'
import { SpeciesToggle } from '@/components/SpeciesToggle'
import { Story } from '@/components/Story'
import { scoreFood } from '@/lib/rubric'
import { SAMPLES } from '@/lib/samples'
import { AMAZON_SENTENCE, APP_STORE_URL, FAQ, GRADE_COLOR, NOT_VET_LONG, PRICE_MONTHLY, PRICE_YEARLY, RED_FLAGS, SITE_URL, SUPPORT_EMAIL, type Evidence } from '@/lib/site'

// Every score on this page is computed by the real rubric at build time (and again in the browser for the demo).
const [kibble, grainFree, fresh] = SAMPLES
const kibbleDog = scoreFood(kibble.label, 'dog')
const kibbleCat = scoreFood(kibble.label, 'cat')
const grainFreeDog = scoreFood(grainFree.label, 'dog')
const freshDog = scoreFood(fresh.label, 'dog')

const TAG_STYLE: Record<Evidence, string> = {
  Avoid: 'bg-bad/15 border-bad',
  Caution: 'bg-poor/15 border-poor',
  Debated: 'bg-transparent border-ink2',
}

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'BowlScore',
    description: 'Pet food scanner for dogs and cats. Snap a label and get a 0 to 100 ingredient score.',
    operatingSystem: 'iOS',
    applicationCategory: 'LifestyleApplication',
    url: SITE_URL,
    downloadUrl: APP_STORE_URL,
    installUrl: APP_STORE_URL,
    screenshot: `${SITE_URL}/opengraph-image`,
    author: { '@type': 'Person', name: 'Peter Broas' },
    offers: [
      { '@type': 'Offer', name: 'BowlScore Premium, monthly', price: PRICE_MONTHLY, priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'BowlScore Premium, yearly', price: PRICE_YEARLY, priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BowlScore',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    founder: { '@type': 'Person', name: 'Peter Broas' },
    contactPoint: { '@type': 'ContactPoint', email: SUPPORT_EMAIL, contactType: 'customer support' },
  },
]

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Hero: asymmetric split, no eyebrow. The phone overlaps the band below on purpose. */}
      <section id="hero" className="relative z-10 overflow-x-clip pt-[108px] pb-14 lg:pt-[132px] lg:pb-0">
        <div className="wrap grid items-center gap-x-6 gap-y-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1>Know what is really in the bowl.</h1>
            <p className="lede mt-6 text-[19px] lg:text-[21px]">Point your camera at any dog or cat food label and get a 0 to 100 ingredient score in seconds.</p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <AppStoreBadge placement="hero" className="h-[56px]" />
              <QrCard placement="hero" />
            </div>
          </div>

          <div className="relative flex justify-center lg:col-span-5 lg:-mb-24">
            <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-[560px] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,#FFE9A8,transparent)] opacity-60" />
            <Mascot name="puppy-happy" size={210} priority alt="A happy golden puppy peeking out from behind the phone" className="absolute bottom-6 left-1/2 -ml-[268px] hidden -rotate-6 sm:block" />
            <Mascot name="kitten-happy" size={190} priority alt="An orange kitten peeking out from behind the phone" className="absolute top-10 left-1/2 ml-[82px] hidden rotate-6 sm:block" />
            <Phone className="rotate-2">
              <ResultScreen name={fresh.name} kind={fresh.kind} result={freshDog} />
            </Phone>
          </div>
        </div>
      </section>

      {/* Proof strip: honest at launch. Ratings and quotes go here once they are real. */}
      <section className="bg-cream-deep pt-14 pb-12 lg:pt-16">
        <div className="wrap flex flex-col gap-x-12 gap-y-3 font-medium lg:flex-row lg:items-center lg:pr-[440px]">
          <p className="font-display text-[22px] font-bold">New on the App Store</p>
          <p className="text-ink2">No ads. No paid placements. Every score explained.</p>
        </div>
      </section>

      <section id="how" className="section pb-0 lg:pb-0">
        <div className="wrap">
          <h2 className="reveal max-w-[16ch]">From label to score in one photo.</h2>
          <div className="mt-6 md:mt-0">
            <Story
              beats={[
                {
                  title: 'Snap the label.',
                  body: 'Flip the bag over and fit the ingredient list in the frame. A barcode works too. If we have never seen the barcode, the photo still gets you a score.',
                  screen: <ScanScreen />,
                },
                {
                  title: 'Get the score.',
                  body: `This grocery store kibble lands at ${kibbleDog.score}. You see the ${kibbleDog.flags.filter((f) => f.severity !== 'good').length} things dragging it down, in plain words, worst first.`,
                  screen: <ResultScreen name={kibble.name} kind={kibble.kind} result={kibbleDog} live={false} />,
                },
                {
                  title: 'Find something better.',
                  body: 'BowlScore lines up foods of the same kind that score higher, and tells you why each one is better.',
                  screen: (
                    <PicksScreen
                      picks={[
                        { name: fresh.name, why: 'Turkey first. No dyes, no synthetic preservatives.', result: freshDog },
                        { name: grainFree.name, why: 'Salmon first, but legumes show up four times.', result: grainFreeDog },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section id="demo" className="section">
        <div className="wrap">
          <h2 className="reveal max-w-[18ch]">Try it on three foods.</h2>
          <p className="lede mt-5">Pick a sample label. The same scoring code that runs in the app runs right here in your browser.</p>
          <div className="mt-12">
            <Demo happy={<Mascot name="puppy-happy" size={160} />} worried={<Mascot name="puppy-worried" size={160} />} />
          </div>
        </div>
      </section>

      {/* Red flags: editorial list on 7 columns, mascot pinned in the other 5. Second deliberate grid break. */}
      <section className="section bg-cream-deep">
        <div className="wrap grid gap-x-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="reveal">Six ingredients we always call out.</h2>
            <ul className="mt-10">
              {RED_FLAGS.map((f) => (
                <li key={f.name} className="flag-row border-t border-ink/15 py-7">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h3 className="text-[26px]">{f.name}</h3>
                    <span className={`rounded-full border px-3 py-0.5 text-[14px] font-semibold ${TAG_STYLE[f.tag]}`}>{f.tag}</span>
                  </div>
                  <p className="mt-2 max-w-[58ch] text-ink2">{f.why}</p>
                  <a href={f.href} target="_blank" rel="noopener" className="flag-source link mt-3 inline-block text-[15px] font-medium">
                    Source: {f.source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
            <div className="sticky top-32">
              <Mascot name="puppy-worried" size={340} alt="The BowlScore puppy looking worried about an ingredient list" />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="reveal max-w-[20ch]">Cats are not small dogs. We score them differently.</h2>
          <div className="mt-10">
            <SpeciesToggle
              dog={
                <SpeciesPanel
                  mascot={<Mascot name="puppy-sniffing" size={300} alt="The BowlScore puppy sniffing the ground" />}
                  heading="For dogs, named protein comes first."
                  score={kibbleDog}
                  scoreLine="The grocery store kibble, scored for an adult dog"
                  rules={[
                    ['Named meat beats mystery meat', 'Chicken or salmon meal earns points. Meat meal and animal fat, with no animal named, lose them.'],
                    ['Protein floor of 18 percent', 'Measured on a dry matter basis. Puppies need 22.5 percent, straight from the AAFCO nutrient profiles.'],
                    ['Legume heavy recipes get a note', 'The FDA has looked into a possible link between these diets and heart disease in dogs. Nothing is proven, so we inform and barely penalize.'],
                  ]}
                />
              }
              cat={
                <SpeciesPanel
                  mascot={<Mascot name="kitten-peeking" size={300} alt="The BowlScore kitten peeking over a ledge" />}
                  heading="For cats, the rules get stricter."
                  score={kibbleCat}
                  scoreLine="The very same kibble, scored for an adult cat"
                  rules={[
                    ['Taurine has to be on the label', 'Cats cannot make enough of it. A complete cat food with no taurine listed gets a critical flag and loses 8 points.'],
                    ['Protein floor of 26 percent', 'Cats are obligate carnivores. Kittens need 30 percent, and carbs above 35 percent get flagged.'],
                    ['Propylene glycol caps the score at 15', 'The FDA prohibits it in cat food under 21 CFR 589.1001. For dogs it is only a penalty.'],
                  ]}
                />
              }
            />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="section bg-cream-deep">
        <div className="wrap grid gap-x-6 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="reveal">Brands cannot pay for a score.</h2>
            <p className="lede mt-6">{NOT_VET_LONG}</p>
            <Link href="/methodology" className="btn mt-8">
              <span>Read the methodology</span>
            </Link>
          </div>
          <dl className="lg:col-span-6 lg:col-start-7">
            {[
              ['Independent', 'We do not run ads and no brand can buy, sponsor or edit a score. Every food goes through the same rubric.'],
              ['Sourced', 'Every rule traces back to a named source: AAFCO nutrient profiles, FDA regulations, the Merck Veterinary Manual and WSAVA guidance.'],
              ['Versioned and public', 'This is Scoring model v1. When a number changes, the version changes, and the full rubric is published for anyone to check.'],
            ].map(([t, d]) => (
              <div key={t} className="border-t border-ink/15 py-7 first:border-0 first:pt-0">
                <dt className="font-display text-[26px] font-bold tracking-tight">{t}</dt>
                <dd className="mt-2 max-w-[52ch] text-ink2">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Better alternatives: UI pulled out of the phone, at scale. */}
      <section className="section">
        <div className="wrap">
          <h2 className="reveal max-w-[18ch]">Bad news comes with a better bowl.</h2>
          <p className="lede mt-5">Every low score comes with higher scoring foods of the same kind, so a swap takes one tap.</p>
          <div className="mt-12 grid items-center gap-5 md:grid-cols-[1fr_auto_1.25fr]">
            <SwapCard name={kibble.name} line="Corn first, unnamed meat, three dyes." result={kibbleDog} />
            <svg viewBox="0 0 48 24" className="mx-auto w-12 rotate-90 md:rotate-0" fill="none" stroke="#231F1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12h42M34 3l10 9-10 9" />
            </svg>
            <SwapCard name={fresh.name} line="Turkey and turkey liver first. Nothing artificial." result={freshDog} big />
          </div>
          <p className="mt-8 max-w-[70ch] text-[15px] text-ink2">
            {AMAZON_SENTENCE} We may earn a commission if you buy through these links. Commissions never change a score or the order of alternatives.{' '}
            <Link href="/affiliate-disclosure" className="link">
              Affiliate disclosure
            </Link>
          </p>
        </div>
      </section>

      <section id="pricing" className="section pt-0 lg:pt-0">
        <div className="wrap grid gap-x-6 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="reveal">One price. Every scan.</h2>
            <p className="lede mt-5">Billed through the App Store. Cancel anytime in Settings.</p>
            <div className="mt-8">
              <AppStoreBadge placement="pricing" />
            </div>
          </div>
          <div className="rounded-hero bg-surface p-3 shadow-warm ring-1 ring-hairline lg:col-span-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative rounded-card border-2 border-ink p-6">
                <span className="absolute -top-3.5 left-5 rounded-full bg-yellow px-3 py-0.5 text-[14px] font-bold">3 days free</span>
                <p className="font-semibold">Yearly</p>
                <p className="num mt-3 text-[44px] leading-none">${PRICE_YEARLY}</p>
                <p className="mt-1 text-ink2">per year, after a 3 day free trial</p>
                <p className="mt-4 text-[15px] font-medium">About $2.92 a month. Save 51 percent.</p>
              </div>
              <div className="rounded-card border-2 border-hairline p-6">
                <p className="font-semibold">Monthly</p>
                <p className="num mt-3 text-[44px] leading-none">${PRICE_MONTHLY}</p>
                <p className="mt-1 text-ink2">per month, no trial</p>
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-2 p-6 sm:grid-cols-2">
              <p className="font-semibold sm:col-span-2">Both plans include</p>
              {['Unlimited label and barcode scans', 'Flags matched to your pet and its allergies', 'Better food picks, ranked', 'Scan history for every pet', 'Dogs and cats, all life stages', 'No ads, ever'].map((x) => (
                <p key={x} className="border-t border-hairline pt-2 text-[16px]">
                  {x}
                </p>
              ))}
              <p className="mt-4 text-[14px] text-ink2 sm:col-span-2">
                The sample scan inside the app is free. Scanning your own food needs a plan. Plans renew automatically until cancelled. See the <Link href="/terms" className="link">Terms</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-cream-deep">
        <div className="wrap grid gap-x-6 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="reveal">Fair questions.</h2>
            <Mascot name="kitten-head" size={220} alt="The BowlScore kitten looking curious" className="mt-10 hidden lg:block" />
          </div>
          <div className="lg:col-span-8">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="border-t border-ink/15 last:border-b">
                <summary className="flex items-center justify-between gap-6 py-5">
                  <h3>{q}</h3>
                  <span className="chev text-[28px] leading-none" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-6 text-ink2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action: the one full bleed yellow field on the page. */}
      <section className="overflow-hidden bg-yellow">
        <div className="wrap grid items-end gap-x-6 lg:grid-cols-12">
          <div className="py-20 lg:col-span-7 lg:py-32">
            <h2 className="max-w-[14ch] text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] font-extrabold">See the score before the next scoop.</h2>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <AppStoreBadge placement="final" className="h-[56px]" />
              <QrCard placement="final" />
            </div>
          </div>
          <div className="flex justify-center lg:col-span-5">
            <Mascot name="pair-celebrating" size={460} alt="The BowlScore puppy and kitten jumping for joy" className="-mb-6 h-auto w-[300px] lg:w-[460px]" />
          </div>
        </div>
      </section>
    </>
  )
}

function SpeciesPanel({ mascot, heading, rules, score, scoreLine }: { mascot: React.ReactNode; heading: string; rules: string[][]; score: ReturnType<typeof scoreFood>; scoreLine: string }) {
  return (
    <div className="grid items-start gap-x-6 gap-y-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <h3 className="text-[clamp(1.6rem,2.6vw,2.25rem)] leading-[1.08]">{heading}</h3>
        <dl className="mt-6">
          {rules.map(([t, d]) => (
            <div key={t} className="border-t border-hairline py-5">
              <dt className="font-semibold">{t}</dt>
              <dd className="mt-1 max-w-[56ch] text-ink2">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col items-center gap-6 lg:col-span-4 lg:col-start-9">
        <div className="hidden lg:block">{mascot}</div>
        <div className="flex w-full items-center gap-4 rounded-card bg-surface p-4 shadow-warm ring-1 ring-hairline">
          <ScoreRing score={score.score} grade={score.grade} size={72} live={false} />
          <p className="text-[15px] leading-snug">
            {scoreLine}:{' '}
            <strong>
              {score.score}, {score.grade}
            </strong>
          </p>
        </div>
      </div>
    </div>
  )
}

function SwapCard({ name, line, result, big }: { name: string; line: string; result: ReturnType<typeof scoreFood>; big?: boolean }) {
  return (
    <div className={`flex items-center gap-5 rounded-hero bg-surface shadow-warm ring-1 ring-hairline ${big ? 'p-7 sm:p-9' : 'p-6'}`}>
      <ScoreRing score={result.score} grade={result.grade} size={big ? 132 : 96} />
      <div>
        <p className="font-display text-[20px] leading-tight font-bold" style={{ color: GRADE_COLOR[result.grade] }}>
          {result.grade}
        </p>
        <p className={`font-display leading-tight font-bold ${big ? 'text-[28px]' : 'text-[22px]'}`}>{name}</p>
        <p className="mt-1 text-[15px] text-ink2">{line}</p>
      </div>
    </div>
  )
}
