import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useSurvivalState from './useSurvivalState'
import { GAME_TYPES } from '../utils/gameTypes'
import { buildSurvivalRounds } from '../utils/survival'
import { loadSnapshot } from '../utils/multiplayerSnapshot'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const { PLACEMENT, FLAGS, BORDER_GUESS, QUIZ } = GAME_TYPES

const play = (options) => renderHook(() => useSurvivalState(options))

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})

afterEach(() => vi.useRealTimers())

describe('useSurvivalState', () => {
  it('costs a life per wrong answer and keeps the round going', () => {
    const { result } = play({ modes: [FLAGS], lives: 3, seed: 1 })
    const answer = result.current.round.country.properties.ADMIN
    act(() => { result.current.submitText('zzzz') })
    expect(result.current.lives).toBe(2)
    expect(result.current.outcome).toBe(null)
    act(() => { result.current.submitText(answer) })
    expect(result.current.score).toBe(1)
    expect(result.current.outcome).toBe('correct')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.roundIndex).toBe(1)
    expect(result.current.outcome).toBe(null)
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

  it('gives Border Guess one try, and ignores names that are not countries', () => {
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

  it('answers a quiz question once', () => {
    const seed = 4
    const [first] = buildSurvivalRounds([QUIZ], seed, 1)
    const wrongId = first.question.choices.find((choice) => choice.id !== first.question.correctId).id
    const { result } = play({ modes: [QUIZ], lives: 3, seed })
    act(() => { result.current.chooseAnswer(wrongId) })
    expect(result.current.lives).toBe(2)
    expect(result.current.outcome).toBe('failed')
    expect(result.current.wrongPicks).toEqual([wrongId])
  })

  it('checks the country clicked on the map', () => {
    const { result } = play({ modes: [PLACEMENT], lives: 3, seed: 5 })
    const answer = result.current.round.country.properties.ADMIN
    act(() => { result.current.clickCountry('Nowhere') })
    let again
    act(() => { again = result.current.clickCountry('Nowhere') })
    expect(again).toBe('repeat')
    expect(result.current.lives).toBe(2)
    act(() => { result.current.clickCountry(answer) })
    expect(result.current.score).toBe(1)
  })

  it('saves and resumes a multiplayer run', () => {
    const key = 'mp_snap_TEST_p_0'
    const { result, unmount } = play({ modes: [FLAGS], lives: 3, seed: 1, snapshotKey: key })
    act(() => { result.current.submitText('zzzz') })
    act(() => { result.current.submitText(result.current.round.country.properties.ADMIN) })
    const snapshot = loadSnapshot(key)
    expect(snapshot).toMatchObject({ index: 1, errors: 1, score: 1 })
    unmount()
    const resumed = play({ modes: [FLAGS], lives: 3, seed: 1, snapshot, snapshotKey: key })
    expect(resumed.result.current.roundIndex).toBe(1)
    expect(resumed.result.current.lives).toBe(2)
    expect(resumed.result.current.score).toBe(1)
  })
})
