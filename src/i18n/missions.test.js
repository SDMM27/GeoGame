// Every mission has a title, and the mission and level strings are in every language (languages.test.js checks the
// rest of the keys).
import { describe, expect, it } from 'vitest'
import { DAILY_POOL, WEEKLY_POOL } from '../utils/missions'
import { LANGUAGE_CODES } from './languages'

const locales = Object.fromEntries(
  await Promise.all(LANGUAGE_CODES.map(async (lang) => [lang, (await import(`./locales/${lang}.json`)).default]))
)

describe('missions and level strings', () => {
  it('has a title per mission and the shared keys in every language', () => {
    const ids = [...DAILY_POOL, ...WEEKLY_POOL].map((mission) => mission.id)
    for (const lang of LANGUAGE_CODES) {
      const { missions, level } = locales[lang]
      for (const id of ids) expect(missions[id], `${lang} missions.${id}`).toBeTruthy()
      for (const key of ['title', 'daily', 'weekly', 'bonus', 'reward', 'per_game', 'sign_in', 'resets_daily', 'resets_weekly']) {
        expect(missions[key], `${lang} missions.${key}`).toBeTruthy()
      }
      for (const key of ['label', 'short', 'progress', 'total', 'up', 'gained']) expect(level[key], `${lang} level.${key}`).toBeTruthy()
    }
  })

  it('names the new decoration items in every language', () => {
    for (const lang of LANGUAGE_CODES) {
      const { frame, color } = locales[lang].decorations
      for (const id of ['sunrise', 'glacier', 'amethyst', 'ruby', 'emerald', 'crown']) expect(frame[id], `${lang} frame.${id}`).toBeTruthy()
      for (const id of ['lime', 'peach', 'turquoise', 'violet', 'crimson', 'gilded']) expect(color[id], `${lang} color.${id}`).toBeTruthy()
    }
  })
})
