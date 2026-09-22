import { Linking } from 'react-native'
import { AMAZON_TAG } from './ownLink'

export { ownLink } from './ownLink'
// The public site lives on the custom domain; the API keeps the vercel.app host (no redirect on POST).
const WEB = 'https://www.bowlscore.app'
export const SITE = {
  home: WEB,
  terms: `${WEB}/terms`,
  privacy: `${WEB}/privacy`,
  support: `${WEB}/support`,
  methodology: `${WEB}/methodology`,
  affiliate: `${WEB}/affiliate-disclosure`,
}
export const SUPPORT_EMAIL = 'support@bowlscore.app'

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

// Shop and reorder links leave BowlScore on purpose. On iPhone an amazon.com link opens the Amazon app when it is
// installed (a universal link, already signed in, and Amazon credits app purchases to the tag), otherwise Safari.
// Never an in-app browser: the Associates mobile policy bars rendering Amazon pages inside the app.
export const openShop = (url: string) => Linking.openURL(url).catch(() => {})
