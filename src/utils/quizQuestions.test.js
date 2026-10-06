import { describe, it, expect } from 'vitest'
import curated from '../data/quizQuestions.json'
import countries from '../data/countriesWithDifficulty_FR.json'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'
import ru from '../i18n/locales/ru.json'
import { GEO_FEATURES, MOUTHS } from '../data/geoFeatures'
import {
  ANSWER_MODES,
  QUIZ_DIFFICULTIES,
  checkFreeAnswer,
  generateQuestion,
  getAllowedDifficulties,
  localizeQuestion,
} from './quizQuestions'
import { mulberry32 } from './prng'

const LOCALES = { fr, en, ru }
const LANGS = ['fr', 'en', 'ru']

// Traduction réelle, pour vérifier aussi que chaque clé de question existe
const makeT = (lang) => (key, params = {}) => {
  const value = key.split('.').reduce((o, p) => o?.[p], LOCALES[lang])
  if (typeof value !== 'string') throw new Error(`missing ${lang} key ${key}`)
  return value.replace(/{{(\w+)}}/g, (_, name) => params[name] ?? '')
}

const generate = (n, { max = 'Impossible', mode = ANSWER_MODES.CHOICES, seed = 1 } = {}) => {
  const random = mulberry32(seed)
  return Array.from({ length: n }, () => generateQuestion(max, new Set(), random, mode))
}

describe('geo features data', () => {
  const isos = new Set(countries.features.map((f) => f.properties.ISO_A2))
  const ids = new Set(GEO_FEATURES.map((f) => f.id))

  it('has unique ids, known countries and valid references', () => {
    expect(ids.size).toBe(GEO_FEATURES.length)
    for (const f of GEO_FEATURES) {
      expect(QUIZ_DIFFICULTIES, f.id).toContain(f.difficulty)
      for (const lang of LANGS) expect(f.name[lang], `${f.id} ${lang}`).toBeTruthy()
      for (const iso of f.countries) expect(isos.has(iso), `${f.id} ${iso}`).toBe(true)
      if (f.mouth) expect(MOUTHS[f.mouth], f.id).toBeTruthy()
      if (f.range) expect(ids.has(f.range), f.id).toBe(true)
      if (f.highest) expect(GEO_FEATURES.find((m) => m.id === f.highest)?.range, f.id).toBe(f.id)
      for (const iso of f.highestOf ?? []) expect(f.countries, f.id).toContain(iso)
    }
  })

  it('has a single highest point per country', () => {
    const seen = new Map()
    for (const f of GEO_FEATURES.filter((m) => m.highestOf)) {
      for (const iso of f.highestOf) {
        expect(seen.get(iso), `${iso}: ${seen.get(iso)} / ${f.id}`).toBeUndefined()
        seen.set(iso, f.id)
      }
    }
  })

  it('lists each city under a single river', () => {
    const cities = GEO_FEATURES.flatMap((f) => f.cities ?? []).map((c) => c.fr)
    expect(new Set(cities).size).toBe(cities.length)
  })
})

describe('getAllowedDifficulties', () => {
  it('includes every difficulty up to the chosen max', () => {
    expect(getAllowedDifficulties('Facile')).toEqual(['Facile'])
    expect(getAllowedDifficulties('Difficile')).toEqual(['Facile', 'Moyen', 'Difficile'])
    expect(getAllowedDifficulties('Impossible')).toEqual(QUIZ_DIFFICULTIES)
  })
})

describe('generateQuestion', () => {
  it.each(QUIZ_DIFFICULTIES)('never exceeds the max difficulty (%s)', (max) => {
    const allowed = getAllowedDifficulties(max)
    for (const q of generate(300, { max, seed: 42 })) {
      expect(q).not.toBeNull()
      expect(allowed).toContain(q.difficulty)
    }
  })

  it('never asks about capitals', () => {
    for (const q of generate(500)) expect(q.type).not.toMatch(/capital/)
  })

  it('produces 4 distinct choices including the correct one', () => {
    for (const q of generate(500, { seed: 7 })) {
      const ids = q.choices.map((c) => c.id)
      expect(new Set(ids).size).toBe(4)
      expect(ids).toContain(q.correctId)
    }
  })

  it('mostly asks about geographic features rather than countries alone', () => {
    const questions = generate(1000, { seed: 3 })
    const countryOnly = questions.filter((q) => ['neighbor', 'not_neighbor'].includes(q.type)).length
    expect(countryOnly / questions.length).toBeLessThan(0.1)
    expect(new Set(questions.map((q) => q.type)).size).toBeGreaterThanOrEqual(12)
  })

  it('avoids repeating questions or subjects already seen in the session', () => {
    const random = mulberry32(3)
    const used = new Set()
    for (let i = 0; i < 60; i++) {
      const q = generateQuestion('Moyen', used, random)
      for (const k of q.usedKeys) expect(used.has(k), k).toBe(false)
      q.usedKeys.forEach((k) => used.add(k))
    }
  })
})

describe('curated questions', () => {
  it('are complete in every language', () => {
    const ids = new Set()
    for (const q of curated) {
      expect(ids.has(q.id)).toBe(false)
      ids.add(q.id)
      expect(QUIZ_DIFFICULTIES).toContain(q.difficulty)
      expect(q.wrong).toHaveLength(3)
      for (const text of [q.question, q.answer, q.fact, ...q.wrong]) {
        for (const lang of LANGS) expect(text[lang]).toBeTruthy()
      }
    }
  })
})

describe('localizeQuestion', () => {
  it('produces a complete prompt and labels in every language', () => {
    for (const q of generate(400, { seed: 11 })) {
      for (const lang of LANGS) {
        const l = localizeQuestion(q, lang, makeT(lang))
        expect(l.prompt).toBeTruthy()
        expect(l.prompt, `${q.key} ${lang}`).not.toMatch(/\{\{|\( \)|: \?|^ /)
        expect(l.choices).toHaveLength(4)
        for (const c of l.choices) expect(c.label, `${q.key} ${lang}`).toBeTruthy()
      }
    }
  })
})

describe('free answer mode', () => {
  it('only uses question types that make sense without choices', () => {
    const allowedTypes = ['curated', 'feature_country', 'feature_continent', 'river_mouth', 'river_city',
      'mountain_range', 'highest_point', 'mountain_height', 'range_highest', 'neighbor_free']
    for (const q of generate(400, { mode: ANSWER_MODES.FREE, seed: 5 })) {
      expect(allowedTypes).toContain(q.type)
    }
  })

  it('accepts the displayed answer in every language and rejects a wrong one', () => {
    for (const q of generate(300, { mode: ANSWER_MODES.FREE, seed: 5 })) {
      for (const lang of LANGS) {
        const { answer } = localizeQuestion(q, lang, makeT(lang))
        const first = answer.split(', ')[0]
        expect(checkFreeAnswer(q, first), `${q.key} ${lang} ${first}`).not.toBeNull()
      }
      expect(checkFreeAnswer(q, 'zzzzzz')).toBeNull()
    }
  })

  it('accepts short forms without articles or generic words', () => {
    const find = (type, predicate) => generate(2000, { mode: ANSWER_MODES.FREE, seed: 13 })
      .find((q) => q.type === type && predicate(q))

    const mouth = find('river_mouth', (q) => q.accepted[0].value === 'caspian')
    expect(checkFreeAnswer(mouth, 'Caspienne')).not.toBeNull()
    expect(checkFreeAnswer(mouth, 'mer caspienne')).not.toBeNull()
    expect(checkFreeAnswer(mouth, 'Caspian')).not.toBeNull()
    expect(checkFreeAnswer(mouth, 'mer Noire')).toBeNull()

    const range = find('mountain_range', (q) => q.accepted[0].value === 'alps')
    expect(checkFreeAnswer(range, 'alpes')).not.toBeNull()
    expect(checkFreeAnswer(range, 'Alps')).not.toBeNull()
  })

  it('tolerates typos on long answers', () => {
    const q = generate(2000, { mode: ANSWER_MODES.FREE, seed: 17 })
      .find((x) => x.type === 'river_city' && x.accepted[0].value === 'mississippi')
    expect(checkFreeAnswer(q, 'Missisippi')?.match).toBe('typo')
  })
})
