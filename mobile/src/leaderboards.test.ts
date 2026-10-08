import { isMine, loadErrorKey, loadErrorKind, rankLabel, soloDetailParts } from './leaderboards'

describe('loadErrorKind', () => {
  it('recognises a missing composite index from the Firestore code', () => {
    expect(loadErrorKind({ code: 'failed-precondition', message: 'x' })).toBe('index')
    expect(loadErrorKind({ code: 'firestore/failed-precondition' })).toBe('index')
  })

  it('recognises a missing composite index from the message alone', () => {
    const message = 'The query requires an index. You can create it here: https://console.firebase.google.com/...'
    expect(loadErrorKind(new Error(message))).toBe('index')
  })

  it('treats unavailable, timeouts and offline messages as network errors', () => {
    expect(loadErrorKind({ code: 'unavailable' })).toBe('network')
    expect(loadErrorKind({ code: 'firestore/deadline-exceeded' })).toBe('network')
    expect(loadErrorKind(new TypeError('Network request failed'))).toBe('network')
    expect(loadErrorKind({ message: 'Failed to get document because the client is offline.' })).toBe('network')
  })

  it('gives the index error priority over a network-looking message', () => {
    expect(loadErrorKind({ code: 'failed-precondition', message: 'network blip' })).toBe('index')
  })

  it('falls back to "other" for permission errors and unusable values', () => {
    expect(loadErrorKind({ code: 'permission-denied', message: 'Missing or insufficient permissions.' })).toBe('other')
    for (const value of [null, undefined, 'boom', 42, {}, { code: 7, message: null }]) {
      expect(loadErrorKind(value)).toBe('other')
    }
  })
})

describe('loadErrorKey', () => {
  it('points to the translation of the kind of error', () => {
    expect(loadErrorKey({ code: 'failed-precondition' })).toBe('mobile.leaderboards.error_index')
    expect(loadErrorKey({ code: 'unavailable' })).toBe('mobile.leaderboards.error_network')
    expect(loadErrorKey(undefined)).toBe('mobile.leaderboards.error_other')
  })
})

describe('isMine', () => {
  it('matches the signed-in player\'s own entry only', () => {
    expect(isMine({ uid: 'abc' }, 'abc')).toBe(true)
    expect(isMine({ uid: 'abc' }, 'xyz')).toBe(false)
  })

  it('never matches a visitor (no uid on either side)', () => {
    expect(isMine({}, undefined)).toBe(false)
    expect(isMine({ uid: undefined }, undefined)).toBe(false)
    expect(isMine({}, '')).toBe(false)
    expect(isMine({ uid: 'abc' }, undefined)).toBe(false)
  })
})

describe('soloDetailParts', () => {
  const labels = {
    gameLabel: (type: string) => ({ PLACEMENT: 'Placement', FLAGS: 'Flags' })[type],
    levelLabel: (level: string) => level.toUpperCase(),
  }

  it('shows the game only when several games are listed', () => {
    const score = { difficulty: 'Facile', continent: null, gameType: 'PLACEMENT' }
    expect(soloDetailParts(score, { showGame: true, ...labels })).toEqual(['Placement', 'FACILE'])
    expect(soloDetailParts(score, { showGame: false, ...labels })).toEqual(['FACILE'])
  })

  it('skips a game with no label or no type', () => {
    expect(soloDetailParts({ difficulty: 'Moyen', gameType: 'UNKNOWN' }, { showGame: true, ...labels })).toEqual(['MOYEN'])
    expect(soloDetailParts({ difficulty: 'Moyen' }, { showGame: true, ...labels })).toEqual(['MOYEN'])
  })

  it('adds the continent after the difficulty, unless it repeats it', () => {
    expect(soloDetailParts({ difficulty: 'Difficile', continent: 'Europe' }, { showGame: false, ...labels })).toEqual(['DIFFICILE', 'EUROPE'])
    expect(soloDetailParts({ difficulty: 'Europe', continent: 'Europe' }, { showGame: false, ...labels })).toEqual(['EUROPE'])
  })
})

describe('rankLabel', () => {
  it('uses medals for the podium and 1-based numbers after it', () => {
    expect([0, 1, 2].map(rankLabel)).toEqual(['🥇', '🥈', '🥉'])
    expect(rankLabel(3)).toBe('4')
    expect(rankLabel(49)).toBe('50')
  })
})
