// Pages that search engines may index. Shared by the runtime <RouteMeta> (title, description and
// canonical of the current route) and the build (vite.config.mjs writes one HTML file per page with
// its own tags, plus sitemap.xml). Texts live in the locales under seo.<key>.
// Adding a page: also add it to the first rewrite of vercel.json (checked by seo.test.jsx).
export const SITE_URL = 'https://geo-game-delta.vercel.app'
export const SITE_NAME = 'GeoGame'
export const OG_IMAGE = '/logo512.png'

export const SEO_PAGES = [
  { path: '/', key: 'home', priority: '1.0', changefreq: 'weekly' },
  { path: '/game', key: 'placement', priority: '0.9', changefreq: 'monthly' },
  { path: '/flag-game', key: 'flags', priority: '0.9', changefreq: 'monthly' },
  { path: '/capitals-game', key: 'capitals', priority: '0.9', changefreq: 'monthly' },
  { path: '/border-guess', key: 'border_guess', priority: '0.8', changefreq: 'daily' },
  { path: '/country-clue', key: 'country_clue', priority: '0.8', changefreq: 'daily' },
  { path: '/voyage-voyage', key: 'voyage_voyage', priority: '0.8', changefreq: 'daily' },
  { path: '/ranking', key: 'ranking', priority: '0.8', changefreq: 'daily' },
  { path: '/quiz', key: 'quiz', priority: '0.8', changefreq: 'daily' },
  // Without the options chosen on the home page, /survival sends the player back home: not in the sitemap.
  { path: '/survival', key: 'survival', sitemap: false },
  { path: '/multiplayer', key: 'multiplayer', priority: '0.7', changefreq: 'monthly' },
  { path: '/scores', key: 'scores', priority: '0.6', changefreq: 'daily' },
]

export function findSeoPage(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return SEO_PAGES.find((page) => page.path === path) ?? null
}
