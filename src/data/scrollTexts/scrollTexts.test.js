// Sheet texts: one file per language, each field falling back to English, then French.
import { describe, it, expect, vi } from 'vitest'
import { LANGUAGE_CODES } from '../../i18n/languages'
import { SCROLLS } from '../scrolls'
import { loadScrollText, SCROLL_TEXT_FIELDS } from './index'

vi.mock('./fr.json', () => ({ default: { a: { body: 'FR a', detail: 'FR detail a', credit: 'FR credit a' }, b: { body: 'FR b' } } }))
vi.mock('./en.json', () => ({ default: { a: { body: 'EN a', credit: '  ' } } }))
vi.mock('./de.json', () => ({ default: { a: { body: 'DE a' } } }))

describe('loadScrollText', () => {
  it('takes each field from the player language, else English, else French', async () => {
    expect(await loadScrollText('a', 'de')).toEqual({ body: 'DE a', detail: 'FR detail a', credit: 'FR credit a' })
    expect(await loadScrollText('a', 'en')).toEqual({ body: 'EN a', detail: 'FR detail a', credit: 'FR credit a' })
    expect(await loadScrollText('b', 'de')).toEqual({ body: 'FR b' })
  })

  it('returns nothing for a scroll without text, and for a language without file', async () => {
    expect(await loadScrollText('missing', 'de')).toEqual({})
    expect(await loadScrollText('a', 'xx')).toEqual({ body: 'EN a', detail: 'FR detail a', credit: 'FR credit a' })
  })
})

describe('the data files', () => {
  it('exist for every language', async () => {
    for (const lang of LANGUAGE_CODES) {
      const file = await vi.importActual(`./${lang}.json`)
      expect(typeof (file.default ?? file), lang).toBe('object')
    }
  })

  it('have every scroll with a non-empty body, detail and credit', async () => {
    for (const lang of LANGUAGE_CODES) {
      const file = await vi.importActual(`./${lang}.json`)
      const texts = file.default ?? file
      for (const { id } of SCROLLS) {
        for (const field of SCROLL_TEXT_FIELDS) {
          expect(typeof texts[id]?.[field] === 'string' && texts[id][field].trim() !== '', `${lang} ${id} ${field}`).toBe(true)
        }
      }
    }
  })
})
