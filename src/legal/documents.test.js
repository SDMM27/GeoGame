import { describe, expect, it } from 'vitest'
import { LEGAL_DOCUMENTS } from './documents'
import { LEGAL_PATHS } from './legalInfo'

const LANGS = Object.keys(LEGAL_DOCUMENTS)
const shape = (lang) =>
  Object.fromEntries(Object.entries(LEGAL_DOCUMENTS[lang]).map(([key, doc]) => [key, doc.sections.map((section) => section.id)]))
const texts = (doc) =>
  [...doc.intro, ...doc.sections.flatMap((section) => section.blocks)].flatMap((block) =>
    typeof block === 'string' ? [block] : block.list
  )

describe('legal documents', () => {
  it('have the same documents and sections in every language', () => {
    for (const lang of LANGS) expect(shape(lang), lang).toEqual(shape('fr'))
  })

  it('cover every legal page', () => {
    expect(Object.keys(LEGAL_PATHS).sort()).toEqual(Object.keys(LEGAL_DOCUMENTS.fr).sort())
  })

  it('only link to pages that exist', () => {
    const routes = new Set([...Object.values(LEGAL_PATHS), '/account'])
    for (const lang of LANGS) {
      for (const doc of Object.values(LEGAL_DOCUMENTS[lang])) {
        for (const text of texts(doc)) {
          for (const [, , href] of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
            if (href.startsWith('/')) expect(routes.has(href), `${lang}: ${href}`).toBe(true)
            else expect(href, `${lang}: ${href}`).toMatch(/^https:\/\//)
          }
        }
      }
    }
  })
})
