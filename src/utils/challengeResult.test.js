import { describe, it, expect } from 'vitest'
import { challengeMessage, challengeOutcome, findFriendGame } from '../../api/_lib/challengeResult.mjs'
import { pickResult } from '../../api/_lib/dailyNudge.mjs'

const at = (ms) => ({ toMillis: () => ms })

describe('challengeMessage', () => {
  it('says what happened from the friend’s point of view', () => {
    const base = { username: 'Léa', gameType: 'FLAGS' }
    expect(challengeMessage('fr', { ...base, outcome: 'win' })).toContain('Léa t’a battu')
    expect(challengeMessage('fr', { ...base, outcome: 'lose' })).toContain('Léa a perdu contre toi')
    expect(challengeMessage('fr', { ...base, outcome: 'tie' })).toContain('égalité')
    expect(challengeMessage('fr', { ...base, outcome: 'win' })).not.toContain('{{')
  })

  it('falls back to English', () => {
    expect(challengeMessage('xx', { username: 'Lea', gameType: 'FLAGS', outcome: 'win' })).toContain('beat you')
  })
})

describe('pickResult', () => {
  const variant = { difficulty: null, continent: null, presetName: null }

  it('uses attempts for the daily attempts games, points otherwise', () => {
    expect(pickResult('QUIZ', { mode: 'daily', attempts: 4 })).toEqual({ score: 4, solved: true, mode: 'daily', ...variant })
    expect(pickResult('BORDER_GUESS', { mode: 'daily', attempts: 7, solved: false })).toMatchObject({ score: 7, solved: false })
    expect(pickResult('RANKING', { mode: 'daily', attempts: 4, score: 9 })).toMatchObject({ score: 9 })
    expect(pickResult('RANKING', {})).toEqual({ score: 0, solved: true, mode: null, ...variant })
  })

  it('ranks the infinite Quiz on points', () => {
    expect(pickResult('QUIZ', { mode: 'infinite', score: 120, difficulty: 3 })).toMatchObject({ score: 120, difficulty: 3 })
  })
})

describe('findFriendGame / challengeOutcome', () => {
  const flags = (score, extra = {}) => ({ score, solved: true, mode: 'standard', difficulty: 'easy', continent: null, presetName: null, ...extra })
  const games = [
    { id: 'g4', data: { gameType: 'FLAGS', mode: 'ascension', score: 500, playedAt: at(4000) } },
    { id: 'g3', data: { gameType: 'FLAGS', mode: 'standard', difficulty: 'easy', score: 80, playedAt: at(3000) } },
    { id: 'daily_QUIZ_2026-10-10', data: { gameType: 'QUIZ', mode: 'daily', attempts: 3, playedAt: at(2000) } },
    { id: 'g2', data: { gameType: 'QUIZ', mode: 'infinite', score: 40, playedAt: at(1500) } },
    { id: 'g1', data: { gameType: 'FLAGS', mode: 'standard', difficulty: 'easy', score: 10, playedAt: at(500) } },
  ]

  it('daily: matches the game of the nudge day, fewer attempts win', () => {
    const nudge = { mode: 'daily', gameType: 'QUIZ', day: '2026-10-10', challenger: { score: 5, solved: true, mode: 'daily' } }
    expect(findFriendGame(nudge, games).attempts).toBe(3)
    expect(challengeOutcome(nudge, games)).toBe('win')
    expect(findFriendGame({ ...nudge, day: '2026-10-09' }, games)).toBeNull()
  })

  it('recent: the latest game of the same type and variant played since the nudge', () => {
    const nudge = { mode: 'recent', gameType: 'FLAGS', at: 1000, challenger: flags(90) }
    expect(findFriendGame(nudge, games).score).toBe(80)
    expect(challengeOutcome(nudge, games)).toBe('lose')
    expect(challengeOutcome({ ...nudge, challenger: flags(80) }, games)).toBe('tie')
    expect(challengeOutcome({ ...nudge, at: 5000 }, games)).toBeNull()
  })

  it('recent: ignores games of another mode or difficulty', () => {
    expect(challengeOutcome({ mode: 'recent', gameType: 'FLAGS', at: 1000, challenger: flags(90, { difficulty: 'hard' }) }, games)).toBeNull()
    const ascension = { mode: 'recent', gameType: 'FLAGS', at: 1000, challenger: flags(400, { mode: 'ascension', difficulty: null }) }
    expect(challengeOutcome(ascension, games)).toBe('win')
  })

  it('recent: the infinite Quiz ranks on points, more is better', () => {
    const challenger = { score: 30, solved: true, mode: 'infinite', difficulty: null, continent: null, presetName: null }
    const nudge = { mode: 'recent', gameType: 'QUIZ', at: 1000, challenger }
    expect(findFriendGame(nudge, games).score).toBe(40)
    expect(challengeOutcome(nudge, games)).toBe('win')
  })
})
