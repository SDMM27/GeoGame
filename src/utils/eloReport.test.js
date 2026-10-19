import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const callPush = vi.hoisted(() => vi.fn(() => Promise.resolve({ status: 200, body: {} })))

vi.mock('./pushApi', () => ({ callPush }))

import { reportEloAnswer, flushElo, reportDuel } from './eloReport'

// The calls go through a dynamic import of pushApi
const settled = async () => {
  for (let i = 0; i < 20; i++) {
    await vi.dynamicImportSettled()
    await new Promise((resolve) => setImmediate(resolve))
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  callPush.mockClear()
})

afterEach(() => {
  flushElo()
  vi.useRealTimers()
})

describe('reportEloAnswer', () => {
  it('groups answers by mode on flush', async () => {
    reportEloAnswer('PLACEMENT', 'France', { found: true, errors: 0 })
    reportEloAnswer('FLAGS', 'Chad', { found: false, errors: 3 })
    reportEloAnswer('PLACEMENT', 'Peru', { found: true, errors: 2 })
    await settled()
    expect(callPush).not.toHaveBeenCalled()
    flushElo()
    await settled()
    expect(callPush).toHaveBeenCalledTimes(2)
    expect(callPush).toHaveBeenCalledWith('elo', {
      kind: 'solo',
      mode: 'PLACEMENT',
      results: [
        { country: 'France', found: true, errors: 0 },
        { country: 'Peru', found: true, errors: 2 },
      ],
    })
    expect(callPush).toHaveBeenCalledWith('elo', {
      kind: 'solo',
      mode: 'FLAGS',
      results: [{ country: 'Chad', found: false, errors: 3 }],
    })
  })

  it('sends a batch as soon as a mode reaches 50 results', async () => {
    for (let i = 0; i < 50; i++) reportEloAnswer('CAPITALS', `C${i}`, { found: true, errors: 0 })
    await settled()
    expect(callPush).toHaveBeenCalledTimes(1)
    expect(callPush.mock.calls[0][1].results).toHaveLength(50)
    flushElo()
    await settled()
    expect(callPush).toHaveBeenCalledTimes(1)
  })

  it('splits a flush of more than 50 results', async () => {
    for (let i = 0; i < 49; i++) reportEloAnswer('CAPITALS', `C${i}`, { found: true, errors: 0 })
    flushElo()
    reportEloAnswer('CAPITALS', 'Last', { found: true, errors: 0 })
    flushElo()
    await settled()
    expect(callPush.mock.calls.map(([, body]) => body.results.length)).toEqual([49, 1])
  })

  it('flushes after 10 s without new answers', async () => {
    reportEloAnswer('PLACEMENT', 'France', { found: true, errors: 0 })
    vi.advanceTimersByTime(9000)
    await settled()
    expect(callPush).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    await settled()
    expect(callPush).toHaveBeenCalledTimes(1)
  })

  it('does not break the game when the call fails', async () => {
    callPush.mockRejectedValueOnce(new Error('offline'))
    reportEloAnswer('PLACEMENT', 'France', { found: true, errors: 0 })
    expect(() => flushElo()).not.toThrow()
    await settled()
    expect(callPush).toHaveBeenCalledTimes(1)
  })
})

describe('reportDuel', () => {
  it('reports each room game once', async () => {
    reportDuel('ABCD', 0)
    reportDuel('ABCD', 0)
    reportDuel('ABCD', 1)
    await settled()
    expect(callPush).toHaveBeenCalledTimes(2)
    expect(callPush).toHaveBeenCalledWith('elo', { kind: 'duel', room: 'ABCD', gameIndex: 0 })
  })
})
