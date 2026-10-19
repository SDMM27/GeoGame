import { describe, it, expect } from 'vitest'
import { ASCENSION_PRESETS, matchPreset, buildPhaseSequence, presetLabel } from './ascensionPresets'

describe('ASCENSION_PRESETS', () => {
  it('has 4 presets', () => {
    expect(ASCENSION_PRESETS).toHaveLength(4)
  })
  it('Découverte totals 16 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Découverte')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(16)
  })
  it('Progressif totals 31 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Progressif')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(31)
  })
  it('Challenge totals 23 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Challenge')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(23)
  })
  it('Hardcore totals 35 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Hardcore')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(35)
  })
})

describe('matchPreset', () => {
  it('returns preset name when phases exactly match a preset', () => {
    expect(matchPreset({ Facile: 10, Moyen: 5, Difficile: 1, Impossible: 0 })).toBe('Découverte')
  })
  it('returns null for custom config', () => {
    expect(matchPreset({ Facile: 3, Moyen: 3, Difficile: 3, Impossible: 3 })).toBeNull()
  })
  it('returns preset name via sliders matching Challenge', () => {
    expect(matchPreset({ Facile: 7, Moyen: 7, Difficile: 7, Impossible: 2 })).toBe('Challenge')
  })
})

describe('buildPhaseSequence', () => {
  it('skips difficulties with count 0', () => {
    const seq = buildPhaseSequence({ Facile: 10, Moyen: 5, Difficile: 1, Impossible: 0 })
    expect(seq).toHaveLength(3)
    expect(seq.map(p => p.difficulty)).toEqual(['Facile', 'Moyen', 'Difficile'])
  })
  it('respects Facile→Moyen→Difficile→Impossible order', () => {
    const seq = buildPhaseSequence({ Facile: 5, Moyen: 5, Difficile: 5, Impossible: 5 })
    expect(seq.map(p => p.difficulty)).toEqual(['Facile', 'Moyen', 'Difficile', 'Impossible'])
  })
  it('returns correct counts', () => {
    const seq = buildPhaseSequence({ Facile: 7, Moyen: 3, Difficile: 0, Impossible: 2 })
    expect(seq).toEqual([
      { difficulty: 'Facile', count: 7 },
      { difficulty: 'Moyen', count: 3 },
      { difficulty: 'Impossible', count: 2 },
    ])
  })
})

describe('presetLabel', () => {
  const t = (key) => `t:${key}`
  it('translates the known presets', () => {
    expect(presetLabel('Découverte', t)).toBe('t:presets.discovery')
    expect(presetLabel('Progressif', t)).toBe('t:presets.progressive')
    expect(presetLabel('Hardcore', t)).toBe('t:presets.hardcore')
  })
  it('keeps an unknown or missing name', () => {
    expect(presetLabel('Ancien', t)).toBe('Ancien')
    expect(presetLabel(null, t)).toBeNull()
  })
})
