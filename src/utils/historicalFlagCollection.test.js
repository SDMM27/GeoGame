import { describe, expect, it } from 'vitest'
import { awardFlagFragments, HISTORICAL_FLAG_COST, readHistoricalFlags } from './historicalFlagCollection'

const pool = [{ iso: 'fr', rarity: 'rare' }, { iso: 'de', rarity: 'common' }]
const flags = { current: 'fr', pieces: 2, unlocked: [] }
const historicalFlags = { active: 'ussr', progress: { ussr: 8, qing: 3 }, unlocked: [] }

describe('the historical flag collection', () => {
  it('reads an empty collection from existing accounts', () => {
    expect(readHistoricalFlags({ flags })).toEqual({ active: null, progress: {}, unlocked: [] })
  })

  it('accepts only catalog cards and normalizes partial progress', () => {
    const raw = { active: 'fiji-kingdom', unlocked: ['fiji-kingdom', 'unknown', 'fiji-kingdom'], progress: { 'fiji-kingdom': 5, ussr: 100, qing: 0, unknown: 8 } }
    expect(readHistoricalFlags({ historicalFlags: raw })).toEqual({
      active: null, unlocked: ['fiji-kingdom'], progress: { ussr: HISTORICAL_FLAG_COST - 1 },
    })
  })

  it('uses future fragments only on the selected flag and preserves other progress', () => {
    expect(awardFlagFragments({ flags, historicalFlags }, 1, pool, 'sample')).toEqual({
      flags,
      historicalFlags: { active: 'ussr', progress: { ussr: 9, qing: 3 }, unlocked: [] },
      classicFragments: 0,
      historicalFragments: 1,
      unlockedFlags: [],
      unlockedHistoricalFlags: [],
    })
  })

  it('completes a card at ten and applies the remaining fragments to the classic collection', () => {
    expect(awardFlagFragments({ flags, historicalFlags }, 4, pool, 'sample')).toEqual({
      flags: { current: 'de', pieces: 0, unlocked: ['fr'] },
      historicalFlags: { active: null, progress: { qing: 3 }, unlocked: ['ussr'] },
      classicFragments: 2,
      historicalFragments: 2,
      unlockedFlags: ['fr'],
      unlockedHistoricalFlags: ['ussr'],
    })
  })

  it('still rewards the selected card after the classic collection is complete', () => {
    const completed = { current: null, pieces: 0, unlocked: ['fr', 'de'] }
    expect(awardFlagFragments({ flags: completed, historicalFlags }, 10, pool, 'sample')).toMatchObject({
      flags: completed, unlockedFlags: [], unlockedHistoricalFlags: ['ussr'],
    })
  })

  it('resumes classic rewards without resetting banked historical progress', () => {
    const paused = { ...historicalFlags, active: null }
    expect(awardFlagFragments({ flags, historicalFlags: paused }, 1, pool, 'sample')).toMatchObject({
      flags: { current: 'fr', pieces: 3, unlocked: [] }, historicalFlags: null, historicalFragments: 0,
    })
    expect(paused.progress).toEqual({ ussr: 8, qing: 3 })
  })
})
