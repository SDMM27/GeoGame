import { describe, expect, it, vi } from 'vitest'
import { callerUid } from './playerAuth.mjs'
import { usernameCredentialUid } from './usernameCredentialUid.mjs'

describe('player authentication', () => {
  it('accepts a legacy or custom player session and refuses the internal credential identity', async () => {
    const player = 'b5db4a87-d01a-4265-b4eb-dedc618bcb82'
    const auth = { verifyIdToken: vi.fn(async (uid) => ({ uid })) }
    expect(await callerUid(auth, 'legacy-player')).toBe('legacy-player')
    expect(await callerUid(auth, player)).toBe(player)
    expect(await callerUid(auth, usernameCredentialUid(player))).toBeNull()
  })
})
