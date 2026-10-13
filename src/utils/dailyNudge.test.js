import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./pushApi', () => ({ callPush: vi.fn() }))

import { nudgeFriend } from './dailyNudge'
import { callPush } from './pushApi'

describe('nudgeFriend', () => {
  beforeEach(() => callPush.mockReset())

  it('asks the API to nudge the friend about that game', async () => {
    callPush.mockResolvedValue({ status: 200, body: { sent: 2 } })
    expect(await nudgeFriend('bob', 'QUIZ')).toBe('sent')
    expect(callPush).toHaveBeenCalledWith('daily-nudge', { friendUid: 'bob', gameType: 'QUIZ' })
  })

  it('tells a friend nobody could reach from one who was', async () => {
    callPush.mockResolvedValue({ status: 200, body: { sent: 0 } })
    expect(await nudgeFriend('bob', 'QUIZ')).toBe('unreachable')
  })

  it('maps the refusals the player can understand', async () => {
    for (const [error, expected] of [['already_sent', 'already_sent'], ['not_played', 'not_played'], ['rate_limited', 'rate_limited'], ['forbidden', 'error']]) {
      callPush.mockResolvedValue({ status: 429, body: { error } })
      expect(await nudgeFriend('bob', 'QUIZ')).toBe(expected)
    }
  })

  it('is an error when signed out or offline', async () => {
    callPush.mockResolvedValue(null)
    expect(await nudgeFriend('bob', 'QUIZ')).toBe('error')
  })
})
