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
    expect(FRAMES.every((item) => isUnlocked(item))).toBe(true)
    const levelItem = { id: 'x', unlock: { kind: 'level', level: 5 } }
    expect(isUnlocked(levelItem)).toBe(false)
    expect(isUnlocked(levelItem, { level: 4 })).toBe(false)
    expect(isUnlocked(levelItem, { level: 5 })).toBe(true)
    expect(isUnlocked({ id: 'y', unlock: { kind: 'mystery' } })).toBe(false)
  })
})
