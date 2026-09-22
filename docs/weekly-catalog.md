# Weekly catalog update

The app sends a suggestion to Firestore (`suggestions`) whenever someone scans a food or treat that is not in the catalog, or saves a reorder link for one (`app/src/lib/suggest.ts`). Once a week they are reviewed and the good ones join the catalog. Nothing here uses Gemini or any paid API.

1. Open https://bowlscoreapp.vercel.app/admin/suggestions in Chrome and sign in with Peter's Google account (only that account can read them). The page prints every suggestion as JSON.
2. Group them by product (brand plus name). Drop duplicates of products already in `site/src/data/catalog.json`, junk reads, and anything that is not a dog or cat food or treat.
3. For each product left, find its real current US page (manufacturer, Chewy, Petco, PetSmart) and transcribe the full ingredient list, guaranteed analysis and calories by hand. A scan is a lead, not a source: labels change, and one blurry read must never become a catalog entry. Add sizes, the Amazon ASIN and its line, flavor and formula like the other entries.
4. Write them to `site/scripts/catalog-batches/weekly-YYYY-MM-DD.json` in the batch format (see the top of `site/scripts/build-catalog.mjs`), then from `site/`:
   `node scripts/build-catalog.mjs --dry scripts/catalog-batches/weekly-YYYY-MM-DD.json` until it prints only good lines,
   `node scripts/build-catalog.mjs --add scripts/catalog-batches/weekly-YYYY-MM-DD.json`,
   `node scripts/fetch-product-images.mjs` (free pack shots), then look at every new image and delete wrong ones, then `node scripts/fetch-product-images.mjs --sync`.
5. `npm test`, commit and push. The catalog is live for every build within a minute; the app picks it up the next time it opens.
