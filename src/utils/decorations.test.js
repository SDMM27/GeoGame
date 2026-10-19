import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DECORATION,
  FRAMES,
  NAME_COLORS,
  decorationStyle,
  isDefaultDecoration,
  isUnlocked,
  readDecoration,
} from './decorations'

describe('decorations', () => {
  it('has unique ids and a default in each slot', () => {
    for (const items of [FRAMES, NAME_COLORS]) {
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length)
    }
    expect(FRAMES.some((item) => item.id === DEFAULT_DECORATION.frame)).toBe(true)
    expect(NAME_COLORS.some((item) => item.id === DEFAULT_DECORATION.color)).toBe(true)
  })

  it('reads known ids and falls back to the default for anything else', () => {
    expect(readDecoration({ decoration: { frame: 'gold', color: 'sky' } })).toEqual({ frame: 'gold', color: 'sky' })
    expect(readDecoration({ decoration: { frame: 'unknown', color: 3 } })).toEqual(DEFAULT_DECORATION)
    expect(readDecoration({ decoration: 'gold' })).toEqual(DEFAULT_DECORATION)
    expect(readDecoration(undefined)).toEqual(DEFAULT_DECORATION)
  })

  it('gives what to draw', () => {
    expect(decorationStyle({ frame: 'gold', color: 'sky' })).toEqual({
      frame: { color: '#F5B83D', style: 'double' },
      nameColor: '#7AA2FF',
    })
    expect(decorationStyle(DEFAULT_DECORATION)).toEqual({ frame: null, nameColor: null })
    expect(decorationStyle(null)).toEqual({ frame: null, nameColor: null })
    expect(isDefaultDecoration(DEFAULT_DECORATION)).toBe(true)
    expect(isDefaultDecoration({ frame: 'gold', color: 'default' })).toBe(false)
  })

  it('unlocks starter items for everyone, and level items from that level', () => {
    expect(FRAMES.filter((item) => item.unlock.kind === 'starter').every((item) => isUnlocked(item))).toBe(true)
    const levelItem = { id: 'x', unlock: { kind: 'level', level: 5 } }
    expect(isUnlocked(levelItem)).toBe(false)
    expect(isUnlocked(levelItem, { level: 4 })).toBe(false)
    expect(isUnlocked(levelItem, { level: 5 })).toBe(true)
    expect(isUnlocked({ id: 'y', unlock: { kind: 'mystery' } })).toBe(false)
  })

  it('has the same unlock levels as firestore.rules', () => {
    const rules = readFileSync('firestore.rules', 'utf8')
    const map = rules.match(/function decorationLevel\(id\) \{\s*return \{([^}]*)\}/)[1]
    const inRules = Object.fromEntries([...map.matchAll(/'([^']+)':\s*(\d+)/g)].map(([, id, level]) => [id, Number(level)]))
    const inCatalog = Object.fromEntries(
      [...FRAMES, ...NAME_COLORS].filter((item) => item.unlock.kind === 'level').map((item) => [item.id, item.unlock.level])
    )
    expect(inRules).toEqual(inCatalog)
  })

  it('unlocks level items from their level', () => {
    const sunrise = FRAMES.find((item) => item.id === 'sunrise')
    expect(isUnlocked(sunrise, { level: 2 })).toBe(false)
    expect(isUnlocked(sunrise, { level: 3 })).toBe(true)
    expect(isUnlocked(sunrise)).toBe(false)
  })
})
