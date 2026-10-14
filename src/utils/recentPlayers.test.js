import { beforeEach, describe, expect, it } from 'vitest'
import { getRecentPlayers, MAX_RECENT_PLAYERS, rememberPlayers } from './recentPlayers'

beforeEach(() => localStorage.clear())

describe('recent players', () => {
  it('keeps the accounts of a room, not visitors nor yourself', () => {
    rememberPlayers({ a: { pseudo: 'Alice', uid: 'u1' }, b: { pseudo: 'Visitor' }, c: { pseudo: 'Me', uid: 'me' } }, 'me')
    expect(getRecentPlayers().map((item) => item.uid)).toEqual(['u1'])
  })

  it('puts the players just met first, without duplicates', () => {
    rememberPlayers({ a: { pseudo: 'Alice', uid: 'u1' }, b: { pseudo: 'Bob', uid: 'u2' } }, 'me')
    rememberPlayers({ a: { pseudo: 'Carol', uid: 'u3' }, b: { pseudo: 'Bob', uid: 'u2' } }, 'me')
    expect(getRecentPlayers().map((item) => item.uid)).toEqual(['u3', 'u2', 'u1'])
  })

  it('keeps only the latest ones', () => {
    for (let i = 0; i < MAX_RECENT_PLAYERS + 5; i++) rememberPlayers({ a: { pseudo: `P${i}`, uid: `u${i}` } }, 'me')
    expect(getRecentPlayers()).toHaveLength(MAX_RECENT_PLAYERS)
    expect(getRecentPlayers()[0].uid).toBe(`u${MAX_RECENT_PLAYERS + 4}`)
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('geogame_recent_players', '{nope')
    expect(getRecentPlayers()).toEqual([])
    localStorage.setItem('geogame_recent_players', JSON.stringify([{ uid: 1 }, { uid: 'u', name: 'N', at: 1 }]))
    expect(getRecentPlayers()).toHaveLength(1)
  })
})
