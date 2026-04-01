import { describe, it, expect } from 'vitest'

// Mirror of the scoring logic in useFlagGameState — first error is free.
function computeFlagScore(diff, errorCount) {
  const table = {
    Facile:     [3, 2, 1],
    Moyen:      [5, 3, 2],
    Difficile:  [7, 5, 3],
    Impossible: [9, 7, 5],
  }
  const row = table[diff]
  if (!row) return 0
  const adjustedErrors = Math.max(0, errorCount - 1)
  const idx = Math.min(adjustedErrors, 2)
  return row[idx]
}

describe('computeFlagScore — première erreur tolérée', () => {
  it('Facile, 0 erreur = 3', () => expect(computeFlagScore('Facile', 0)).toBe(3))
  it('Facile, 1 erreur = 3 (tolérée)', () => expect(computeFlagScore('Facile', 1)).toBe(3))
  it('Facile, 2 erreurs = 2', () => expect(computeFlagScore('Facile', 2)).toBe(2))

  it('Moyen, 0 erreur = 5', () => expect(computeFlagScore('Moyen', 0)).toBe(5))
  it('Moyen, 1 erreur = 5 (tolérée)', () => expect(computeFlagScore('Moyen', 1)).toBe(5))
  it('Moyen, 2 erreurs = 3', () => expect(computeFlagScore('Moyen', 2)).toBe(3))

  it('Difficile, 0 erreur = 7', () => expect(computeFlagScore('Difficile', 0)).toBe(7))
  it('Difficile, 1 erreur = 7 (tolérée)', () => expect(computeFlagScore('Difficile', 1)).toBe(7))
  it('Difficile, 2 erreurs = 5', () => expect(computeFlagScore('Difficile', 2)).toBe(5))

  it('Impossible, 0 erreur = 9', () => expect(computeFlagScore('Impossible', 0)).toBe(9))
  it('Impossible, 1 erreur = 9 (tolérée)', () => expect(computeFlagScore('Impossible', 1)).toBe(9))
  it('Impossible, 2 erreurs = 7', () => expect(computeFlagScore('Impossible', 2)).toBe(7))

  it('difficulté inconnue retourne 0', () => expect(computeFlagScore('Hardcore', 0)).toBe(0))
})
