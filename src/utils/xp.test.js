// A claim keeps the cached public profile in step: the scrolls and seals it paid must show without another read.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const patchPublicData = vi.fn()
const callPush = vi.fn()
vi.mock('./publicProfile', () => ({ cachedPublicData: () => null, fetchPublicData: vi.fn(), patchPublicData: (...args) => patchPublicData(...args) }))
vi.mock('./pushApi', () => ({ callPush: (...args) => callPush(...args) }))
vi.mock('./serverTime', () => ({ serverNow: () => 0 }))

const { claimXp, onXpClaimed } = await import('./xp')

const xp = { level: 3 }
beforeEach(() => {
  patchPublicData.mockReset()
  callPush.mockReset()
})

describe('claimXp', () => {
  it('patches the flags and the scrolls of the answer into the cached account and tells the listeners', async () => {
    const scrolls = { unlocked: ['continents-1858'], seals: 1 }
    const flags = { unlocked: [], current: 'FR', pieces: 1 }
    callPush.mockResolvedValue({ status: 200, body: { xp, gained: 10, flags, fragments: 1, seals: 1, scrolls, unlockedScrolls: ['continents-1858'] } })
    const heard = vi.fn()
    const off = onXpClaimed(heard)
    await claimXp('u1')
    off()
    expect(patchPublicData).toHaveBeenCalledWith('u1', { xp, flags, scrolls })
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ seals: 1, scrolls, unlockedScrolls: ['continents-1858'], fragments: 1 }))
  })

  it('keeps the cache as it is for what an older server does not send', async () => {
    callPush.mockResolvedValue({ status: 200, body: { xp, gained: 0 } })
    const heard = vi.fn()
    const off = onXpClaimed(heard)
    await claimXp('u1')
    off()
    expect(patchPublicData).toHaveBeenCalledWith('u1', { xp })
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ seals: 0, scrolls: null, unlockedScrolls: [] }))
  })
})
