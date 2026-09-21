# BowlScore: morning checklist

Written by Claude overnight on 2026-09-21. Do these top to bottom. Total time is about 20 minutes of your hands, plus one 30 minute cloud build.

## 1. Free some disk space first (2 min)
Your C: drive hit 0 bytes free overnight. I cleared only the npm download cache (safe, it refills on demand) which freed 3.7 GB, but the drive is still 99 percent full. Builds and installs will fail again unless you free several GB.

## 2. Give the repo your signing secrets, then start the TestFlight build (1 min)
My safety layer would not let me copy your App Store signing secrets into the new repo, so this one is yours. Paste this into PowerShell:

```powershell
$S = "C:\Users\pbroa\AI Projects\Phos\.secrets"; $R = "pbroas127/bowlscore"
Get-Content "$S\AuthKey_Q7WWG48Z2P.p8" -Raw | gh secret set ASC_KEY_P8 --repo $R
Get-Content "$S\certs_deploy_key" -Raw | gh secret set MATCH_DEPLOY_KEY --repo $R
(Get-Content "$S\match_password.txt" -Raw).Trim() | gh secret set MATCH_PASSWORD --repo $R
gh secret set ASC_KEY_ID --repo $R --body "Q7WWG48Z2P"
gh secret set ASC_ISSUER_ID --repo $R --body "c3787487-45c4-4ea5-9ef3-398268819bae"
gh workflow run beta.yml --repo $R
```

Watch it at https://github.com/pbroas127/bowlscore/actions. It is the same pipeline as Wick (fastlane match, glance certs repo). About 30 minutes later the build shows up in TestFlight. The first time, open App Store Connect, TestFlight tab, and add yourself to an internal testing group so you get the email.

Honest warning: this is the first ever iOS build of this app and I could not test compile it on Windows. If the build fails, tell me and paste the failing step. The repo is private, which gives you roughly 6 Mac builds a month on the free plan. Making it public removes that limit (your call, the code has no secrets in it).

## 3. Create the Gemini key so photo scans work (1 min)
Google blocked me as a suspicious request when I tried. Go to https://aistudio.google.com/api-keys, click Create API key, name it BowlScore, keep it on the free tier (no billing, so it can never cost money). Then in Vercel open the bowlscore project, Settings, Environment Variables, add `GEMINI_API_KEY` with that value for Production, and redeploy. Until then barcode scans work and label photo scans show a friendly error.

## 4. Finish subscriptions in App Store Connect (10 min, I can drive this with you)
App Store Connect started throwing errors overnight, so this is half done:
- Done: subscription group "BowlScore Pro", product `bowlscore_pro_yearly` at $34.99 in 175 countries with its display name.
- Still to do: the 3 day free trial intro offer on yearly, the monthly product `bowlscore_pro_monthly` at $5.99, a review screenshot for each, then RevenueCat (new project, App Store app with the bundle id, both products, entitlement `pro`, offering with annual and monthly packages) and paste the RevenueCat public iOS key into `app/src/lib/config.ts` as `RC_IOS_KEY`.
- Until that key is set, the app runs purchases in a clearly safe mock mode: the paywall works and "buying" unlocks the app for free. Perfect for your first TestFlight run, not for release.
- Sandbox testing: App Store Connect, Users and Access, Sandbox, create a tester (you must do this, it needs a password). On the iPhone sign into that tester under Settings, Developer, Sandbox Apple Account. Purchases in TestFlight builds are always free and renew fast (a year renews in an hour).

## 5. Small stuff
- Google sign in: Apple, email and anonymous sign in are live in Firebase (project bowlscore-5e75a). Google needs a support email picked in the Firebase console and an iOS OAuth client. The Google button stays hidden in the app until `GOOGLE_IOS_CLIENT_ID` is set, so nothing is broken. Also add an Apple app with bundle id com.peterbroas.bowlscore in Firebase project settings so Sign in with Apple tokens validate.
- Firestore: create the database in the Firebase console (production mode) and paste the rules from `docs/firestore.rules`. Cloud backup for signed in users starts working the moment it exists.
- Amazon Associates and Chewy affiliate signups need your address and tax info. The site is live now, so you can apply. Swap the tagged links into `shopLink` in `app/src/lib/links.ts`.
- Support email is pbroas127+bowlscore@gmail.com (lands in your normal inbox).
- Legal pages name you as "Peter Broas, United States" with no street address. Read /privacy and /terms once before release.
- Do NOT submit for App Review yet. Your ScreenTime agent flagged that Wick was rejected under 4.3(a) with an extended review warning on the account. TestFlight is safe. Review submission is your decision and should be your click.

## What exists right now
- App: `app/` Expo SDK 57. 18 screen quiz onboarding with a demo scan, timeline paywall, camera and barcode scanner, result screen with score ring, flags, dry matter nutrition bars and better picks, pets, settings, account, cloud backup. Typechecks clean. Reviewed screen by screen in a browser preview.
- Scoring: `site/src/lib/rubric.ts`, deterministic, separate dog and cat rules, dry matter math, tests pass (premium kibble 93, corn and dye kibble 26, meaty wet cat food 96).
- Site and API: https://bowlscoreapp.vercel.app (landing, methodology, privacy, terms, support, affiliate disclosure, /get redirect, /api/scan). Auto deploys from main.
- Apple: bundle id registered with Sign in with Apple, app record "BowlScore: Pet Food Scanner" (Apple ID 6814359922).
- Repo: https://github.com/pbroas127/bowlscore (private).
- Preview the app on this PC: `cd app`, `npx expo start --web --port 8090`, open http://localhost:8090/preview.html
- Image budget used: about $0.85 of $10.
