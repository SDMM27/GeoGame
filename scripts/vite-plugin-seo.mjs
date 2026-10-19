// Vite plugin: head tags of every indexable page, read without JavaScript (search engines, link
// previews on social networks and messaging apps).
// - index.html: <!-- seo:head --> and <!-- seo:noscript --> are filled with the home page (dev and build).
// - build: dist/<path>/index.html for every other page of SEO_PAGES, sitemap.xml and robots.txt.
// The texts are the French ones (fallback language), from src/i18n/locales/fr.json under seo.<key>.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { OG_IMAGE, SEO_PAGES, SITE_NAME, SITE_URL } from '../src/seo/seoPages.js'

const HEAD_RE = /<!-- seo:head -->[\s\S]*?<!-- \/seo:head -->|<!-- seo:head -->/
const NOSCRIPT_RE = /<!-- seo:noscript -->[\s\S]*?<!-- \/seo:noscript -->|<!-- seo:noscript -->/

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function loadStrings(root) {
  return JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/fr.json'), 'utf8')).seo
}

function structuredData(strings) {
  const data = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + '/', inLanguage: 'fr' },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL + '/',
      description: strings.home.description,
      applicationCategory: 'GameApplication',
      genre: ['Geography', 'Quiz', 'Educational'],
      operatingSystem: 'Web',
      inLanguage: 'fr',
      image: SITE_URL + OG_IMAGE,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    },
  ]
  // "<" escaped so the JSON can never close the <script> element.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}

export function renderHead(page, strings) {
  const { title, description } = strings[page.key]
  const url = SITE_URL + page.path
  const image = SITE_URL + OG_IMAGE
  return [
    '<!-- seo:head -->',
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${SITE_NAME}" />`,
    '<meta property="og:locale" content="fr_FR" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...(page.path === '/' ? [structuredData(strings)] : []),
    '<!-- /seo:head -->',
  ].join('\n    ')
}

// Shown only without JavaScript: what the page is about and links to every game.
export function renderNoscript(page, strings) {
  const links = SEO_PAGES.filter((other) => other.sitemap !== false && other.path !== page.path)
    .map((other) => `<li><a href="${other.path}">${escape(strings[other.key].title)}</a></li>`)
    .join('')
  return (
    '<!-- seo:noscript --><noscript>' +
    `<h1>${escape(strings[page.key].title)}</h1>` +
    `<p>${escape(strings[page.key].description)}</p>` +
    `<ul>${links}</ul>` +
    '</noscript><!-- /seo:noscript -->'
  )
}

export function renderPage(html, page, strings) {
  return html.replace(HEAD_RE, () => renderHead(page, strings)).replace(NOSCRIPT_RE, () => renderNoscript(page, strings))
}

export function renderSitemap(lastmod) {
  const urls = SEO_PAGES.filter((page) => page.sitemap !== false).map(
    (page) =>
      `  <url>\n    <loc>${SITE_URL}${page.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function renderRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /account',
    'Disallow: /multiplayer/create',
    'Disallow: /multiplayer/room/',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
}

export default function seoPlugin() {
  let config
  return {
    name: 'geogame-seo',
    configResolved(resolved) {
      config = resolved
    },
    transformIndexHtml(html) {
      return renderPage(html, SEO_PAGES[0], loadStrings(config.root))
    },
    closeBundle() {
      if (config.command !== 'build' || config.build.ssr) return
      const outDir = resolve(config.root, config.build.outDir)
      // Rollup also calls closeBundle after a failed build: leave the real error visible.
      if (!existsSync(join(outDir, 'index.html'))) return
      const strings = loadStrings(config.root)
      const html = readFileSync(join(outDir, 'index.html'), 'utf8')
      for (const page of SEO_PAGES.slice(1)) {
        const dir = join(outDir, page.path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), renderPage(html, page, strings))
      }
      writeFileSync(join(outDir, 'sitemap.xml'), renderSitemap(new Date().toISOString().slice(0, 10)))
      writeFileSync(join(outDir, 'robots.txt'), renderRobots())
    },
  }
}
