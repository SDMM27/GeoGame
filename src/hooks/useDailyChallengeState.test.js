import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useDailyChallengeState, { resumeChallenge } from './useDailyChallengeState'
import { GAME_TYPES } from '../utils/gameTypes'
import { CHALLENGE_ROUNDS, CHALLENGE_TIMER } from '../utils/dailyChallenge'
import { challengeRounds } from '../utils/dailyChallengeRounds'

const mocks = vi.hoisted(() => ({ dailyKey: '2026-10-16' }))

vi.mock('./useDailyKey', () => ({ default: () => mocks.dailyKey }))

const STORAGE_KEY = 'daily-challenge:2026-10-16'
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY))

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  mocks.dailyKey = '2026-10-16'
})

afterEach(() => vi.useRealTimers())

function startedChallenge() {
  const hook = renderHook(() => useDailyChallengeState())
  act(() => hook.result.current.start())
  return hook
}

// Right answer of the round on screen, whatever its kind
function answerRight(result) {
  const { round } = result.current
  const country = round.country.properties
  act(() => {
    if (round.type === GAME_TYPES.PLACEMENT) result.current.clickCountry(country.ADMIN)
    else result.current.submitText(round.type === GAME_TYPES.CAPITALS ? country.capital : country.ADMIN)
  })
}

// Answer shown, then the next round
const nextRound = () => act(() => { vi.advanceTimersByTime(2500) })

describe('useDailyChallengeState', () => {
  it('waits for the day (server time), then shows the rules without starting anything', () => {
    mocks.dailyKey = null
    const { result, rerender } = renderHook(() => useDailyChallengeState())
    expect(result.current.phase).toBe('loading')
    expect(result.current.dailyKey).toBe(null)
    expect(result.current.rounds).toEqual([])
    mocks.dailyKey = '2026-10-16'
    rerender()
    expect(result.current.phase).toBe('ready')
    expect(result.current.dailyKey).toBe('2026-10-16')
    expect(result.current.rounds).toHaveLength(CHALLENGE_ROUNDS)
    expect(result.current.round).toBe(null)
    act(() => { vi.advanceTimersByTime(60000) })
    expect(result.current.phase).toBe('ready')
    expect(result.current.results).toEqual(Array(CHALLENGE_ROUNDS).fill(null))
  })

  it('plays the 12 different rounds of the day, 20 s each', () => {
    const { result } = startedChallenge()
    expect(result.current.phase).toBe('playing')
    expect(result.current.roundIndex).toBe(0)
    expect(result.current.total).toBe(12)
    expect(result.current.timeLeftMs).toBe(CHALLENGE_TIMER * 1000)
    const names = result.current.rounds.map((round) => round.country.properties.ADMIN)
    expect(new Set(names).size).toBe(12)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(result.current.timeLeftMs).toBe(12000)
  })

  it('gives everyone the same rounds on the same day', () => {
    const a = renderHook(() => useDailyChallengeState()).result.current.rounds.map((round) => round.country.properties.ADMIN)
    mocks.dailyKey = '2026-10-17'
    const b = renderHook(() => useDailyChallengeState()).result.current.rounds.map((round) => round.country.properties.ADMIN)
    mocks.dailyKey = '2026-10-16'
    const c = renderHook(() => useDailyChallengeState()).result.current.rounds.map((round) => round.country.properties.ADMIN)
    expect(c).toEqual(a)
    expect(b).not.toEqual(a)
    // The ones the leaderboards rebuild for a day
    expect(challengeRounds('2026-10-16').map((round) => round.country.properties.ADMIN)).toEqual(a)
  })

  it('counts the right answers: a wrong one, a give-up and the timer each end a round, with no life lost', () => {
    const { result } = startedChallenge()
    answerRight(result)
    expect(result.current.outcome).toBe('correct')
    nextRound()
    act(() => { result.current.giveUp() })
    expect(result.current.outcome).toBe('failed')
    nextRound()
    act(() => { vi.advanceTimersByTime(CHALLENGE_TIMER * 1000) })
    expect(result.current.outcome).toBe('failed')
    expect(result.current.timedOut).toBe(true)
    nextRound()
    expect(result.current.roundIndex).toBe(3)
    expect(result.current.results.slice(0, 4)).toEqual(['correct', 'failed', 'failed', null])
    expect(result.current.score).toBe(1)
    expect(result.current.phase).toBe('playing')
  })

  it('ends after the 12th round with the score, the results and the time, and keeps them', () => {
    const { result } = startedChallenge()
    for (let i = 0; i < CHALLENGE_ROUNDS; i++) {
      if (i % 4 === 3) act(() => { result.current.giveUp() })
      else answerRight(result)
      nextRound()
    }
    expect(result.current.phase).toBe('done')
    expect(result.current.isComplete).toBe(true)
    expect(result.current.score).toBe(9)
    expect(result.current.results).toHaveLength(12)
    expect(result.current.results.filter((r) => r === 'failed')).toHaveLength(3)
    expect(result.current.elapsedTime).toBeGreaterThan(0)
    expect(stored()).toMatchObject({ done: true, score: 9, elapsedTime: result.current.elapsedTime })
  })

  it('never lets a finished challenge be replayed', () => {
    const first = startedChallenge()
    for (let i = 0; i < CHALLENGE_ROUNDS; i++) {
      act(() => { first.result.current.giveUp() })
      nextRound()
    }
    expect(first.result.current.score).toBe(0)
    expect(first.result.current.phase).toBe('done')
    first.unmount()

    const { result } = renderHook(() => useDailyChallengeState())
    expect(result.current.phase).toBe('done')
    expect(result.current.score).toBe(0)
    act(() => result.current.start())
    expect(result.current.phase).toBe('done')
    expect(result.current.round).toBe(null)
    expect(result.current.results).toEqual(Array(CHALLENGE_ROUNDS).fill('failed'))
  })

  it('keeps the run through a refresh, and counts the round that was on screen as failed', () => {
    const first = startedChallenge()
    answerRight(first.result)
    nextRound()
    answerRight(first.result)
    nextRound()
    expect(first.result.current.roundIndex).toBe(2)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(stored()).toMatchObject({ pending: true, index: 2 })
    first.unmount()

    const { result } = renderHook(() => useDailyChallengeState())
    expect(result.current.phase).toBe('ready')
    expect(result.current.resumed).toBe(true)
    expect(result.current.roundIndex).toBe(3)
    expect(result.current.score).toBe(2)
    expect(result.current.results.slice(0, 4)).toEqual(['correct', 'correct', 'failed', null])
    // Refreshing again before playing doesn't cost another round
    expect(stored().index).toBe(3)
    expect(stored().pending).toBeUndefined()
    act(() => result.current.start())
    expect(result.current.phase).toBe('playing')
    expect(result.current.roundIndex).toBe(3)
    expect(result.current.timeLeftMs).toBe(CHALLENGE_TIMER * 1000)
    expect(result.current.score).toBe(2)
    answerRight(result)
    expect(result.current.score).toBe(3)
    expect(result.current.results.slice(0, 5)).toEqual(['correct', 'correct', 'failed', 'correct', null])
  })

  it('keeps an answer given just before a refresh', () => {
    const first = startedChallenge()
    answerRight(first.result)
    first.unmount()
    const { result } = renderHook(() => useDailyChallengeState())
    expect(result.current.score).toBe(1)
    expect(result.current.roundIndex).toBe(1)
    expect(result.current.results[0]).toBe('correct')
  })

  it('is over when the refresh was on the last round', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ index: 11, results: Array(11).fill('correct'), score: 11, elapsedMs: 90000, pending: true }))
    const { result } = renderHook(() => useDailyChallengeState())
    expect(result.current.phase).toBe('done')
    expect(result.current.score).toBe(11)
    expect(result.current.elapsedTime).toBe(90000)
    expect(result.current.results[11]).toBe('failed')
  })

  it('starts over on the next day', () => {
    const first = startedChallenge()
    answerRight(first.result)
    first.unmount()
    mocks.dailyKey = '2026-10-17'
    const { result } = renderHook(() => useDailyChallengeState())
    expect(result.current.phase).toBe('ready')
    expect(result.current.resumed).toBe(false)
    expect(result.current.score).toBe(0)
  })

  it('stays playable without storage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    const { result } = startedChallenge()
    answerRight(result)
    expect(result.current.score).toBe(1)
    getItem.mockRestore()
    setItem.mockRestore()
  })
})

describe('resumeChallenge', () => {
  it('knows nothing from nothing', () => {
    expect(resumeChallenge(null)).toBe(null)
    expect(resumeChallenge('x')).toBe(null)
  })

  it('moves a pending round to failed and on to the next one', () => {
    expect(resumeChallenge({ index: 1, results: ['correct'], score: 1, elapsedMs: 4000, pending: true })).toMatchObject({
      index: 2,
      score: 1,
      elapsedMs: 4000,
      results: ['correct', 'failed', ...Array(10).fill(null)],
    })
  })

  it('ignores a score that does not match the results', () => {
    expect(resumeChallenge({ index: 2, results: ['correct', 'failed'], score: 12 }).score).toBe(1)
    expect(resumeChallenge({ done: true, results: Array(12).fill('correct'), score: 0, elapsedTime: 5 })).toMatchObject({ done: true, score: 12, elapsedTime: 5 })
  })

  it('copes with garbage', () => {
    expect(resumeChallenge({ index: 'x', results: 'no', elapsedMs: 'soon' })).toMatchObject({ index: 0, score: 0, elapsedMs: 0 })
    expect(resumeChallenge({ index: 99, results: [] })).toMatchObject({ done: true, score: 0 })
  })
})
