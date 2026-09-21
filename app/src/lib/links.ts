const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://bowlscore.vercel.app'
export const SITE = {
  home: BASE,
  terms: `${BASE}/terms`,
  privacy: `${BASE}/privacy`,
  support: `${BASE}/support`,
  methodology: `${BASE}/methodology`,
}
export const SUPPORT_EMAIL = 'pbroas127+bowlscore@gmail.com'
// Plain store searches until the affiliate programs approve the site, then swap in the tagged URLs here.
export const shopLink = (query: string, species: 'dog' | 'cat') => `https://www.chewy.com/s?query=${encodeURIComponent(`${species} ${query}`)}`
