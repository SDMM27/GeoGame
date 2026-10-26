import { describe, expect, it, vi } from 'vitest'

vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({}))

const { buildRecordsGrid } = await import('./playerRecords')
const { PERFECT_SCORES } = await import('./perfectScores')

describe('buildRecordsGrid', () => {
  it('has a cell per game, difficulty and continent, none played for a new player', () => {
    const grid = buildRecordsGrid({})
    expect(grid.total).toBe(50)
    expect(grid.perfectCount).toBe(0)
    expect(grid.rows.map((row) => row.game)).toEqual(['PLACEMENT', 'HARDCORE', 'FLAGS', 'MISSING_FLAG', 'CAPITALS'])
    expect(grid.rows[0].difficulties.map((cell) => cell.mode)).toEqual(['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore'])
    expect(grid.rows[0].continents.map((cell) => cell.mode)).toEqual(['Europe', 'Asie', 'Afrique', 'Amériques', 'Océanie'])
    expect(grid.rows[0].difficulties[0]).toMatchObject({ score: null, isPerfect: false, ratio: 0 })
  })

  it('marks only the exact perfect score and gives the ratio of the others', () => {
    const perfect = PERFECT_SCORES.PLACEMENT_Facile
    const grid = buildRecordsGrid({
      PLACEMENT_Facile: { score: perfect },
      PLACEMENT_Moyen: { score: PERFECT_SCORES.PLACEMENT_Moyen - 1 },
      FLAGS_Europe: { score: PERFECT_SCORES.FLAGS_Europe },
    })
    const [facile, moyen] = grid.rows[0].difficulties
    expect(facile).toMatchObject({ score: perfect, perfect, isPerfect: true, ratio: 1 })
    expect(moyen.isPerfect).toBe(false)
    expect(moyen.ratio).toBeCloseTo((PERFECT_SCORES.PLACEMENT_Moyen - 1) / PERFECT_SCORES.PLACEMENT_Moyen)
    expect(grid.rows[2].continents[0].isPerfect).toBe(true)
    expect(grid.perfectCount).toBe(2)
  })

  it('counts a score above the perfect one (saved before a scoring change) as perfect, ratio within 1', () => {
    const cell = buildRecordsGrid({ CAPITALS_Facile: { score: PERFECT_SCORES.CAPITALS_Facile + 5 } }).rows[4].difficulties[0]
    expect(cell).toMatchObject({ isPerfect: true, ratio: 1 })
  })
})
