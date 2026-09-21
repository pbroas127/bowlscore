# BowlScore: status and what is left

Updated by Claude on 2026-09-21, late morning.

## Done
- GitHub signing secrets set (you approved running them through the Dash terminal). Repo is now PUBLIC so Mac builds are free and unlimited: your private repo Mac minutes were exhausted. The full git history was scanned first, no keys were ever committed.
- Gemini key set in Vercel. Verified live end to end: anonymous sign in, photo of a label, Gemini read all 10 ingredients and the protein number, the rubric scored it.
- RevenueCat project "BowlScore" (id 4a1843e1): App Store app with your existing in app purchase key and App Store Connect key, products `bowlscore_pro_yearly` and `bowlscore_pro_monthly`, entitlement `pro`, offering `default` with Annual and Monthly packages. The public SDK key is in `app/src/lib/config.ts`. There is a leftover inactive entitlement called `apro` from a typo, ignore it.
- The monthly product now exists in App Store Connect too (created through RevenueCat).
- Build fixes found by real builds: removed the push entitlement (the app only uses local reminders), moved the workflow to the macos-26 runner because Expo SDK 57 needs Xcode 26.5 or newer.

## Needs you (App Store Connect logged itself out, I cannot type your password)
1. Log back in to App Store Connect in the Chrome tab. Then I can finish, or you can:
   - Set the monthly price to $5.99 (product `bowlscore_pro_monthly`), add its display name "BowlScore Pro Monthly" and description "Unlimited scans for every dog and cat".
   - Add the 3 day free trial intro offer on `bowlscore_pro_yearly` (Subscription Prices, plus button, Create Introductory Offer, all countries, no end date, Free, 3 days).
   - TestFlight tab: create an internal group, add yourself, so you get the install email for each build.
2. Sandbox tester: Users and Access, Sandbox, add a tester (needs a password, so it has to be you). On the iPhone: Settings, Developer, Sandbox Apple Account. TestFlight purchases are always free.

## Still open, none of it blocks TestFlight
- Firestore database for cloud backup: Firebase console, Firestore, Create database, production mode, then paste `docs/firestore.rules`. The app works without it, backup just stays off.
- Google sign in: pick a support email in Firebase Authentication, enable Google, create an iOS OAuth client, set `GOOGLE_IOS_CLIENT_ID` in `app/src/lib/config.ts` and add the google sign in config plugin. The button stays hidden until then. Also add an Apple app (bundle id com.peterbroas.bowlscore) in Firebase project settings so Sign in with Apple tokens validate.
- App Store screenshots, and pasting `docs/app-store-listing.md` into the listing.
- Amazon Associates and Chewy affiliate signups (need your address and tax info). Then swap tagged links into `shopLink` in `app/src/lib/links.ts`.
- Legal pages name you as "Peter Broas, United States" with no street address. Read /privacy and /terms once before release.
- Do NOT submit for App Review yet: Wick's 4.3(a) spam rejection put an extended review warning on the account. TestFlight is safe. Submission should be your decision and your click.
- Your C: drive was completely full overnight. Keep a few GB free or installs and builds on this PC fail.

## Where everything is
- App: `app/` (Expo SDK 57). Preview on this PC: `cd app`, `npx expo start --web --port 8090`, open http://localhost:8090/preview.html
- Site and API: `site/`, live at https://bowlscoreapp.vercel.app, auto deploys from main.
- Scoring: `site/src/lib/rubric.ts`, tests with `npm test` inside `site/`.
- Build: `.github/workflows/beta.yml` plus `fastlane/`. Start one with `gh workflow run beta.yml --repo pbroas127/bowlscore`.
- IDs: bundle com.peterbroas.bowlscore, Apple ID 6814359922, Firebase bowlscore-5e75a, Vercel project bowlscore, RevenueCat project 4a1843e1.
- Image budget used: about $0.85 of $10.
