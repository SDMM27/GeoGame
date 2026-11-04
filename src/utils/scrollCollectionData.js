// The scroll collection of an account, read from the public user document (rules and data model: scrollCollection.js).
// Shared by the website and the app. users/{uid}.scrolls comes with the document (publicProfile.js), so a claim that
// patches the cache (utils/xp.js) updates every screen that reads it.
import { ERAS, SCROLLS } from '../data/scrolls'
import { cachedPublicData, fetchPublicData } from './publicProfile'
import { readScrolls, SEALS_PER_SCROLL } from './scrollCollection'

export { ERAS, SCROLLS, SEALS_PER_SCROLL }

const SCROLL_BY_ID = new Map(SCROLLS.map((scroll) => [scroll.id, scroll]))
export const scrollById = (id) => SCROLL_BY_ID.get(id) ?? null

// { unlocked: [id], seals } of any user document (see readScrolls).
export const scrollsOf = (data) => readScrolls(data, SCROLLS)

export const fetchScrolls = async (uid) => scrollsOf(await fetchPublicData(uid))

// The scrolls of the account after an XP claim: the state the server answered (claim.scrolls, which a dev demo can fake
// with __emitXpClaimed), else the cached account (patched before the listeners run), or null when unknown.
export function scrollsAfter(claim, uid) {
  if (claim.scrolls) return scrollsOf({ scrolls: claim.scrolls })
  const data = uid ? cachedPublicData(uid) : null
  return data ? scrollsOf(data) : null
}

// The scrolls grouped by era (ERAS order), the catalogue order inside an era: [{ era, scrolls: [{ ...scroll, owned }] }].
export function scrollsByEra(unlocked) {
  const owned = new Set(unlocked)
  return ERAS.map((era) => ({ era, scrolls: SCROLLS.filter((scroll) => scroll.era === era).map((scroll) => ({ ...scroll, owned: owned.has(scroll.id) })) })).filter((group) => group.scrolls.length > 0)
}

// Seals shown as "n / SEALS_PER_SCROLL" once `paid` seals were just paid: the seals that completed a scroll count as full.
export const sealProgress = (seals, paid = 0) => (paid > 0 && seals === 0 ? SEALS_PER_SCROLL : Math.min(seals, SEALS_PER_SCROLL))

// Images of a scroll: the thumbnail (grid, reveal) and the large map (sheet). `origin` is the site's address for the app,
// empty on the website. The files may not exist yet: show them through ScrollImage, which falls back to a placeholder.
export const scrollImageUrl = (id, size, origin = '') => `${origin}/scrolls/${id}/${size === 'large' ? 'large' : 'thumb'}.webp`

// "1858", "1150 BC" (years before our era are negative in the catalogue). `t` is the i18n function.
export const formatScrollYear = (t, year) => (year < 0 ? t('scrolls.year_bc', { year: -year }) : String(year))

// What a tile or a sheet shows as date: the bare year of a period document, "Map of 1923" for an atlas map (drawn later).
export const formatScrollDate = (t, scroll) =>
  scroll.family === 'atlas' ? t('scrolls.map_of', { year: formatScrollYear(t, scroll.year) }) : formatScrollYear(t, scroll.year)
