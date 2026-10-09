import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SITE_NAME, SITE_URL, findSeoPage } from '../seo/seoPages'

function setMeta(attribute, name, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!href) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

// Title, description, canonical and robots of the current route, in the player's language.
// Pages outside SEO_PAGES (account, profiles, rooms, 404) are kept out of search results.
export default function RouteMeta() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const page = findSeoPage(pathname)

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'fr'
  }, [i18n.resolvedLanguage, i18n.language])

  useEffect(() => {
    const title = page ? t(`seo.${page.key}.title`) : SITE_NAME
    const description = t(`seo.${page?.key ?? 'home'}.description`)
    const url = page ? SITE_URL + page.path : null

    document.title = title
    setMeta('name', 'description', description)
    setMeta('name', 'robots', page ? 'index, follow' : 'noindex, follow')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    if (url) setMeta('property', 'og:url', url)
    setCanonical(url)
  }, [page, t])

  return null
}
