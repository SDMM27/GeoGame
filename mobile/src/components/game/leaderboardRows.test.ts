import { visibleRows } from './leaderboardRows'

const scores = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: `u${i}`, score: 100 - i }))

describe('visibleRows', () => {
  it('keeps the first rows with their rank index', () => {
    const rows = visibleRows(scores(10), undefined, 3)
    expect(rows.map((row) => row.index)).toEqual([0, 1, 2])
    expect(rows[0].score.uid).toBe('u0')
  })

  it('does not duplicate the player when already visible', () => {
    expect(visibleRows(scores(10), 'u1', 3)).toHaveLength(3)
    // the last visible row (index max - 1) is still inside
    expect(visibleRows(scores(10), 'u2', 3)).toHaveLength(3)
  })

  it('appends the player\'s own entry with its real rank when further down', () => {
    const rows = visibleRows(scores(10), 'u7', 3)
    expect(rows).toHaveLength(4)
    expect(rows[3]).toEqual({ score: { uid: 'u7', score: 93 }, index: 7 })
  })

  it('handles a player at exactly the first hidden position', () => {
    const rows = visibleRows(scores(10), 'u3', 3)
    expect(rows[3].index).toBe(3)
  })

  it('ignores an unknown uid and short or empty lists', () => {
    expect(visibleRows(scores(10), 'nobody', 3)).toHaveLength(3)
    expect(visibleRows(scores(2), 'u1', 5).map((row) => row.index)).toEqual([0, 1])
    expect(visibleRows([], 'u1', 5)).toEqual([])
  })
})
