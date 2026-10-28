// Every language of LANGUAGES must be complete: interface strings, game data and legal pages.
// (The app's own strings are checked by TypeScript: each language is a MobileStrings, see mobile/src/i18n.ts.)
import { describe, expect, it } from 'vitest'
import capitalNames from '../data/capitalNames.json'
import curated from '../data/quizQuestions.json'
import { GEO_FEATURES, MOUTHS } from '../data/geoFeatures'
import { LEGAL_DOCUMENTS } from '../legal/documents'
import { getCountryName } from '../utils/getCountryName'
import i18n, { i18nReady } from './index'
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, LANGUAGES, localeOf, toLanguage } from './languages'

const locales = Object.fromEntries(
  await Promise.all(LANGUAGE_CODES.map(async (lang) => [lang, (await import(`./locales/${lang}.json`)).default]))
)

// 'quiz.hints.letters_one' → 'quiz.hints.letters': plural forms differ between languages (Russian has _few and _many)
const PLURAL = /_(zero|one|two|few|many|other)$/
const flatten = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
  )
const keysOf = (lang) => new Set(flatten(locales[lang]).map(([key]) => key.replace(PLURAL, '')))
const placeholders = (text) => (text.match(/\{\{\w+\}\}|<\/?\w+>/g) ?? []).sort().join(' ')

describe('languages', () => {
  it('maps any language tag to one of ours', () => {
    expect(toLanguage('es-MX')).toBe('es')
    expect(toLanguage('PT')).toBe('pt')
    expect(toLanguage('zh-CN')).toBe(DEFAULT_LANGUAGE)
    expect(toLanguage(undefined, 'fr')).toBe('fr')
    expect(localeOf('pt')).toBe('pt-BR')
    expect(new Set(LANGUAGES.map((language) => language.code)).size).toBe(LANGUAGES.length)
  })

  it('has every interface string in every language', () => {
    const reference = keysOf('fr')
    for (const lang of LANGUAGE_CODES) expect([...keysOf(lang)].sort(), lang).toEqual([...reference].sort())
  })

  it('keeps the same placeholders and tags as French', () => {
    // A plural form may leave out {{count}} ("one day" → "un jour")
    const shape = (key, text) => placeholders(PLURAL.test(key) ? text.replaceAll('{{count}}', '') : text)
    const french = new Map(flatten(locales.fr).map(([key, value]) => [key.replace(PLURAL, ''), shape(key, value)]))
    for (const lang of LANGUAGE_CODES) {
      for (const [key, value] of flatten(locales[lang])) {
        expect(shape(key, value), `${lang} ${key}`).toBe(french.get(key.replace(PLURAL, '')))
      }
    }
  })

  it('loads the languages that are not bundled', async () => {
    await i18nReady
    for (const lang of LANGUAGE_CODES) {
      await i18n.changeLanguage(lang)
      expect(i18n.t('nav.language'), lang).toBe(locales[lang].nav.language)
    }
    await i18n.changeLanguage('fr')
  })
})

describe('game data in every language', () => {
  const others = LANGUAGE_CODES.filter((lang) => lang !== 'fr')

  it('names every country', () => {
    for (const lang of LANGUAGE_CODES) {
      for (const iso of ['FR', 'BR', 'DE', 'CD', 'CI', 'MM', 'HK']) expect(getCountryName(iso, lang), `${iso} ${lang}`).toBeTruthy()
    }
    // Intl's long forms ("RAE de Hong Kong (China)") are overridden in the languages added in 2026
    for (const lang of ['es', 'pt', 'de', 'it', 'uk', 'nl']) {
      for (const iso of ['MM', 'HK', 'MO', 'CD']) expect(getCountryName(iso, lang), `${iso} ${lang}`).not.toMatch(/[()]| - | – |RAE|RAS|ОАР/)
    }
  })

  it('names every capital (French is the dataset’s own name)', () => {
    for (const [iso, names] of Object.entries(capitalNames)) {
      for (const lang of others) expect(names[lang], `${iso} ${lang}`).toBeTruthy()
    }
  })

  it('names every geographic feature, outlet and city', () => {
    for (const lang of LANGUAGE_CODES) {
      for (const feature of GEO_FEATURES) {
        expect(feature.name[lang], `${feature.id} ${lang}`).toBeTruthy()
        for (const city of feature.cities ?? []) expect(city[lang], `${feature.id} ${city.en} ${lang}`).toBeTruthy()
      }
      for (const [key, mouth] of Object.entries(MOUTHS)) expect(mouth[lang], `${key} ${lang}`).toBeTruthy()
    }
  })

  it('translates every curated quiz question', () => {
    for (const question of curated) {
      for (const text of [question.question, question.answer, question.fact, ...question.wrong]) {
        for (const lang of LANGUAGE_CODES) expect(text[lang], `${question.id} ${lang}`).toBeTruthy()
      }
    }
  })

  it('has the legal pages in every language', () => {
    expect(Object.keys(LEGAL_DOCUMENTS).sort()).toEqual([...LANGUAGE_CODES].sort())
  })
})
