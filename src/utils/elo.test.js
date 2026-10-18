import { describe, expect, it, vi } from 'vitest'

vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({}))
vi.mock('./serverTime', () => ({ serverNow: () => Date.now() }))

const { eloRow, formatSeason, playerEloEntries } = await import('./elo')

describe('elo', () => {
  it('formats a season with the translation, or leaves an unknown one as is', () => {
    const t = (key, values) => `${key}:${values.quarter}/${values.year}`
    expect(formatSeason('2026-Q4', t)).toBe('elo.season:4/2026')
    expect(formatSeason('soon', t)).toBe('soon')
  })

  it('maps documents to leaderboard rows', () => {
    const data = { uid: 'u1', name: 'Ada', duel: { rating: 1012.6, games: 5, wins: 3 }, solo: { FLAGS: { rating: 1099.4, found: 42 } } }
    expect(eloRow('u1', data, 'duel')).toEqual({ id: 'u1', uid: 'u1', name: 'Ada', rating: 1013, games: 5, wins: 3 })
    expect(eloRow('u1', data, 'FLAGS')).toEqual({ id: 'u1', uid: 'u1', name: 'Ada', rating: 1099, found: 42 })
    expect(eloRow('u2', { name: 'Bob', solo: {} }, 'FLAGS').uid).toBe('u2')
  })

  it('lists the ratings of a player: played, carried over or default', () => {
    const data = {
      season: '2026-Q4',
      duel: { rating: 1100.4, games: 4, wins: 3 },
      solo: { FLAGS: { rating: 950, found: 10 } },
      carry: { CAPITALS: 1200 },
    }
    const byKey = Object.fromEntries(playerEloEntries(data, '2026-Q4').map((entry) => [entry.key, entry]))
    expect(byKey.duel).toMatchObject({ rating: 1100, played: true, games: 4, wins: 3 })
    expect(byKey.FLAGS).toMatchObject({ rating: 950, played: true, found: 10 })
    expect(byKey.CAPITALS).toMatchObject({ rating: 1200, played: false })
    expect(byKey.SURVIVAL).toMatchObject({ rating: 1000, played: false })
  })

  it('moves a past season to the carried ratings, halfway back to 1000', () => {
    const data = { season: '2026-Q3', duel: { rating: 1200, games: 9, wins: 6 }, solo: {}, carry: {} }
    const duel = playerEloEntries(data, '2026-Q4').find((entry) => entry.key === 'duel')
    expect(duel).toEqual({ key: 'duel', rating: 1100, played: false })
  })
})
