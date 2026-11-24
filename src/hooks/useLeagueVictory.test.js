import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { fetchLastWeek } from '../utils/league'
import { onLeagueFlagReveal } from '../utils/leagueFlagReveal'
import { useLeagueVictory } from './useLeagueVictory'

vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('../utils/league', async (importOriginal) => ({ ...await importOriginal(), fetchLastWeek: vi.fn() }))
vi.mock('../utils/serverTime', () => ({ serverNow: () => Date.parse('2026-10-14T10:00:00Z') }))

beforeEach(() => {
  localStorage.clear()
  fetchLastWeek.mockReset()
})

it('shows the podium before its flags and hands them off once on dismissal', async () => {
  const flagReveal = { unlocked: ['fr', 'de'], collectionCount: 42 }
  fetchLastWeek.mockResolvedValue({ week: '2026-W41', players: [{ uid: 'winner', points: 36, reward: 10, flagReveal }] })
  const listener = vi.fn()
  const unsubscribe = onLeagueFlagReveal(listener)
  try {
    const firstVisit = renderHook(() => useLeagueVictory('winner'))
    await waitFor(() => expect(firstVisit.result.current.result?.rank).toBe(1))
    expect(listener).not.toHaveBeenCalled()
    firstVisit.unmount()

    const secondVisit = renderHook(() => useLeagueVictory('winner'))
    await waitFor(() => expect(secondVisit.result.current.result?.rank).toBe(1))
    const { dismiss } = secondVisit.result.current
    act(() => {
      dismiss()
      dismiss()
    })
    expect(secondVisit.result.current.result).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ uid: 'winner', ...flagReveal })
    secondVisit.unmount()

    const thirdVisit = renderHook(() => useLeagueVictory('winner'))
    expect(thirdVisit.result.current.result).toBeNull()
    expect(fetchLastWeek).toHaveBeenCalledTimes(2)
  } finally {
    unsubscribe()
  }
})

it('reveals a flag earned outside the podium, once per device', async () => {
  const flagReveal = { unlocked: [], collectionCount: 0, historical: ['ussr'] }
  fetchLastWeek.mockResolvedValue({
    week: '2026-W41',
    players: [{ uid: 'one' }, { uid: 'two' }, { uid: 'three' }, { uid: 'fourth', reward: 1, flagReveal }],
  })
  const listener = vi.fn()
  const unsubscribe = onLeagueFlagReveal(listener)
  try {
    const firstVisit = renderHook(() => useLeagueVictory('fourth'))
    await waitFor(() => expect(listener).toHaveBeenCalledWith({ uid: 'fourth', ...flagReveal }))
    expect(firstVisit.result.current.result).toBeNull()
    firstVisit.unmount()
    renderHook(() => useLeagueVictory('fourth'))
    expect(fetchLastWeek).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledTimes(1)
  } finally {
    unsubscribe()
  }
})
