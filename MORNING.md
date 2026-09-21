# BowlScore: status and what is left

Updated by Claude on 2026-09-21, afternoon, after the big catalog build.

## Done
- Pipeline: repo is PUBLIC (free Mac builds), signing secrets set, workflow on the macos-26 runner, build number written into Info.plist so every upload gets a new number.
- Scanning: Gemini key is on the paid tier (your $10), scans take about 2 seconds. Barcodes go Open Pet Food Facts, then UPCitemdb for the name, then a grounded web lookup, then a label photo.
- RevenueCat project "BowlScore" (4a1843e1): entitlement `pro`, offering `default`, both products, public key in `app/src/lib/config.ts`. Ignore the inactive `apro` entitlement.
- App Store Connect: yearly $34.99 with a 3 day free trial, monthly $5.99, TestFlight group "Peter" with automatic distribution. Listing text, subtitle, categories, age rating 4+, review notes, privacy policy URL and all App Privacy answers are saved.
- Firebase: Anonymous, Email, Apple and Google sign in enabled, iOS app registered, Firestore database created with owner only rules.
- Affiliates: Amazon Associates approved, tag `bowlscore-20` is on every shop link. Chewy (Impact) is in review; flip `CHEWY_ON` in `app/src/lib/links.ts` when it is approved.
- Big build: real catalog of 47 scored foods (27 with pack shots), real swaps after every scan, Top rated on Home, catalog list with search, product pages, compare, pantry per pet with treats, 7 day switch plan with reminders, recall alerts from the FDA feed, share card, Google sign in, final icon.

## Needs you
1. Sandbox tester: App Store Connect, Users and Access, Sandbox, add a tester (it needs a password, so it has to be you). On the iPhone: Settings, Developer, Sandbox Apple Account. TestFlight purchases are always free.
2. Amazon Associates: tax info and payment method. You need 3 qualifying sales within 180 days.
3. App Store Connect, App Privacy: press Publish (answers are already filled in). App Review contact info (your name, phone, email) on the version page.
4. Gemini money: on October 1, open AI Studio, Spend, "Set spend cap" and set $5 a month. It could not be set in September because the month already showed $16.41 (a catalog build script drained the prepay; that script is now locked behind a `--paid` flag) and a lower cap would have blocked the key. Keep auto reload OFF: the prepaid balance is the hard limit.
5. Do NOT submit for App Review until you decide to: Wick's 4.3(a) rejection put an extended review warning on the account. Submission is your click.

## Still open
- 20 catalog products have no photo yet. The free photo lookup allows about 20 searches a day: run `npm run catalog` inside `site/` tomorrow and commit what it finds. Carousels already prefer products with photos.
- App Store screenshots (captions are in `docs/app-store-listing.md`).
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
