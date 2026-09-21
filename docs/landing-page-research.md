# BowlScore landing page spec (research, 2026-09-21)

Sites studied: Yuka, Cal AI, Opal, Finch, The Farmer's Dog, Smalls, plus Lapa Ninja and Landingfolio app galleries, AI slop writeups (925 Studios, Developers Digest), Apple App Review Guidelines, Amazon Associates Operating Agreement, WebKit and Motion docs. Sources at the bottom.
Copy rule: no hyphens or em dashes in any user facing copy. All example copy below follows it.

## 0. The one big idea
Yuka is the closest model: outcome headline, a real scored product on screen immediately, an independence section, then proof. Cal AI and Opal show the download mechanics (badges everywhere, rating next to the badge). Farmer's Dog and Smalls show how pet brands earn trust (named vets, AAFCO, a study, a guarantee) and how warm voice beats clinical voice.
BowlScore's signature moment is **the scan turning into a score**. Build that once, beautifully, in real HTML and SVG, and let the rest of the page stay calm. One hero moment beats twelve fade ins.

## 1. Page structure (in order)
| # | Section | Contains | Why |
|---|---------|----------|-----|
| 1 | Nav | Wordmark, 3 anchors (How it works, Methodology, Pricing), ink black "Get the app" pill. Turns solid cream after 80px scroll. | Few links keep focus on download. |
| 2 | Hero | Asymmetric split. Left: H1, one line sub, App Store badge, QR card (desktop only), rating line when real. Right: one phone with the live score ring, puppy and kitten peeking from behind it. | Shows product and outcome in the first 700px. |
| 3 | Proof strip | At launch: "New on the App Store" plus 2 or 3 real beta tester quotes with pet name and photo. Later: star rating, scan count, press logos. | Never invent numbers. Yuka and Opal place rating right under the hero. |
| 4 | How it works | Sticky scroll story, 3 beats: Snap the label, Get the score, Find something better. Phone stays pinned, screen content changes. | The core explanation, told with the product itself. |
| 5 | Live demo | Visitor picks one of 3 generic sample foods (Grocery store kibble, Grain free premium, Fresh cooked). Ring counts up, flagged ingredients expand on tap. | Interactive proof beats screenshots. Use generic labels, not real brands, to avoid defamation and trademark risk on a marketing page. |
| 6 | Red flags | Editorial list, not cards: 6 ingredients (BHA, BHT, ethoxyquin, artificial colors, unnamed animal fat or meat meal, propylene glycol) each with a severity tag (Avoid, Caution, Debated) and a one line reason with a source link. | Teaches something, which earns the scroll and the SEO. |
| 7 | Dogs and cats | Toggle between puppy and kitten. Cat side: obligate carnivore, taurine, propylene glycol not allowed in cat food by FDA. Dog side: named proteins, FDA grain free and DCM investigation. Mascot and accent shift with the toggle. | Shows species specific scoring, a real differentiator. |
| 8 | Science and trust | 3 pillars in the Yuka pattern: Brands cannot pay for a score, Every flag links to a source, Scoring model is versioned and public. Link to /methodology. Not a vet disclaimer sits here in plain sight. | A ratings product lives or dies on independence. |
| 9 | Better alternatives | Side by side swap: a 38 becomes an 86. Affiliate disclosure directly under it. | Shows the payoff after the bad news. |
| 10 | Pricing | Two plans on one panel. Yearly 34.99 (about 2.92 a month, save 51 percent) preselected, monthly 5.99. List what is free and what is paid. "Billed through the App Store. Cancel anytime in Settings." State a trial only if one exists. | Honest pricing on the site reduces refund requests and review anger. |
| 11 | FAQ | 7 or 8 questions as native `details` elements: How is the score calculated, Is this vet advice, Do brands pay you, Does it work for cats, What does it cost, How do I cancel, What happens to my photos, Which foods are covered. | Doubles as FAQPage structured data. |
| 12 | Final CTA | Full bleed warm yellow field, both mascots large, one line, badge and QR again. | Yellow is saved for this moment so it lands. |
| 13 | Footer | Privacy, Terms, Support, Methodology, Affiliate disclosure, contact email, copyright, Apple trademark line. | Apple reviewers and Amazon both look here. |
Mobile only: a sticky bottom bar with the App Store badge appears after the hero leaves the viewport.

## 2. Hero patterns
- **Headline formulas** (pick one, test later). Outcome: "Know what is really in the bowl." Mechanism: "Scan the label. See the score." Question: "Is your pet's food as good as the bag says?" Recommendation: the outcome line as H1, the mechanism line as the sub: "Point your camera at any dog or cat food label and get a 0 to 100 ingredient score in seconds."
- **Phone treatment**: one device, straight on or at most 6 degrees of rotation, never the stock tilted 3D clay mockup. Frame is a custom CSS rounded rect (radius about 48px, 1px warm gray border, 10px ink bezel, dynamic island pill). Screen content is live HTML and SVG, so it is crisp at every size and costs almost no bytes. Shadow is a soft warm tinted contact shadow, not gray black.
- **Badge placement**: official Apple badge SVG, unmodified, minimum 40px tall, directly under the sub. Repeat in nav (as pill), pricing, final CTA, mobile sticky bar. Follow Apple badge guidelines (clear space, no recolor).
- **QR for desktop**: small white card beside the badge, 96 to 120px code, caption "Scan with your iPhone camera". Show it only at `min-width: 1024px` and `pointer: fine`. Encode a link to `/get` that redirects to the App Store with a campaign token (`?pt=&ct=qr_hero`) so scans are measurable. Generate the QR as a static SVG at build time, no runtime library.
- **Rating line**: "4.8 on the App Store" only when true and above about 50 ratings. Until then use "New on the App Store".
- iOS only, so do not show a Google Play badge or a "coming soon" Android stub. A quiet "Android waitlist" link in the footer is enough.

## 3. Motion and interaction
**Libraries**: `motion` (the renamed Framer Motion, import from `motion/react`) with `LazyMotion` and the `m` component to keep the initial cost near 5 kB. CSS scroll driven animations (`animation-timeline: view()`) as progressive enhancement inside `@supports`, since Chrome, Edge and Safari 26 support them and Firefox is still partial. **Skip Lenis.** Most traffic is mobile where native scroll is already ideal and Lenis does nothing on touch by default; it adds risk on Safari for little gain. Revisit only if desktop feel is a complaint.
- **Signature moment, the ring**: SVG circle, `stroke-dashoffset` driven by a motion value. Number counts up with `tabular-nums` so it does not jitter. Stroke color travels red to amber to green as it sweeps, settles with a light spring overshoot, then the mascot reacts (ear perk or tail wag, a 2 or 3 pose crossfade). Plays once when 50 percent in view. Upgrade mascots to Rive later if an illustrator animates them.
- **Sticky story (section 4)**: outer container 300vh, inner `position: sticky; top: 0; height: 100svh`. `useScroll` on the container, `useTransform` maps progress to three screen states and three text blocks. Motion runs this on the native ScrollTimeline where available. On mobile under 768px, drop sticky and stack three static phone crops; pinned scroll on small screens feels like a trap.
- **Reveals**: only headings and media, 16px rise plus opacity, 450ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`, 60ms stagger, `viewport={{ once: true }}`. Body text never animates.
- **Hover**: buttons scale 0.98 on press, not up on hover. Red flag rows reveal their source link and shift a 2px indicator. FAQ uses native `details` with a height transition. Links get an underline that draws from the left.
- **Never**: scroll hijacking, horizontal scroll sections, cursor followers, parallax on mobile, autoplaying sound, looping attention animations near the CTA.
- **Performance guardrails**: animate only `transform` and `opacity` (the ring stroke is the one allowed exception, it is a small paint area). No layout reads in scroll handlers. `will-change` only during the animation. Targets: LCP under 2.0s on 4G, CLS under 0.05, INP under 200ms, first load JS under 150 kB gzipped, Lighthouse mobile 95 or higher. Everything below the hero is a server component unless it needs interaction.
- **Reduced motion**: wrap the app in `<MotionConfig reducedMotion="user">`, and in CSS under `prefers-reduced-motion: reduce` show the ring at its final value, replace the sticky story with stacked static sections, and remove springs. Nothing is hidden behind an animation: all content is in the DOM and visible without JS.

## 4. Visual system
- **Type (free, via `next/font/google`, variable, two families max)**: display **Bricolage Grotesque** (weights 600 to 800, tight tracking of about 0.02em negative, optical size axis gives it real character at large sizes) and text **Figtree** (400, 500, 600). Score numerals use Bricolage at 800 with lining tabular figures. Alternative pair from Fontshare, self hosted with `next/font/local`: Cabinet Grotesk plus Satoshi. Avoid Inter, Space Grotesk, Instrument Serif and the serif italic accent word, which are the current AI defaults.
- **Scale**: H1 `clamp(2.75rem, 6vw, 5.5rem)` at line height 0.95 to 1.0; H2 `clamp(2rem, 4vw, 3.5rem)`; body 18px desktop, 17px mobile, line height 1.55, max measure 62 characters. Sentence case everywhere, no all caps headings.
- **Grid**: 12 columns, 1200px content width, 24px gutters, selected media may bleed to 1360px. Mobile 4 columns with 20px margins. Break the grid on purpose twice: the hero phone overlaps the section below, and the red flags list runs on 7 of 12 columns with a sticky mascot in the remaining 5.
- **Spacing**: 8pt scale. Section padding 128 to 160px desktop, 72 to 88px mobile. Vary rhythm: tight inside a group, generous between sections. Radius scale 12, 20, 32, used consistently.
- **Color** (proposed tokens, tune to the final logo): cream `#FFF7E8` page, deeper cream `#F6EAD2` surfaces, warm yellow `#FFC93C` fields, ink `#1F1A14` text and buttons, score green `#2FBF5B`, amber `#F4A12B`, red `#E5484D`. Rough ratio 70 cream, 15 yellow, 10 ink, 5 score colors. **Green, amber and red are semantic only**: they appear on scores and severity tags and nowhere else, so the score always reads as the loudest thing on the page. Primary button is ink, not green. Never set text in yellow (fails contrast on cream). No gradients except a barely visible radial warm glow behind the hero phone. No pure black, no pure white page.
- **Mascots**: one illustration style, one line weight, commissioned or generated once and then cleaned up as SVG. Use them as actors, not stickers: peeking behind the phone in the hero, reacting to the score, sitting beside the FAQ, sleeping in the footer. Maximum one mascot appearance per viewport. Real pet photography (Farmer's Dog style) is welcome in testimonials only, never mixed with illustration in the same block.
- **Device frames without looking cheap**: one full phone in the hero and one pinned phone in the story. Everywhere else, pull UI out of the phone: a score card, an ingredient row, an alternatives sheet shown at large scale as floating crops with the same warm shadow. No laptop mockups, no angled phone fans, no glossy reflections.
- **Icons**: a small custom set (8 to 10) drawn at the mascot line weight, or none. No emoji, no generic thin line icon packs in tinted squares.

## 5. Trust builders for a ratings product
- **/methodology page** (linked from nav, trust section, FAQ, footer). Contents: what the score measures (ingredient quality and order, named versus unnamed animal sources, additives and preservatives, species fit, presence of an AAFCO nutritional adequacy statement); the weight of each factor; what it does not measure (no lab testing, no digestibility or sourcing audit, no individual pet health needs); how label photos are read and the error rate caveat; model version and date ("Scoring model 1.0, updated September 2026") with a public changelog; how to report a wrong score (email link).
- **Sources to cite by name with links**: AAFCO Official Publication ingredient definitions and nutrient profiles; FDA Center for Veterinary Medicine (pet food labeling, additive status, the DCM investigation updates, propylene glycol prohibition in cat food at 21 CFR 589.1001); WSAVA Global Nutrition Guidelines; NRC Nutrient Requirements of Dogs and Cats; peer reviewed papers for each debated flag. Each flagged ingredient in the app and on the site carries an evidence level (Avoid, Caution, Debated) so the product does not overclaim.
- **Independence statement** (only publish what is true): "Brands cannot pay to change a score. We do not run ads. Scores are calculated the same way for every food."
- **Affiliate disclosure**. Amazon Associates Operating Agreement section 5 requires this exact sentence, clearly and prominently on the site: **"As an Amazon Associate I earn from qualifying purchases."** Put it in the footer of every page, on a short /affiliate-disclosure page, and directly beside the alternatives section and any screen with Amazon links. Add the FTC style plain line near links: "We may earn a commission if you buy through these links. Commissions never change a score or the order of alternatives." Also register the site and the iOS app in the Associates account, since links are only allowed from approved properties.
- **Not a veterinarian disclaimer** (trust section, footer, Terms, methodology, and inside the app): "BowlScore is an educational tool, not veterinary advice. Scores reflect ingredient lists, not your pet's individual health needs. Talk to your veterinarian before changing your pet's diet, especially for puppies, kittens, seniors, or pets with medical conditions."
- **Accuracy language**: say "ingredient quality score", never "safe", "toxic", "healthy" or "vet approved". No named brand gets a bad score in marketing material.
- A named human: a short "Who makes BowlScore" line with a real name and contact email beats any badge. If a vet or animal nutritionist reviews the rubric, name them with credentials, as Farmer's Dog and Smalls do.

## 6. AI slop tells to avoid, and the premium move instead
| Tell | Do this instead |
|------|-----------------|
| Purple or indigo gradient, glow shadows, glass cards | Flat cream and yellow fields, one warm shadow style |
| Inter everywhere, or Space Grotesk plus Instrument Serif with an italic accent word | Bricolage Grotesque plus Figtree, chosen and documented |
| Centered hero with a pill badge above the H1 | Asymmetric split hero, no eyebrow badge |
| Three identical rounded cards with an icon on top | Editorial list, sticky story, one large interactive demo |
| Emoji or thin line icons in tinted squares | Mascot line weight custom icons, or no icons |
| Numbered 1 2 3 step cards | Pinned phone whose screen changes as you scroll |
| Stat banner of invented numbers ("10k+ happy pets") | Real numbers only, or honest "New on the App Store" |
| Fake testimonials with stock avatars | Beta testers with pet names and real photos |
| Weightless copy ("Smarter nutrition, happier pets", "Unlock", "Elevate", "Seamless") | Specific claims: "See the 3 ingredients dragging the score down" |
| Tilted stock phone mockup with a blurry PNG screenshot | Custom CSS frame with live HTML screen |
| Everything fades up on scroll, identical timing | One signature animation, quiet reveals on headings only |
| Same padding and same layout in every section | Deliberate rhythm, two grid breaks, one full bleed color field |
| Colored left border callouts, all caps headings, permanent dark mode | Sentence case, light warm theme, tags for severity |
| Low contrast gray body text | Ink on cream at 7 to 1 or better |
| Em dashes and hyphen heavy phrasing in copy | Short sentences, no dashes at all |
| Footer with dead links and lorem legal | Real legal pages, real email, real company name |
Before building, write these choices into a `DESIGN.md` token file (fonts, colors, radius, shadow, motion easing) so every component pulls from one source.

## 7. SEO and sharing
- **Next.js metadata** in `app/layout.tsx`: `metadataBase`, title template ("%s | BowlScore"), description of about 150 characters with "dog food scanner" and "cat food scanner", canonical, `openGraph` (type website, 1200 by 630 image), `twitter` card `summary_large_image`, icons, `themeColor` cream.
- **Smart App Banner**: `itunes: { appId: "<ASC id>", appArgument: "<url>" }` in metadata, which emits `<meta name="apple-itunes-app">`. Safari on iOS only, free installs from mobile web.
- **Open Graph image**: `app/opengraph-image.tsx` with `next/og`. Cream field, both mascots, a big green ring reading 86, wordmark, one line. Test in iMessage, since that is where pet owners share.
- **Structured data** (JSON LD in the landing page): `MobileApplication` with `name`, `operatingSystem: "iOS"`, `applicationCategory: "LifestyleApplication"`, `offers` (both prices, USD), `downloadUrl`, `screenshot`. Add `aggregateRating` only once real and matching the App Store. Add `FAQPage` for section 11 and `Organization` with contact email.
- `app/sitemap.ts` and `app/robots.ts`. Methodology and each red flag ingredient are the long term SEO surface ("is BHA safe in dog food"); ship the landing page first, add ingredient pages later.
- **Page speed**: static generation for every page, `next/image` with AVIF and `priority` on the hero art only, SVG mascots inlined, fonts through `next/font` (self hosted, swap, preloaded), no third party scripts except Vercel Analytics, no video in the hero (the ring is code). If a screen recording is used lower down: muted, `playsInline`, `preload="none"`, poster image, under 1.5 MB, lazy mounted.
- Track `badge_click` and `qr_scan` by placement using App Store campaign tokens so section performance is measurable.

## 8. Legal and support pages Apple requires for subscription apps
| Page | Apple requirement | Must contain |
|------|-------------------|--------------|
| `/privacy` | Privacy Policy URL is mandatory in App Store Connect for every app, and guideline 5.1.1(i) requires the link inside the app too. For auto renewing subscriptions, 3.1.2 requires a working link in the binary (paywall or settings) and in metadata. | What data is collected and how (label photos, pet profile, device identifiers, purchase status, analytics); every use of it; each third party that receives it (AI vision provider, RevenueCat or StoreKit, analytics, Amazon when a link is tapped) and that they give equal protection; retention and deletion policy; how to revoke consent and request deletion; children's privacy; contact email; effective date. Must match the App Privacy nutrition label answers exactly. |
| `/terms` | 3.1.2 requires a functional Terms of Use (EULA) link in the app and in metadata: either the EULA field in App Store Connect or a link in the App Description. Simplest path: custom terms page that also incorporates Apple's standard EULA, and paste the URL at the end of the App Description. | Subscription name, length and price of each plan; that payment is charged to the Apple Account; that it renews automatically unless cancelled at least 24 hours before the period ends; how to manage and cancel in Settings; refunds handled by Apple; license scope; the not veterinary advice disclaimer and limitation of liability; affiliate disclosure; acceptable use; governing law; contact. A custom EULA must include Apple's minimum terms (agreement is with the developer not Apple, Apple has no support or warranty obligation, third party beneficiary clause, developer name and address). |
| `/support` | Support URL is mandatory, and guideline 1.5 says it must include an easy way to contact you. A page with only a FAQ and no contact method gets rejected. | Visible support email (mailto link, plus an optional simple form), expected reply time, how to cancel (Settings, Apple Account, Subscriptions), how to restore purchases, how to request a refund (reportaproblem.apple.com), how to report a wrong score, how to delete data, link to the FAQ. |
| Account deletion | 5.1.1(v): if the app has accounts, deletion must be offered in the app. | Mention the in app path on /support and /privacy. If there are no accounts, say so. |
| Marketing URL | Optional field. | Use the landing page root. |
Also: the paywall inside the app must show plan title, length, price, and links to both /privacy and /terms, or review fails under 3.1.2. Keep all three URLs live and unchanged before submitting; reviewers click them. Have a lawyer or a reputable generator review the final legal text; this spec lists required contents, it is not legal advice.

## 9. Build order (lazy version first)
1. Tokens and `DESIGN.md`, fonts, layout, footer, the three legal pages (unblocks App Store submission).
2. Hero with the coded phone and ring, badge, QR, metadata, OG image, smart banner.
3. Live demo and red flags (reuses the ring component), trust section, /methodology.
4. Sticky story, dogs and cats toggle, pricing, FAQ, final CTA, structured data.
Skipped on purpose: Lenis, Rive, a CMS, a blog, dark mode, Android badge, per ingredient SEO pages. Add each when there is a measured reason.

## Sources
yuka.io/en, calai.app, opalapp.com, finchcare.com, thefarmersdog.com, smalls.com, lapa.ninja/category/app, landingfolio.com/inspiration/landing-page/mobile-app, designrush.com/best-designs/apps/trends/app-landing-pages, 925studios.co/blog/ai-slop-design-tells, developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it, developer.apple.com/app-store/review/guidelines (1.5, 3.1.2, 5.1.1), maxmannstein.com/blog/where-to-put-the-eula-for-ios-apps-implementing-subscriptions, affiliate-program.amazon.com/help/operating/agreement (section 5), webkit.org/blog/17101 (scroll driven animations), motion.dev/docs/react-scroll-animations, github.com/darkroomengineering/lenis, nextjs.org/docs/app/api-reference/functions/generate-metadata
