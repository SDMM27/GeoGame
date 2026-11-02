// Empire map texts: one file per language, each field falling back to English, then French.
import { describe, it, expect, vi } from 'vitest'
import { LANGUAGE_CODES } from '../../i18n/languages'
import { EMPIRES } from '../empires'
import { loadEmpireText, EMPIRE_TEXT_FIELDS } from './index'

vi.mock('./fr.json', () => ({ default: { a: { s1: { label: 'FR 1', title: 'FR title 1', text: 'FR text 1' }, s2: { label: 'FR 2' }, _note: 'FR note' } } }))
vi.mock('./en.json', () => ({ default: { a: { s1: { label: 'EN 1', title: '  ' }, _note: '' } } }))
vi.mock('./de.json', () => ({ default: { a: { s1: { title: 'DE title 1' }, _note: 'DE note' } } }))

describe('loadEmpireText', () => {
  it('takes each field from the player language, else English, else French', async () => {
    expect(await loadEmpireText('a', 'de')).toEqual({
      stages: { s1: { label: 'EN 1', title: 'DE title 1', text: 'FR text 1' }, s2: { label: 'FR 2' } },
      note: 'DE note',
    })
    expect(await loadEmpireText('a', 'en')).toEqual({
      stages: { s1: { label: 'EN 1', title: 'FR title 1', text: 'FR text 1' }, s2: { label: 'FR 2' } },
      note: 'FR note',
    })
  })

  it('returns nothing for an empire without text, and falls back for a language without file', async () => {
    expect(await loadEmpireText('missing', 'de')).toEqual({ stages: {} })
    expect((await loadEmpireText('a', 'xx')).stages.s1.label).toBe('EN 1')
  })
})

describe('the data files', () => {
  const filled = (value) => typeof value === 'string' && value.trim() !== ''

  it('have every empire, every stage, with a non-empty label, title and text, in every language', async () => {
    for (const lang of LANGUAGE_CODES) {
      const file = await vi.importActual(`./${lang}.json`)
      const texts = file.default ?? file
      for (const [id, empire] of Object.entries(EMPIRES)) {
        for (const { id: stageId } of empire.stages) {
          for (const field of EMPIRE_TEXT_FIELDS) {
            expect(filled(texts[id]?.[stageId]?.[field]), `${lang} ${id} ${stageId} ${field}`).toBe(true)
          }
        }
        // _note is optional, but never blank when present
        if (texts[id]?._note !== undefined) expect(filled(texts[id]._note), `${lang} ${id} _note`).toBe(true)
      }
    }
  })

  it('give every empire a note in all languages or in none', async () => {
    for (const id of Object.keys(EMPIRES)) {
      const withNote = []
      for (const lang of LANGUAGE_CODES) {
        const file = await vi.importActual(`./${lang}.json`)
        withNote.push(filled((file.default ?? file)[id]?._note))
      }
      expect(new Set(withNote).size, id).toBe(1)
    }
  })

  it('only describe stages that the empire has', async () => {
    for (const lang of LANGUAGE_CODES) {
      const file = await vi.importActual(`./${lang}.json`)
      const texts = file.default ?? file
      for (const [id, entry] of Object.entries(texts)) {
        const stages = EMPIRES[id]?.stages.map((stage) => stage.id)
        expect(stages, `${lang} ${id}`).toBeTruthy()
        expect(Object.keys(entry).filter((key) => key !== '_note'), `${lang} ${id}`).toEqual(stages)
      }
    }
  })
})
