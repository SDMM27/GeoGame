// Pages that search engines may index. Shared by the runtime <RouteMeta> (title, description and
// canonical of the current route) and the build (vite.config.mjs writes one HTML file per page with
// its own tags, plus sitemap.xml). Texts live in the locales under seo.<key>.
// Adding a page: also add it to the first rewrite of vercel.json (checked by seo.test.jsx).

// VITE_SITE_URL: public address of the site (import.meta.env in the app, process.env in the Node build plugin).
const CONFIGURED_URL = (import.meta.env ? import.meta.env.VITE_SITE_URL : '') || (typeof process !== 'undefined' ? process.env.VITE_SITE_URL : '')
export const SITE_URL = (CONFIGURED_URL || 'https://geo-game-delta.vercel.app').replace(/\/+$/, '')
export const SITE_NAME = 'GeoGame'
export const OG_IMAGE = '/og.png'

export const SEO_PAGES = [
  { path: '/', key: 'home', priority: '1.0', changefreq: 'weekly' },
  { path: '/game', key: 'placement', priority: '0.9', changefreq: 'monthly' },
  { path: '/flag-game', key: 'flags', priority: '0.9', changefreq: 'monthly' },
  { path: '/capitals-game', key: 'capitals', priority: '0.9', changefreq: 'monthly' },
  { path: '/challenge', key: 'daily_challenge', priority: '0.9', changefreq: 'daily' },
  { path: '/border-guess', key: 'border_guess', priority: '0.8', changefreq: 'daily' },
  { path: '/country-clue', key: 'country_clue', priority: '0.8', changefreq: 'daily' },
  { path: '/voyage-voyage', key: 'voyage_voyage', priority: '0.8', changefreq: 'daily' },
  { path: '/ranking', key: 'ranking', priority: '0.8', changefreq: 'daily' },
  { path: '/quiz', key: 'quiz', priority: '0.8', changefreq: 'daily' },
  // Without the options chosen on the home page, /survival sends the player back home: not in the sitemap.
  { path: '/survival', key: 'survival', sitemap: false },
  { path: '/atlas', key: 'atlas', priority: '0.7', changefreq: 'monthly' },
  { path: '/multiplayer', key: 'multiplayer', priority: '0.7', changefreq: 'monthly' },
  { path: '/scores', key: 'scores', priority: '0.6', changefreq: 'daily' },
  { path: '/privacy', key: 'privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', key: 'terms', priority: '0.3', changefreq: 'yearly' },
]

export function findSeoPage(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return SEO_PAGES.find((page) => page.path === path) ?? null
}
