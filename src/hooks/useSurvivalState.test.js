import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useSurvivalState from './useSurvivalState'
import { GAME_TYPES } from '../utils/gameTypes'
import { loadSnapshot } from '../utils/multiplayerSnapshot'
import { reportEloAnswer, flushElo } from '../utils/eloReport'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../utils/eloReport', () => ({ reportEloAnswer: vi.fn(), flushElo: vi.fn() }))

const { PLACEMENT, FLAGS, BORDER_GUESS, QUIZ } = GAME_TYPES

const play = (options) => renderHook(() => useSurvivalState(options))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  localStorage.clear()
})

afterEach(() => vi.useRealTimers())

describe('useSurvivalState', () => {
  it('costs one life per wrong answer, shows the answer, then moves on to the next round', () => {
    const { result } = play({ modes: [FLAGS], lives: 3, seed: 1 })
    act(() => { result.current.submitText('zzzz') })
    expect(result.current.lives).toBe(2)
    expect(result.current.outcome).toBe('failed')
    // The round is over: no second try, no second life lost
    expect(result.current.submitText('yyyy')).toBe(null)
    expect(result.current.lives).toBe(2)
    act(() => { vi.advanceTimersByTime(2500) })
    expect(result.current.roundIndex).toBe(1)
    expect(result.current.outcome).toBe(null)
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    expect(result.current.score).toBe(1)
    expect(result.current.outcome).toBe('correct')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.roundIndex).toBe(2)
  })

  it('ends a Placement round on the first wrong country', () => {
    const { result } = play({ modes: [PLACEMENT], lives: 3, seed: 5 })
    const answer = result.current.round.country.properties.ADMIN
    const wrong = answer === 'France' ? 'Spain' : 'France'
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { result.current.clickCountry(wrong) })
    expect(result.current.lives).toBe(2)
    expect(result.current.outcome).toBe('failed')
    expect(result.current.clickCountry(answer)).toBe(null)
    expect(result.current.lives).toBe(2)
  })

  it('ignores a map tap right as a round starts (meant for the "Next" button the auto-advance just removed)', () => {
    const { result } = play({ modes: [PLACEMENT], lives: 3, seed: 5 })
    const answer = result.current.round.country.properties.ADMIN
    const wrong = answer === 'France' ? 'Spain' : 'France'
    let tap
    act(() => { tap = result.current.clickCountry(wrong) })
    expect(tap).toBe(null)
    expect(result.current.lives).toBe(3)
    expect(result.current.outcome).toBe(null)
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { tap = result.current.clickCountry(wrong) })
    expect(tap).toBe('wrong')
    expect(result.current.lives).toBe(2)
  })

  it('ends the run on the last life', () => {
    const { result } = play({ modes: [FLAGS], lives: 2, seed: 1 })
    act(() => { result.current.giveUp() })
    expect(result.current.outcome).toBe('failed')
    act(() => { vi.advanceTimersByTime(2500) })
    expect(result.current.roundIndex).toBe(1)
    act(() => { result.current.submitText('zzzz') })
    expect(result.current.isOver).toBe(true)
    expect(result.current.lives).toBe(0)
    expect(result.current.isWon).toBe(false)
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    expect(result.current.score).toBe(0)
  })

  it('ignores Border Guess names that are not countries', () => {
    const { result } = play({ modes: [BORDER_GUESS], lives: 3, seed: 2 })
    const answer = result.current.round.country.properties.ADMIN
    expect(result.current.submitText('pas un pays')).toBe('unknown')
    expect(result.current.lives).toBe(3)
    const wrong = answer === 'France' ? 'Espagne' : 'France'
    let first
    act(() => { first = result.current.submitText(wrong) })
    expect(first).toBe('wrong')
    expect(result.current.lives).toBe(2)
    expect(result.current.outcome).toBe('failed')
    expect(result.current.guesses[0].distanceKm).toBeGreaterThan(0)
    act(() => { vi.advanceTimersByTime(2500) })
    expect(result.current.roundIndex).toBe(1)
  })

  it('costs a life when the time per round runs out', () => {
    const { result } = play({ modes: [FLAGS], lives: 3, seed: 1, timer: 15 })
    expect(result.current.timeLeftMs).toBe(15000)
    act(() => { vi.advanceTimersByTime(15000) })
    expect(result.current.lives).toBe(2)
    expect(result.current.outcome).toBe('failed')
    expect(result.current.timedOut).toBe(true)
    act(() => { vi.advanceTimersByTime(2500) })
    expect(result.current.roundIndex).toBe(1)
    expect(result.current.timedOut).toBe(false)
  })

  it('waits for the room in a live game: no next round on its own, goTo moves on', () => {
    const { result } = play({ modes: [FLAGS], lives: 3, seed: 1, autoAdvance: false })
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.roundIndex).toBe(0)
    act(() => { result.current.goTo(3) })
    expect(result.current.roundIndex).toBe(3)
    expect(result.current.outcome).toBe(null)
    act(() => { result.current.goTo(2) })
    expect(result.current.roundIndex).toBe(3)
  })

  it('plays the available games when the room only had the hidden Geo Quiz', () => {
    const { result } = play({ modes: [QUIZ], lives: 3, seed: 4 })
    expect(result.current.rounds.length).toBeGreaterThan(0)
    expect(result.current.rounds.every((round) => round.type !== QUIZ)).toBe(true)
  })

  it('saves and resumes a multiplayer run', () => {
    const key = 'mp_snap_TEST_p_0'
    const { result, unmount } = play({ modes: [FLAGS], lives: 3, seed: 1, snapshotKey: key })
    act(() => { result.current.submitText('zzzz') })
    act(() => { vi.advanceTimersByTime(2500) })
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    const snapshot = loadSnapshot(key)
    expect(snapshot).toMatchObject({ index: 2, errors: 1, score: 1 })
    unmount()
    const resumed = play({ modes: [FLAGS], lives: 3, seed: 1, snapshot, snapshotKey: key })
    expect(resumed.result.current.roundIndex).toBe(2)
    expect(resumed.result.current.lives).toBe(2)
    expect(resumed.result.current.score).toBe(1)
  })

  it('keeps the result of each round, and plays maxRounds rounds of different countries', () => {
    const { result } = play({ modes: [FLAGS, PLACEMENT], lives: 50, seed: 3, maxRounds: 3, distinctCountries: true })
    expect(result.current.totalRounds).toBe(3)
    expect(result.current.results).toEqual([null, null, null])
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { result.current.giveUp() })
    expect(result.current.results).toEqual(['correct', 'failed', null])
    act(() => { vi.advanceTimersByTime(2500) })
    act(() => { vi.advanceTimersByTime(20000) })
    expect(result.current.results).toEqual(['correct', 'failed', null])
    expect(result.current.rounds.map((round) => round.country.properties.ADMIN)).toHaveLength(3)
  })

  it('saves and restores the results of a multiplayer run', () => {
    const key = 'mp_snap_RES_p_0'
    const { result, unmount } = play({ modes: [FLAGS], lives: 5, seed: 1, snapshotKey: key })
    act(() => { result.current.submitText('zzzz') })
    act(() => { vi.advanceTimersByTime(2500) })
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    const snapshot = loadSnapshot(key)
    expect(snapshot.results.slice(0, 2)).toEqual(['failed', 'correct'])
    unmount()
    const resumed = play({ modes: [FLAGS], lives: 5, seed: 1, snapshot, snapshotKey: key })
    expect(resumed.result.current.results.slice(0, 3)).toEqual(['failed', 'correct', null])
  })

  it('runs nothing while paused, then starts from the snapshot', () => {
    const snapshot = { index: 2, errors: 1, score: 1, results: ['failed', 'correct'], elapsedMs: 5000 }
    const { result, rerender } = renderHook(({ paused }) => useSurvivalState({ modes: [FLAGS], lives: 5, seed: 1, timer: 15, paused, snapshot }), {
      initialProps: { paused: true },
    })
    act(() => { vi.advanceTimersByTime(60000) })
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.timeLeftMs).toBe(null)
    expect(result.current.submitText('zzzz')).toBe(null)
    // The clock doesn't move
    expect(result.current.elapsedMs).toBe(5000)
    rerender({ paused: false })
    expect(result.current.roundIndex).toBe(2)
    expect(result.current.score).toBe(1)
    expect(result.current.results.slice(0, 3)).toEqual(['failed', 'correct', null])
    expect(result.current.isPlaying).toBe(true)
    expect(result.current.timeLeftMs).toBe(15000)
    expect(result.current.elapsedMs).toBe(5000)
    act(() => { vi.advanceTimersByTime(15000) })
    expect(result.current.outcome).toBe('failed')
    expect(result.current.results[2]).toBe('failed')
  })

  it('ends the run as a win when the room says everyone else is out', () => {
    const { result } = play({ modes: [FLAGS], lives: 3, seed: 1, autoAdvance: false })
    act(() => { result.current.submitText('zzzz') })
    act(() => { result.current.win() })
    expect(result.current.isOver).toBe(true)
    expect(result.current.isWon).toBe(true)
    expect(result.current.lives).toBe(2)
  })
  it('ignores a second click that comes before the next render (a double tap): one life, one "life lost"', () => {
    const { result } = play({ modes: [PLACEMENT], lives: 3, seed: 5 })
    const answer = result.current.round.country.properties.ADMIN
    const wrong = answer === 'France' ? 'Spain' : 'France'
    const other = answer === 'Italy' ? 'Germany' : 'Italy'
    let first, second
    act(() => { vi.advanceTimersByTime(500) })
    act(() => {
      first = result.current.clickCountry(wrong)
      second = result.current.clickCountry(other)
    })
    expect(first).toBe('wrong')
    expect(second).toBe(null)
    expect(result.current.lives).toBe(2)
  })

  it('resumes a live room on the round already answered without costing another life', () => {
    const key = 'mp_snap_LIVE_p_0'
    const { result, unmount } = play({ modes: [FLAGS], lives: 3, seed: 1, snapshotKey: key, autoAdvance: false })
    act(() => { result.current.submitText('zzzz') })
    const snapshot = loadSnapshot(key)
    expect(snapshot).toMatchObject({ index: 0, errors: 1, outcome: 'failed' })
    unmount()
    const resumed = play({ modes: [FLAGS], lives: 3, seed: 1, snapshot, snapshotKey: key, autoAdvance: false })
    expect(resumed.result.current.lives).toBe(2)
    expect(resumed.result.current.isPlaying).toBe(false)
    expect(resumed.result.current.submitText('yyyy')).toBe(null)
    expect(resumed.result.current.lives).toBe(2)
  })

  it("doesn't time out on the room deadline of another round (a run resumed ahead of the room)", () => {
    const snapshot = { index: 3, errors: 0, score: 3 }
    const { result } = play({
      modes: [FLAGS], lives: 3, seed: 1, snapshot, autoAdvance: false, deadline: Date.now() - 1000, deadlineRound: 0,
    })
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current.lives).toBe(3)
    expect(result.current.isPlaying).toBe(true)
  })
})

describe('useSurvivalState — Elo', () => {
  it('reports a right round as found and a failed one as not found with one error', () => {
    const { result } = play({ modes: [FLAGS], lives: 3, seed: 1 })
    const first = result.current.round.country.properties.ADMIN
    act(() => { result.current.submitText('zzzz') })
    expect(reportEloAnswer).toHaveBeenCalledWith('SURVIVAL', first, { found: false, errors: 1 })
    act(() => { vi.advanceTimersByTime(2500) })
    const second = result.current.round.country.properties.ADMIN
    act(() => { result.current.submitText(second) })
    expect(reportEloAnswer).toHaveBeenCalledWith('SURVIVAL', second, { found: true, errors: 0 })
    expect(reportEloAnswer).toHaveBeenCalledTimes(2)
  })

  it('reports a given-up round once and flushes when the run is over', () => {
    const { result } = play({ modes: [FLAGS], lives: 1, seed: 1 })
    act(() => { result.current.giveUp() })
    expect(reportEloAnswer).toHaveBeenCalledTimes(1)
    expect(flushElo).toHaveBeenCalled()
  })

  it('reports nothing in a room or for the Daily Challenge', () => {
    const room = play({ modes: [FLAGS], lives: 3, seed: 1, snapshotKey: 'room' })
    act(() => { room.result.current.submitText('zzzz') })
    const daily = play({ modes: [FLAGS], lives: 3, seed: 1, maxRounds: 12, distinctCountries: true })
    act(() => { daily.result.current.submitText('zzzz') })
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})
