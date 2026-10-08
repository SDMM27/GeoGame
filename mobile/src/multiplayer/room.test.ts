import { getPlayerId, getRecentRooms, getSavedPseudo, normalizeCode, rememberRoom, type Room } from './room'

jest.mock('@shared/Firebase', () => ({ firestore: {} }))
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }))

const room = (id: string, mode: Room['mode'] = 'live', gameId = 'flags') =>
  ({ id, mode, game: { id: gameId, type: 'FLAGS' } }) as Pick<Room, 'id' | 'mode' | 'game'>

describe('normalizeCode', () => {
  it('uppercases, drops everything but letters and digits, and keeps 6 characters', () => {
    expect(normalizeCode('ab12cd')).toBe('AB12CD')
    expect(normalizeCode(' a-b 1_2/c d ')).toBe('AB12CD')
    expect(normalizeCode('abcdefghij')).toBe('ABCDEF')
    expect(normalizeCode('')).toBe('')
    expect(normalizeCode('!?#')).toBe('')
  })
})

describe('player identity', () => {
  it('creates the player id once and keeps it', () => {
    const id = getPlayerId()
    expect(id).toMatch(/^[a-z0-9]{10,}$/)
    expect(getPlayerId()).toBe(id)
    expect(globalThis.localStorage.getItem('mp_player_id')).toBe(id)
  })

  it('has no saved pseudo until one is stored', () => {
    expect(getSavedPseudo()).toBe('')
    globalThis.localStorage.setItem('geogame_pseudo', 'Sacha')
    expect(getSavedPseudo()).toBe('Sacha')
  })
})

describe('recent rooms', () => {
  it('starts empty and survives corrupted storage', () => {
    expect(getRecentRooms()).toEqual([])
    globalThis.localStorage.setItem('geogame_recent_rooms', '{not json')
    expect(getRecentRooms()).toEqual([])
  })

  it('puts the latest room first and moves a room played again to the top', () => {
    rememberRoom(room('AAA111'))
    rememberRoom(room('BBB222', 'challenge', 'quiz'))
    rememberRoom(room('AAA111'))
    expect(getRecentRooms().map((recent) => recent.code)).toEqual(['AAA111', 'BBB222'])
    expect(getRecentRooms()[1]).toMatchObject({ code: 'BBB222', gameId: 'quiz', mode: 'challenge' })
  })

  it('keeps the 8 latest rooms', () => {
    for (let i = 0; i < 12; i++) rememberRoom(room(`ROOM${i}`))
    const codes = getRecentRooms().map((recent) => recent.code)
    expect(codes).toHaveLength(8)
    expect(codes[0]).toBe('ROOM11')
    expect(codes[7]).toBe('ROOM4')
  })
})
