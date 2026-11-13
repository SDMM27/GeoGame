import { beforeEach, describe, expect, it } from 'vitest'
import {
  EASTER_EGG_SCORE,
  GLOBE_SKINS,
  SECRET_SKIN,
  activeSkin,
  discoRgb,
  globeSkin,
  isSkinUnlocked,
  loadSecretFound,
  loadSkinChoice,
  reachesEasterEgg,
  saveSecretFound,
  saveSkinChoice,
  visibleSkins,
} from './globeSkins'

describe('globe skins', () => {
  beforeEach(() => globalThis.localStorage?.clear())

  it('has unique ids and a full palette on every non-classic skin', () => {
    const ids = GLOBE_SKINS.map((skin) => skin.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const skin of GLOBE_SKINS.filter((s) => s.palette)) {
      expect(Object.keys(skin.palette).sort()).toEqual(
        ['graticule', 'land', 'landEdge', 'ocean', 'oceanDeep', 'reticle', 'reticleHalo'].sort()
      )
    }
  })

  it('unlocks level skins at their level and the secret one only once found', () => {
    const parchment = globeSkin('parchment')
    expect(isSkinUnlocked(parchment, { level: 2 })).toBe(false)
    expect(isSkinUnlocked(parchment, { level: 3 })).toBe(true)
    expect(isSkinUnlocked(globeSkin(SECRET_SKIN), { level: 99 })).toBe(false)
    expect(isSkinUnlocked(globeSkin(SECRET_SKIN), { secret: true })).toBe(true)
  })

  it('hides the secret skin until it is found', () => {
    expect(visibleSkins({ level: 99 }).some((s) => s.id === SECRET_SKIN)).toBe(false)
    expect(visibleSkins({ secret: true }).some((s) => s.id === SECRET_SKIN)).toBe(true)
  })

  it('falls back to classic for a locked or unknown choice', () => {
    expect(activeSkin('gold', { level: 1 }).id).toBe('classic')
    expect(activeSkin('nope', { level: 99 }).id).toBe('classic')
    expect(activeSkin('gold', { level: 30 }).id).toBe('gold')
  })

  it('fires the easter egg once, on the find that reaches the threshold', () => {
    expect(reachesEasterEgg(EASTER_EGG_SCORE - 100, EASTER_EGG_SCORE)).toBe(true)
    expect(reachesEasterEgg(EASTER_EGG_SCORE, EASTER_EGG_SCORE + 100)).toBe(false)
    expect(reachesEasterEgg(0, 100)).toBe(false)
  })

  it('gives disco colors in range', () => {
    for (const t of [0, 1.3, 2, 3.99, 100]) {
      for (const c of discoRgb(t)) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
    expect(discoRgb(0)).not.toEqual(discoRgb(2))
  })

  it('remembers the choice and the secret on the device', () => {
    expect(loadSkinChoice()).toBe('classic')
    saveSkinChoice('tropical')
    expect(loadSkinChoice()).toBe('tropical')
    expect(loadSecretFound()).toBe(false)
    saveSecretFound()
    expect(loadSecretFound()).toBe(true)
  })
})
