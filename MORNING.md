# BowlScore: status and what is left

Updated by Claude on 2026-09-22, about 2 AM.

## Tonight
- **Submitted to App Review in Chrome as you** (not via the API): version 1.0 with build 9, both subscriptions and the BowlScore Pro group. Status: Waiting for Review. **Expedited review requested** and Apple confirmed it.
- Email: support@bowlscore.app forwards to your Gmail through Forward Email (DNS only, free, no account). MX and TXT records are on Vercel DNS. It receives only; reply from Gmail. If you ever want to reply as support@, set up "Send mail as" in Gmail with Forward Email's paid SMTP, or keep replying from Gmail.
- Site now lives at https://www.bowlscore.app (bowlscore.app redirects to www). The API stays on bowlscoreapp.vercel.app.
- Build 9: Help and FAQ screen, Contact us and Send feedback (mail to support@bowlscore.app), subscription status row in Settings (plan and renew or end date), expired subscriptions send you back to the paywall (checked on launch and every time the app comes back to the front), Restore on the paywall, in Settings and on onboarding, paywall closes by itself once a subscription is confirmed.
- App Store Connect: 7 screenshots (captioned slides in `docs/store/slides`, made by `docs/store/compose_slides.py`), description updated, support and marketing URLs on bowlscore.app, review notes covering sandbox purchase, expired state, restore, deletion and affiliate links, contact Peter Broas +1 469 219 9688 support@bowlscore.app, no demo account needed, content rights Yes, not a medical device, price Free in all 175 countries, App Privacy published, subscription review screenshots and notes, group display name "BowlScore Pro".

## Done
- Pipeline: repo is PUBLIC (free Mac builds), signing secrets set, workflow on the macos-26 runner, build number written into Info.plist so every upload gets a new number.
- Scanning: Gemini key is on the paid tier (your $10), scans take about 2 seconds. Barcodes go Open Pet Food Facts, then UPCitemdb for the name, then a grounded web lookup, then a label photo.
- RevenueCat project "BowlScore" (4a1843e1): entitlement `pro`, offering `default`, both products, public key in `app/src/lib/config.ts`. Ignore the inactive `apro` entitlement.
- App Store Connect: yearly $34.99 with a 3 day free trial, monthly $5.99, TestFlight group "Peter" with automatic distribution. Listing text, subtitle, categories, age rating 4+, review notes, privacy policy URL and all App Privacy answers are saved.
- Firebase: Anonymous, Email, Apple and Google sign in enabled, iOS app registered, Firestore database created with owner only rules.
- Affiliates: Amazon Associates approved, tag `bowlscore-20` is on every shop link. Chewy (Impact) is in review; flip `CHEWY_ON` in `app/src/lib/links.ts` when it is approved.
- Big build: real catalog of 47 scored foods (27 with pack shots), real swaps after every scan, Top rated on Home, catalog list with search, product pages, compare, pantry per pet with treats, 7 day switch plan with reminders, recall alerts from the FDA feed, share card, Google sign in, final icon.
- Pet fit round: breed, age and weight on every pet (life stage comes from age and breed size), a "Fit for {pet}" card and a feeding guide on every report and product page, scanner pet dropdown and Food or Treat switch with a confirmation when the label disagrees, 16 treats in the catalog (62 products), daily plan on Home, bag tracker with a reorder reminder five days before the bag runs out, monthly weigh in nudge for growing pets. Barcode web lookups are remembered for 90 days so each product is only paid for once.

## Needs you
1. Sandbox tester: App Store Connect, Users and Access, Sandbox, add a tester (it needs a password, so it has to be you). On the iPhone: Settings, Developer, Sandbox Apple Account. TestFlight purchases are always free.
2. Amazon Associates: tax info and payment method. You need 3 qualifying sales within 180 days.
4. Gemini money: on October 1, open AI Studio, Spend, "Set spend cap" and set $5 a month. It could not be set in September because the month already showed $16.41 (a catalog build script drained the prepay; that script is now locked behind a `--paid` flag) and a lower cap would have blocked the key. Keep auto reload OFF: the prepaid balance is the hard limit.
5. Watch your email for the review result. If Apple rejects, the fix goes in a new build and resubmission returns to the expedited queue automatically.

## Still open
- 20 catalog products have no photo yet. The free photo lookup allows about 20 searches a day: run `npm run catalog` inside `site/` tomorrow and commit what it finds. Carousels already prefer products with photos.
- First device run checks: share image is not blank, sticky buttons on small phones, Google sign in round trip, a recall banner, a switch plan reminder at 8am.
- Legal pages name you as "Peter Broas, United States" with no street address. Read /privacy and /terms once before release.

## Where everything is
- App: `app/` (Expo SDK 57). Preview on this PC: `cd app`, `EXPO_PUBLIC_PREVIEW=1 npx expo start --web --port 8090`, open http://localhost:8090/preview.html
- Site and API: `site/`, live at https://bowlscoreapp.vercel.app, auto deploys from main. `/api/scan`, `/api/catalog`, `/api/recalls`.
- Catalog: `site/src/data/catalog.json` (labels only, scores are computed by the rubric on every deploy), photos in `site/public/products`.
- Scoring: `site/src/lib/rubric.ts`, tests with `npm test` inside `site/`.
- Build: `.github/workflows/beta.yml` plus `fastlane/`. Start one with `gh workflow run beta.yml --repo pbroas127/bowlscore`.
- IDs: bundle com.peterbroas.bowlscore, Apple ID 6814359922, Firebase bowlscore-5e75a, Vercel project bowlscore, RevenueCat project 4a1843e1.
- Image budget used: about $0.85 of $10.
