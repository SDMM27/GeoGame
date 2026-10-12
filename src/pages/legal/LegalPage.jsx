import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../../components/NavBar'
import LegalLinks from '../../components/LegalLinks'
import { LEGAL_DOCUMENTS } from '../../legal/documents'
import { DEFAULT_LANGUAGE } from '../../i18n/languages'
import { LEGAL_INFO } from '../../legal/legalInfo'
import { SITE_NAME, SITE_URL } from '../../seo/seoPages'
import './LegalPage.css'

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g

function fill(text) {
  return text
    .replaceAll('{editor}', LEGAL_INFO.editor)
    .replaceAll('{site}', SITE_URL.replace(/^https:\/\//, ''))
    .replaceAll('{email}', `[${LEGAL_INFO.email}](mailto:${LEGAL_INFO.email})`)
}

// A paragraph or list item: text with [label](href) links (internal ones stay in the app).
function Inline({ text }) {
  const filled = fill(text)
  const parts = []
  let last = 0
  for (const match of filled.matchAll(LINK)) {
    const [whole, label, href] = match
    parts.push(filled.slice(last, match.index))
    parts.push(
      href.startsWith('/')
        ? <Link key={match.index} to={href}>{label}</Link>
        : <a key={match.index} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">{label}</a>
    )
    last = match.index + whole.length
  }
  parts.push(filled.slice(last))
  return parts
}

function Block({ block }) {
  if (typeof block === 'string') return <p><Inline text={block} /></p>
  return (
    <ul>
      {block.list.map((item) => <li key={item}><Inline text={item} /></li>)}
    </ul>
  )
}

// Privacy policy, terms, legal notice and account deletion (`doc`: a key of LEGAL_DOCUMENTS[lang]).
export default function LegalPage({ doc }) {
  const { t, i18n } = useTranslation()
  const lang = LEGAL_DOCUMENTS[i18n.resolvedLanguage] ? i18n.resolvedLanguage : DEFAULT_LANGUAGE
  const content = LEGAL_DOCUMENTS[lang][doc]
  const updated = new Date(`${LEGAL_INFO.updated}T12:00:00Z`).toLocaleDateString(lang, { dateStyle: 'long' })

  useEffect(() => {
    document.title = `${content.title} · ${SITE_NAME}`
  }, [content.title])

  return (
    <div className="legal-page">
      <NavBar />
      <main className="legal-main">
        <h1 className="legal-title">{content.title}</h1>
        <p className="legal-updated">{t('legal.updated', { date: updated })}</p>
        {content.intro.map((block, index) => <Block key={index} block={block} />)}
        {content.sections.map((section) => (
          <section key={section.id} id={section.id} className="legal-section">
            <h2>{section.title}</h2>
            {section.blocks.map((block, index) => <Block key={index} block={block} />)}
          </section>
        ))}
        <LegalLinks />
      </main>
    </div>
  )
}
