import { API_URL as BASE } from './config'
import { AMAZON_TAG } from './ownLink'

export { ownLink } from './ownLink'
export const SITE = {
  home: BASE,
  terms: `${BASE}/terms`,
  privacy: `${BASE}/privacy`,
  support: `${BASE}/support`,
  methodology: `${BASE}/methodology`,
  affiliate: `${BASE}/affiliate-disclosure`,
}
export const SUPPORT_EMAIL = 'pbroas127+bowlscore@gmail.com'

// Affiliate links. Every Amazon link carries the Associates tag. Chewy approval is pending: flip CHEWY_ON once it
// lands and every built Chewy link in the app switches on from this one place.
const CHEWY_ON = false
export const tagged = (url: string) => (!/amazon\./i.test(url) || /[?&]tag=/.test(url) ? url : `${url}${url.includes('?') ? '&' : '?'}tag=${AMAZON_TAG}`)
export const amazonSearch = (query: string) => `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`
export const chewySearch = (query: string) => (CHEWY_ON ? `https://www.chewy.com/s?query=${encodeURIComponent(query)}` : undefined)
export const shopLink = (query: string, species: 'dog' | 'cat') => amazonSearch(`${species} ${query}`)

// Where the Shop buttons on a product page go. The catalog sends ready links; a missing one falls back to a search.
export const productLinks = (p: { brand: string; name: string; species: 'dog' | 'cat'; links: { amazon: string; chewy?: string } }) => ({
  amazon: p.links.amazon ? tagged(p.links.amazon) : shopLink(`${p.brand} ${p.name}`, p.species),
  chewy: p.links.chewy ?? chewySearch(`${p.brand} ${p.name}`),
})
