// One Firestore listener per account, however many components watch the friends list.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onSnapshot } from 'firebase/firestore'
import { watchSharedFriendships } from './friends'

let push
const unsubscribe = vi.fn()

vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('./pushApi', () => ({ requestPush: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  documentId: vi.fn(),
  endAt: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn((ref, next) => {
    push = next
    return unsubscribe
  }),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  startAt: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}))

const snapshot = (docs) => ({ docs: docs.map((data, index) => ({ id: `f${index}`, data: () => data })) })
const friendship = { users: ['me', 'bob'], usernames: { me: 'Me', bob: 'Bob' }, requester: 'me', status: 'accepted' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('watchSharedFriendships', () => {
  it('starts one listener for several subscribers and stops it with the last one', () => {
    const first = vi.fn()
    const second = vi.fn()
    const stopFirst = watchSharedFriendships('me', first)
    const stopSecond = watchSharedFriendships('me', second)
    expect(onSnapshot).toHaveBeenCalledTimes(1)

    push(snapshot([friendship]))
    expect(first).toHaveBeenCalledWith([expect.objectContaining({ uid: 'bob', status: 'friend' })])
    expect(second).toHaveBeenCalledTimes(1)

    stopFirst()
    expect(unsubscribe).not.toHaveBeenCalled()
    stopSecond()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('gives a late subscriber the latest list at once', () => {
    const stopFirst = watchSharedFriendships('me', vi.fn())
    push(snapshot([friendship]))
    const late = vi.fn()
    const stopLate = watchSharedFriendships('me', late)
    expect(late).toHaveBeenCalledWith([expect.objectContaining({ uid: 'bob' })])
    expect(onSnapshot).toHaveBeenCalledTimes(1)
    stopFirst()
    stopLate()
  })

  it('starts a new listener once everybody left', () => {
    watchSharedFriendships('me', vi.fn())()
    watchSharedFriendships('me', vi.fn())()
    expect(onSnapshot).toHaveBeenCalledTimes(2)
  })
})
