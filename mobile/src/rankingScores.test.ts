import { fetchRankingScores } from './rankingScores'

const mockFetch = jest.fn()
jest.mock('@shared/utils/saveScore', () => ({ fetchRankingScores: (...args: unknown[]) => mockFetch(...args) }))

describe('fetchRankingScores', () => {
  it('asks the shared code for the scores of the given day and returns them untouched', async () => {
    const scores = [{ name: 'A', dailyKey: '2026-10-08', score: 90, totalError: 12 }]
    mockFetch.mockResolvedValueOnce(scores)
    await expect(fetchRankingScores('2026-10-08')).resolves.toBe(scores)
    expect(mockFetch).toHaveBeenCalledWith('2026-10-08')
  })

  it('lets a Firestore error through (the Rankings tab maps it to a message)', async () => {
    const error = Object.assign(new Error('The query requires an index'), { code: 'failed-precondition' })
    mockFetch.mockRejectedValueOnce(error)
    await expect(fetchRankingScores('2026-10-08')).rejects.toBe(error)
  })
})
