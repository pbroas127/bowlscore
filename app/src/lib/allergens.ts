// Allergen matching. On its own so recommend.ts and fit.ts can both use it without importing each other.
export const ALLERGENS: Record<string, RegExp> = {
  Chicken: /chicken|poultry/i,
  Beef: /\bbeef\b/i,
  Dairy: /milk|cheese|whey|casein|dairy|yogurt/i,
  Grain: /wheat|corn|rice|barley|\boats?\b|oatmeal|sorghum|\brye\b/i,
  Fish: /fish|salmon|tuna|herring|menhaden|sardine|anchov|mackerel|cod|pollock|trout/i,
  Egg: /\begg/i,
}
export const allergyHits = (allergies: string[] | undefined, ingredients: string[]) =>
  (allergies ?? []).filter((a) => ALLERGENS[a] && ingredients.some((i) => ALLERGENS[a].test(i)))
