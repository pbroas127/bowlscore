# BowlScore App Design Research and Spec

Researched 2026-09-21. Sources at the bottom. Copy rule: no hyphens or em dashes in any user facing copy. All example copy below follows it.

## 0. What the research says (the five facts that drive everything)

1. Hard paywalls convert trial to paid about 5x better than freemium (10.7% vs 2.1% at day 35) and earn about 8x revenue per install by day 60 (RevenueCat State of Subscription Apps 2026). Our model is right.
2. 55% of 3 day trial cancellations happen on Day 0, 84% by Day 1. The first session after purchase must produce a real scan of the pet's real food within 60 seconds.
3. Apple has been rejecting the free trial toggle paywall since January 2026 under guideline 3.1.2. Do not build a toggle. Build a timeline paywall with plan cards.
4. The winners (Cal AI 28 to 32 screens, Olive about 25, Oasis 15) all use long quiz onboarding that feels like using the product: one question per screen, animation, a sample scan, a "building your plan" loader, a mid flow rating ask, then "Try for $0.00".
5. Every direct competitor is tiny (Doggo 105 ratings, Kibble 3, Woof 1, Pawdi 1). Nobody owns the category. Brand polish and trust is the whole opening.

## 1. Onboarding: 19 screens, then paywall

Rules for every quiz screen: thin progress bar at top (4px, green fill, animates with spring), back chevron top left, one question per screen, big tappable option rows (64px tall, radius 20), single select auto advances after 250ms with selection haptic, multi select shows a pinned bottom CTA. Mascot appears on about one screen in three, never on every screen. Use the pet name in every headline after screen 3. No account creation anywhere (RevenueCat anonymous ID; Sign in with Apple is optional in Settings later).

| # | Screen | Content |
|---|--------|---------|
| 1 | Welcome | Both mascots beside a bowl with the score ring filling to 92. Headline "Know what is really in the bowl". CTA "Get started". Small text link "I already subscribe" runs restore. |
| 2 | Pet type | "Who are we feeding?" Dog / Cat / Both as large illustrated cards. Swaps which mascot guides the rest. |
| 3 | Pet name | Text input, keyboard up, CTA "Continue". |
| 4 | Life stage | "How old is Biscuit?" Puppy or Kitten / Adult / Senior. |
| 5 | Size (dogs only) | Small / Medium / Large / Giant with silhouette icons. |
| 6 | Food type | "What does Biscuit eat most days?" Dry / Wet / Fresh or raw / A mix. |
| 7 | Attribution | "Where did you hear about us?" TikTok / Instagram / YouTube / Friend / App Store / Other. Early, while completion is highest. |
| 8 | Health concerns | Multi select chips: Itchy skin, Sensitive stomach, Weight, Picky eater, Dull coat, Joint health, None. |
| 9 | Allergies | Multi select: Chicken, Beef, Dairy, Grain, Fish, Egg, Not sure. |
| 10 | Education beat | Full bleed fact card. "A food labeled with chicken only needs 3 percent chicken." Source line: AAFCO labeling rules. Mascot looks shocked. CTA "Wow, continue". |
| 11 | Confidence | "How sure are you that Biscuit's food is good?" 5 step slider with mascot face changing per step. |
| 12 | Goal | "What matters most?" A longer life / Fewer tummy troubles / A shinier coat / Paying for quality, not marketing. |
| 13 | Social proof | 3 stacked testimonial cards with pet photos, star row, "Trusted by pet parents like you". Real beta tester quotes only. Never invent reviews or user counts. |
| 14 | Rating ask | "Help more pets eat better" then fire the native StoreReview prompt. Cal AI and Olive both do this mid flow. It is how a new app gets a 4.8 with volume. Apple caps prompts at 3 per year, so spend the first one here and the second after a user's 3rd scan rated Good or better. |
| 15 | Sample scan | Interactive demo (the Oasis pattern). A well known style generic kibble bag sits in a fake viewfinder. User taps the shutter, the real scan animation plays, the ring counts up to 41 "Poor", three flagged rows slide in. Canned data, zero API cost. This is the aha before the paywall and answers the top competitor complaint ("it doesn't let you do anything until you start a trial"). |
| 16 | Notification primer | "Get recall alerts for Biscuit's food" plus "We will remind you before your trial ends". Custom primer screen first, system prompt only after "Turn on alerts". "Not now" is a quiet text link. |
| 17 | Building profile | 5 second loader. Percent counter with tabular numerals, checklist ticking one by one ("Life stage needs", "Allergy watchlist", "Ingredient red flags", "Better food matches"), mascot sniffing loop, light haptic per tick. |
| 18 | Profile reveal | "Biscuit's food profile is ready". Card with pet name, 3 personalized watch items from their answers (example "Watching for chicken", "Flagging artificial colors", "Target score 75 or higher"). CTA "See Biscuit's plan". |
| 19 | Value recap | 3 rows with icons: Unlimited scans / Flags matched to Biscuit / Better foods ranked. CTA "Continue" leads to the paywall. |

Camera permission is NOT asked in onboarding. Ask at the first real scan (Yuka pattern: permission at the moment of intent). Persist quiz progress so a killed app resumes at the same screen.

## 2. Paywall

### Layout (single screen, no scroll on iPhone 15, timeline style)
1. Top row: "Restore" text button top right. No close button (hard paywall). No fake countdown timers.
2. Headline: "Start Biscuit's 3 day free trial". Small mascot holding a bowl, peeking from the right edge.
3. Trial timeline, vertical, 3 nodes joined by a line (Blinkist pattern, reported +23% conversion and 55% fewer complaints):
   - Today: "Unlock every scan, flag and better food pick"
   - Day 2: "We send a reminder that your trial is ending"
   - Day 3: "Billing starts. Cancel any time before and pay nothing"
   The Day 2 reminder must really be scheduled as a local notification at purchase time.
4. Two plan cards stacked, radius 20, selected card gets a 2px green border and a filled check:
   - Yearly (default selected). Badge on the top edge: "3 DAYS FREE". Large price "$34.99 per year". Smaller secondary line "Only $2.92 per month". Pill "Save 51%".
   - Monthly. "$5.99 per month". No trial, no badge.
5. Reassurance row with check icon: "No payment due now" (only when yearly is selected and the user is trial eligible).
6. CTA (56px pill, yellow, ink text): "Try free for 3 days" for yearly, "Continue" for monthly.
7. Disclosure directly under CTA, 13pt, ink at 70%: "3 days free, then $34.99 per year. Renews automatically. Cancel anytime."
8. Footer links, 13pt, tappable: "Restore purchases" · "Terms of Use" · "Privacy Policy".

### Apple review checklist (3.1.2 and friends)
- No trial toggle. Trial terms visible at all times without interaction.
- The billed amount and period ("$34.99 per year") is the most prominent price. The per month math is smaller and subordinate. Never headline a price that is not what gets charged.
- Trial length and what happens after it are stated next to the CTA.
- Functional Terms of Use (EULA) and Privacy Policy links on the paywall itself, AND in App Store Connect (privacy URL field; EULA link in the description or the custom EULA field).
- Restore purchases on the paywall and again in Settings.
- Never call the product "free". Say "3 days free, then".
- Pull every price from RevenueCat `product.priceString` (localized). Check intro eligibility; if not eligible, hide badge, timeline and "No payment due now", and change CTA to "Continue".
- Subscription must deliver ongoing value: ship recall alerts and new alternatives so the reviewer sees it.
- In review notes, explain the hard paywall and that sandbox purchase unlocks everything.

### Tests to queue after launch (structure beats cosmetics: trial and plan tests win about 59%, visual tests about 35%)
7 day trial vs 3 day (short trials convert worse in RevenueCat data, 25.5% vs 42.5% for long ones). Adding a weekly plan at $4.99 (weekly is 55.6% of category revenue per Adapty). A one time welcome offer on second open for non buyers, yearly at $24.99 for 24 hours (typical 10 to 15% ARPU gain). Use RevenueCat Offerings so all of this ships without a build.

## 3. Core screens

Navigation: 3 item tab bar. Home (left), raised circular Scan button (center, 64px, yellow, breaks the bar top edge), Pets (right). Settings is a gear on Home. After purchase the app lands on the Scan screen once with a coach bubble "Scan Biscuit's current food", then defaults to Home.

### Scan
- Full bleed camera, dark chrome, the only dark screen in the app.
- Segmented pill at the bottom: "Barcode" | "Label". Barcode auto detects (medium impact haptic on lock, bracket corners snap inward and turn green). Label mode uses a shutter button and a tall rounded frame with the hint "Fit the ingredients list in the frame".
- Top row: close, torch, pet switcher chip ("For Biscuit"). Bottom left: photo library import. Bottom right: "Type it in" search.
- Barcode miss flow: never a dead end. Sheet says "New one for us. Snap the ingredients list and we will score it" and switches to Label mode.
- Scan loading (2 to 5 s): freeze the captured frame, blur it 20%, a green scan line sweeps top to bottom, mascot sniffing at the bottom, staged status text cross fading: "Reading the label" → "Checking 38 ingredients" → "Scoring for Biscuit". Use the real ingredient count once OCR returns.

### Result (Yuka structure: verdict first, reasons second, depth on tap)
Top to bottom in one scroll view:
1. Product header: 64px thumbnail, product name (2 lines max), brand in secondary ink.
2. Score hero: 160px ring, 14px stroke, rounded caps, draws clockwise over 900ms while the numeral counts up. Numeral 64pt display font, "/100" small. Under it the grade word in grade color.
3. Personal alert banner when relevant, full width, tinted red 10% with red icon: "Contains chicken. Biscuit is allergic."
4. "Watch outs" section (negatives first, like Yuka). Rows: colored dot (red, orange, amber), ingredient name, one line reason ("Artificial color. No benefit for pets"), chevron. Tap opens a bottom sheet with the plain language explanation and a named source.
5. "The good stuff" section, same row pattern with green dots ("Named meat first", "Whole sweet potato").
6. "Nutrition" card: Protein, Fat, Fiber, Moisture, Estimated carbs. Each is a horizontal range bar with a marker and a green ideal zone for the pet's life stage, values shown on a dry matter basis with a small info icon.
7. "First five ingredients" numbered chips (the first five are most of the food by weight; pet owners know this heuristic).
8. "Better picks for Biscuit": horizontal carousel of cards, each with photo, name, score chip, "why it is better" one liner. Same food type and similar price tier first.
9. Footer: "How we score" link and "BowlScore is not veterinary advice."
Sticky bottom bar: primary "Set as Biscuit's food", secondary icon buttons Share (renders a branded score card image) and Save.

Grade bands (Yuka's bands, users already know them):
| Score | Word | Color |
|-------|------|-------|
| 75 to 100 | Excellent | #22B866 |
| 50 to 74 | Good | #8CCB3F |
| 25 to 49 | Poor | #F5862E |
| 0 to 24 | Bad | #E5484D |
Always pair color with the word and number (color blind safe).

### Home and History
- Home header: pet avatar, "Biscuit's bowl", current food card with mini ring and "Scanned 3 weeks ago". Below: "Recent scans" list. Pet switcher is a tap on the avatar.
- History rows: 48px thumbnail, name, brand, relative date, score dot plus number on the right. Swipe to delete. Filter chips on top: All, Excellent, Good, Poor, Bad, plus per pet. Search field pulls down.
- Empty state: kitten peeking over an empty bowl, "No scans yet", "Scan your first food" button.

### Pets
- Cards with circular photo (or mascot default), name, life stage, allergy chips, current food mini ring. "Add a pet" dashed card at the end. Detail screen edits the onboarding answers. Scores re personalize per pet.

### Settings
Native grouped list style, cream background, white grouped cards radius 20. Order: Subscription (Manage, Restore purchases) / Notifications (Recall alerts, Trial reminder) / Trust (How we score, Our sources, Not veterinary advice) / Support (Contact us, Rate BowlScore, Share with a friend) / Legal (Terms of Use, Privacy Policy, Delete my data). Footer: tiny mascots asleep, version number.

## 4. Visual system

### Typography (free, in Expo via expo google fonts)
- Display and numerals: **Bricolage Grotesque** 700 and 800 (`@expo-google-fonts/bricolage-grotesque`). Characterful, warm, slightly quirky. It is what makes the app not look like a template.
- Text: **DM Sans** 400, 500, 600 (`@expo-google-fonts/dm-sans`). Friendly geometric, great at small sizes.
- Do not use Inter, Poppins, Nunito or the system default. They are the three most common AI and Duolingo clone tells.
- Scale (size/line): Display 40/44 800 · H1 28/34 700 · H2 22/28 700 · Title 17/22 600 · Body 17/24 400 · Label 15/20 500 · Caption 13/18 400 · Score numeral 64/64 800. Headline letter spacing at minus 0.5. `fontVariant: ['tabular-nums']` on every animated number.

### Color tokens
- bg cream #FFF8EC · surface #FFFFFF · ink #231F1A (warm near black, never pure #000) · ink2 #6B6358 · hairline #EFE6D6
- brand yellow #FFC93C (button edge #E0A800) · brand green #22B866 · grade colors as in the table above
- Usage rule 70/20/10: 70% cream and white, 20% ink, 10% color. Yellow is for the primary action only. Green is for score and success only. Red only for real warnings. Text on yellow is always ink, never white.
- Zero gradients in UI chrome. The only gradient allowed is a subtle radial cream glow behind the score ring.

### Shape, spacing, depth
- 4pt grid. Scale: 4, 8, 12, 16, 20, 24, 32, 48. Screen gutter 20. Section gap 32. Card padding 16 or 20.
- Radii, exactly four values: 12 (chips, inputs), 20 (cards, option rows), 28 (bottom sheets, hero cards), 999 (buttons, pills). Nested radius = outer minus padding.
- Depth: prefer a 1px hairline border over shadow. One shadow token only, warm not grey: color #5A3E00, opacity 0.08, y 6, blur 20. Used on floating things (scan button, sticky bar, sheets).
- Signature element: the primary button is a "pressable" pill with a 4px solid darker bottom edge that compresses on press (translateY 4, edge to 0, light impact haptic). Tactile, toy like, fits the mascots, and is instantly ownable.

### Iconography
- **Phosphor** (`phosphor-react-native`): Bold weight default, Fill weight for the active tab and selected states, 24px, ink color. One set, one weight logic, everywhere.
- Never emoji as icons. Emotional moments get mascot spot illustrations instead.
- Mascots: one illustrator style, consistent 3px ink outline, flat fills from the palette, 6 poses each (happy, shocked, sniffing, sleeping, celebrating, peeking). v1 ships static PNG poses animated with Reanimated (bob, blink, tilt). Move to Rive only if it earns its keep.

### Motion and haptics (Reanimated plus expo-haptics)
- Springs for anything that moves (damping 18, stiffness 220). Fades and color at 200ms. Screen transitions native stack default. Nothing over 400ms except the ring (900ms ease out cubic).
- List rows on the result screen stagger in at 40ms intervals after the ring finishes.
- Haptics map: selection on option tap · light impact on CTA press · medium impact on barcode lock · notification success for Excellent or Good result · notification warning for Poor · notification error for Bad · light tick per loader checklist item.
- Respect Reduce Motion: skip count up and stagger, show final state.

### Empty, loading, error
- Empty: mascot + one line + one button. Never a grey icon with "No data".
- Loading: skeleton blocks that match the final layout, cream shimmer. Spinners only inside buttons.
- Errors: human and specific, with a next step. "That photo was too blurry to read. Try again with more light." Mascot tilts head.

### Dark mode stance
Light only for v1. Set `"userInterfaceStyle": "light"` in app.json. The cream brand is the identity (Yuka is also light only). A half done dark mode is a bigger tell than none. Revisit after 1.0 with a warm espresso palette, not grey.

## 5. AI slop tells to avoid, and what studios do instead

| Tell | Do this instead |
|------|-----------------|
| Purple or blue to pink gradients, gradient text | Flat brand colors, the 70/20/10 rule |
| Emoji as icons or bullets | Phosphor icons and mascot spot art |
| Inter or system font at one weight, no hierarchy | Bricolage display plus DM Sans, strict type scale, big size jumps |
| Every screen is a centered card on a grey background | Left aligned headlines, full width rows, edge to edge sections, content on cream |
| Random radii (8 here, 16 there, 24 elsewhere) | Four radius tokens, nothing else |
| Grey drop shadows on everything | Hairline borders, one warm shadow for floating layers |
| Glassmorphism and blur for decoration | Blur only over the frozen camera frame, where it has a job |
| Generic copy: "Unlock your potential", "Welcome to the app", "Oops! Something went wrong" | Specific, pet named, concrete copy. "Biscuit's food scored 41" |
| Stock 3D illustrations or mismatched AI images | One illustrator style for both mascots, same outline weight and palette |
| Default spinner, instant data pop in | Skeletons, staged status text, ring draw and count up |
| No haptics, no press states | Haptic map above, every tappable has a pressed state |
| Fake stats and fake reviews ("Join 1M users") | Real beta quotes, real numbers, or nothing |
| Tab bar with 5 equal icons and tiny labels | 3 items with a dominant center scan action |
| Text touching edges, uneven gaps | 20 gutter, 4pt grid, audit every screen with a grid overlay |
| Paywall with 8 feature bullets and a rocket | Timeline, 2 cards, 1 CTA, honest terms |
| Title Case Everywhere And Exclamation Marks! | Sentence case, periods, calm voice |

Studio habits that show: a tokens file that is the only source of color, type, radius, spacing; one signature interaction (the pressable button and the ring draw); designed empty and error states; a share card that looks good on Instagram; tabular numerals; consistent illustration.

## 6. App Store listing

- Name (30 max): "BowlScore: Pet Food Scanner".
- Subtitle (30 max): "Dog & Cat Ingredient Checker". Competitor subtitles are generic ("Pet Nutrition & Pet Care"), so keyword rich and clear wins.
- Keyword field (100 chars, commas without spaces, singular, no words already in name or subtitle, no competitor trademarks): kibble,rating,label,recall,nutrition,treat,puppy,kitten,allergy,healthy,grade,analyzer,review,safe
- Screenshots: 6 frames, 1320 x 2868. The first 3 carry about 70% of the install decision and show in search results. Cream background, caption on top in Bricolage 800, 3 to 6 words, sentence case, readable at thumbnail size, device frame below, a mascot crossing the seam between frames 1 and 2 so the set reads as one panorama.
  1. "Scan the bag. See the score." (ring at 41 on a real looking kibble result, puppy looking worried)
  2. "Spot the bad ingredients" (Watch outs list)
  3. "Find a better food" (alternatives carousel, ring at 92, kitten celebrating)
  4. "Scored for your pet" (allergy alert banner with pet profile)
  5. "Every scan saved" (history)
  6. "Recall alerts for your food" (only when shipped)
- App preview video, 15 to 20 s: bag → scan line → ring count up → flagged rows → better pick. No talking heads.
- Promotional text (editable without review): rotate with recalls and seasons. Run Product Page Optimization on frame 1 (low score shock vs high score delight).
- Category: Lifestyle primary (where Pawdi and Doggo sit), Health & Fitness secondary. Note that trials lift LTV less in Lifestyle per Adapty, which is one more reason the sample scan has to land.

## 7. Where competitors are weak and how we beat them

| Competitor | Weakness | Our answer |
|------------|----------|------------|
| Doggo (4.6, 105 ratings; $6.99 weekly, $14.99 monthly, up to $49.99 yearly) | Top review complaint: "It doesn't let you do anything until you decide to start a free trial". Price called "ridiculous". Dogs only. Sprawling scope (coach, recipes, supplements). | Sample scan before the paywall, $34.99 yearly, dogs and cats, one job done perfectly. |
| Pawdi (1 rating; about $9 monthly, $50 yearly, plus donation IAPs) | Feature bloat: vaccine records, pet ID card, reminders, donations. Generic subtitle. Expo template look. | Focus. Scanner first, everything in service of the score. |
| PawScan | A to F grades plus "Heavy Metal Concern Score" and "Contamination Risk" from a label photo. Unverifiable, fear driven, a trust and review risk. | Only claim what a label can prove. Named sources on every flag. "How we score" page. |
| Kibble (3 ratings; $6.99 monthly, $49.99 yearly, 7 day trial) | Tries to be a meal logger and tracker too. Tiny catalog (250 foods). No brand personality. | Any label works via photo. Mascot brand. Cheaper yearly. |
| Woof (1 rating; $4.99 weekly, $29.99 yearly, 3 free scans) | Soft freemium leaks value; plain UI; name collides with many apps. | Hard paywall plus a better first impression. |
| Max (free tier, about $25 yearly) | Barcode only, database gaps, community submissions, UK first. | Label OCR means no dead ends. |
| Hapu, Kira AI | 1 to 10 scale (Hapu), generic AI look, no explanations. | 0 to 100 with Yuka familiar bands, reasons in plain language. |

Category wide gaps: no one explains the score, no one personalizes loudly by pet name, no one has real brand craft, no one has a shareable score card, and nobody has more than about 100 ratings. A polished onboarding with a mid flow rating ask can make BowlScore the most rated app in the niche within weeks.

## Sources
- RevenueCat, State of Subscription Apps 2026: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- RevenueCat, R.I.P. toggle paywall: https://www.revenuecat.com/blog/growth/rip-toggle-paywall
- Adapty, high performing paywall 2026: https://adapty.io/blog/high-performing-paywall-2026/
- RevenueFlo, common iOS paywall rejections: https://revenueflo.com/blog/common-ios-paywall-rejections-and-the-fixes-that-work
- Apple App Review Guidelines 3.1.2: https://developer.apple.com/app-store/review/guidelines/
- Cal AI: https://screensdesign.com/showcase/cal-ai-calorie-tracker · https://superwall.com/case-studies/cal-ai
- Olive: https://screensdesign.com/apps/olive-holistic-food-scanner/ · Oasis: https://screensdesign.com/showcase/oasis-whats-healthy · Yuka: https://screensdesign.com/showcase/yuka-food-cosmetic-scanner
- Rating prompt timing: https://semnexus.com/app-store-ratings-prompt-timing-when-to-ask-when-it-backfires
- Screenshots: https://appfollow.io/blog/aso-screenshots-best-practices · https://www.applaunchflow.com/blog/app-store-screenshot-best-practices-2026
- Competitors: Doggo https://apps.apple.com/us/app/doggo-dog-food-scanner/id6743200192 · Pawdi https://apps.apple.com/gb/app/pawdi-pet-food-scanner/id6738991905 · Kibble https://apps.apple.com/us/app/kibble-pet-food-scanner/id6761734073 · Woof https://apps.apple.com/us/app/woof-pet-food-scanner/id6760733899 · Max https://www.maxpet.app/
