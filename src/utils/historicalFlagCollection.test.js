import { describe, expect, it, vi } from 'vitest'
import { HISTORICAL_FLAGS } from '../data/historicalFlags.js'
import { awardFlagFragments, HISTORICAL_FLAG_COST, HISTORICAL_PACK, readHistoricalFlags } from './historicalFlagCollection'

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

  it('queues the mystery pack after the current flag when the weekly bonus is paid', () => {
    const first = awardFlagFragments({ flags }, 0, pool, 'sample', { weeklyChoice: true })
    expect(first.historicalFlags).toEqual({ active: null, progress: {}, unlocked: [], next: HISTORICAL_PACK })
    expect(first.historicalPackQueued).toBe(true)
    // A second bonus while a pack is already queued changes nothing.
    const second = awardFlagFragments({ flags, historicalFlags: first.historicalFlags }, 0, pool, 'sample', { weeklyChoice: true })
    expect(second.historicalFlags).toBeNull()
    expect(second.historicalPackQueued).toBe(true)
    // The queued pack becomes the active target once the current flag completes.
    const award = awardFlagFragments({ flags, historicalFlags: first.historicalFlags }, 3, pool, 'sample')
    expect(award.unlockedFlags).toEqual(['fr'])
    expect(award.historicalFlags).toEqual({ active: HISTORICAL_PACK, progress: { [HISTORICAL_PACK]: 1 }, unlocked: [] })
  })

  it('activates the mystery pack at once when nothing is being assembled', () => {
    const result = awardFlagFragments({}, 0, pool, 'sample', { weeklyChoice: true })
    expect(result.historicalFlags).toEqual({ active: HISTORICAL_PACK, progress: {}, unlocked: [] })
    expect(result.historicalPackQueued).toBe(true)
  })

  it('queues no pack when every historical flag is already unlocked', () => {
    const all = { active: null, progress: {}, unlocked: HISTORICAL_FLAGS.map(({ id }) => id) }
    const result = awardFlagFragments({ historicalFlags: all }, 0, pool, 'sample', { weeklyChoice: true })
    expect(result.historicalFlags).toBeNull()
    expect(result.historicalPackQueued).toBeUndefined()
  })

  it('draws an unowned flag only on fragment ten', () => {
    const drawPackIndex = vi.fn(() => 0)
    const historicalFlags = { active: HISTORICAL_PACK, unlocked: ['ussr'] }
    const ninth = awardFlagFragments({ historicalFlags }, 9, pool, 'sample', { drawPackIndex })
    expect(ninth.historicalFlags).toEqual({ active: HISTORICAL_PACK, progress: { [HISTORICAL_PACK]: 9 }, unlocked: ['ussr'] })
    expect(ninth.unlockedHistoricalFlags).toEqual([])
    expect(drawPackIndex).not.toHaveBeenCalled()
    const tenth = awardFlagFragments(ninth, 1, pool, 'sample', { drawPackIndex })
    expect(drawPackIndex).toHaveBeenCalledWith(6)
    expect(tenth.unlockedHistoricalFlags).toEqual(['east-germany'])
  })

  it('keeps the combined weight of all historical flags below the last legendary flag', () => {
    const legendary = [{ iso: 'fr', rarity: 'legendary' }]
    let historicalDraws = 0
    for (let seed = 0; seed < 500; seed += 1) {
      const result = awardFlagFragments({}, 1, legendary, String(seed))
      if (result.historicalFlags?.active === HISTORICAL_PACK) historicalDraws += 1
    }
    expect(historicalDraws).toBeGreaterThan(0)
    expect(historicalDraws).toBeLessThan(250)
    const result = awardFlagFragments({ flags: { unlocked: ['fr'] } }, 1, legendary, 'sample')
    expect(result.historicalFlags.active).toBe(HISTORICAL_PACK)
  })
})
