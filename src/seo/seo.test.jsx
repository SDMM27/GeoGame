import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../i18n/index.js'
import RouteMeta from '../components/RouteMeta'
import { SEO_PAGES, SITE_URL, findSeoPage } from './seoPages'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'
import ru from '../i18n/locales/ru.json'
import vercel from '../../vercel.json'
import { renderPage, renderRobots, renderSitemap } from '../../scripts/vite-plugin-seo.mjs'

const TEMPLATE = '<head>\n    <!-- seo:head -->\n  </head><body><div id="root"></div>\n    <!-- seo:noscript --></body>'

describe('SEO pages', () => {
  it('has a title and a description in every language for every page', () => {
    for (const locale of [fr, en, ru]) {
      for (const page of SEO_PAGES) {
        expect(locale.seo[page.key].title).toBeTruthy()
        expect(locale.seo[page.key].description.length).toBeLessThanOrEqual(170)
      }
    }
  })

  it('finds a page with or without a trailing slash, and nothing for private routes', () => {
    expect(findSeoPage('/flag-game/').path).toBe('/flag-game')
    expect(findSeoPage('/').key).toBe('home')
    expect(findSeoPage('/account')).toBeNull()
    expect(findSeoPage('/multiplayer/room/ABC')).toBeNull()
  })
})

describe('vite-plugin-seo', () => {
  it('fills the head and noscript markers, and can render the result again for another page', () => {
    const home = renderPage(TEMPLATE, SEO_PAGES[0], fr.seo)
    expect(home).toContain(`<link rel="canonical" href="${SITE_URL}/" />`)
    expect(home).toContain('application/ld+json')

    const flags = renderPage(home, findSeoPage('/flag-game'), fr.seo)
    expect(flags).toContain(`<title>${fr.seo.flags.title}</title>`)
    expect(flags).toContain(`<link rel="canonical" href="${SITE_URL}/flag-game" />`)
    expect(flags).not.toContain('application/ld+json')
    expect(flags.match(/<title>/g)).toHaveLength(1)
    expect(flags.match(/<noscript>/g)).toHaveLength(1)
  })

  it('escapes the texts put in attributes', () => {
    const html = renderPage(TEMPLATE, SEO_PAGES[0], { ...fr.seo, home: { title: 'A "B" <C>', description: 'x & y' } })
    expect(html).toContain('content="A &quot;B&quot; &lt;C&gt;"')
    expect(html).toContain('content="x &amp; y"')
  })

  it('has a Vercel rewrite to the generated HTML of every page', () => {
    const rewrite = vercel.rewrites.find((item) => item.destination === '/:page/index.html')
    const pages = rewrite.source.match(/\((.*)\)/)[1].split('|').sort()
    expect(pages).toEqual(SEO_PAGES.slice(1).map((page) => page.path.slice(1)).sort())
  })

  it('lists the indexable pages in the sitemap and points robots.txt to it', () => {
    const sitemap = renderSitemap('2026-10-09')
    expect(sitemap).toContain(`<loc>${SITE_URL}/quiz</loc>`)
    expect(sitemap).not.toContain('/survival')
    expect(renderRobots()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })
})

describe('RouteMeta', () => {
  const renderAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <RouteMeta />
      </MemoryRouter>
    )

  it('sets the title, description and canonical of an indexable page', () => {
    renderAt('/capitals-game')
    expect(document.title).toBe(fr.seo.capitals.title)
    expect(document.head.querySelector('meta[name="description"]').content).toBe(fr.seo.capitals.description)
    expect(document.head.querySelector('link[rel="canonical"]').href).toBe(`${SITE_URL}/capitals-game`)
    expect(document.head.querySelector('meta[name="robots"]').content).toBe('index, follow')
  })

  it('keeps private pages out of search results', () => {
    renderAt('/account')
    expect(document.head.querySelector('meta[name="robots"]').content).toBe('noindex, follow')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })
})
