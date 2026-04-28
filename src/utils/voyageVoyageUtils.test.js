import { describe, it, expect } from 'vitest'
import {
  findShortestPath,
  getOptimalLength,
  isNeighbor,
  getEligibleCountries,
  computeScore,
} from './voyageVoyageUtils'

// Minimal test graph
const testBorders = {
  A: ['B', 'C'],
  B: ['A', 'D'],
  C: ['A', 'D'],
  D: ['B', 'C', 'E'],
  E: ['D'],
  F: ['G'],
  G: ['F'],
}

describe('findShortestPath', () => {
  it('retourne [A] quand départ = arrivée', () => {
    expect(findShortestPath('A', 'A', testBorders)).toEqual(['A'])
  })

  it('trouve le chemin direct A→B (1 étape)', () => {
    expect(findShortestPath('A', 'B', testBorders)).toEqual(['A', 'B'])
  })

  it('trouve le chemin optimal A→D (2 étapes via B ou C)', () => {
    const path = findShortestPath('A', 'D', testBorders)
    expect(path).toHaveLength(3) // A + 1 intermédiaire + D
    expect(path[0]).toBe('A')
    expect(path[path.length - 1]).toBe('D')
  })

  it('trouve A→E (3 étapes)', () => {
    const path = findShortestPath('A', 'E', testBorders)
    expect(path).toHaveLength(4)
  })

  it('retourne null si aucun chemin possible (graphes disjoints)', () => {
    expect(findShortestPath('A', 'F', testBorders)).toBeNull()
  })
})

describe('getOptimalLength', () => {
  it('retourne 1 pour voisins directs', () => {
    expect(getOptimalLength('A', 'B', testBorders)).toBe(1)
  })

  it('retourne 2 pour A→D', () => {
    expect(getOptimalLength('A', 'D', testBorders)).toBe(2)
  })

  it('retourne null si pas de chemin', () => {
    expect(getOptimalLength('A', 'F', testBorders)).toBeNull()
  })
})

describe('isNeighbor', () => {
  it('retourne true pour deux pays voisins', () => {
    expect(isNeighbor('A', 'B', testBorders)).toBe(true)
  })

  it('retourne false pour deux pays non voisins', () => {
    expect(isNeighbor('A', 'D', testBorders)).toBe(false)
  })

  it('retourne false pour pays inconnu', () => {
    expect(isNeighbor('A', 'Z', testBorders)).toBe(false)
  })
})

describe('getEligibleCountries', () => {
  it('retourne uniquement les pays avec au moins une frontière', () => {
    const eligible = getEligibleCountries(testBorders)
    expect(eligible).toContain('A')
    expect(eligible).toContain('E')
    // A country with no borders should not appear
    const noBorders = { X: [], Y: ['X'] }
    const e2 = getEligibleCountries(noBorders)
    expect(e2).not.toContain('X')
    expect(e2).toContain('Y')
  })
})

describe('computeScore', () => {
  it('score maximum quand chemin optimal sans erreur', () => {
    // optimalLength=3, stepsUsed=3, wrongGuesses=0 → 3*2 - 3 - 0 = 3
    expect(computeScore(3, 3, 0)).toBe(3)
  })

  it('pénalité pour les erreurs', () => {
    // optimalLength=3, stepsUsed=3, wrongGuesses=4 → 6 - 3 - 2 = 1
    expect(computeScore(3, 3, 4)).toBe(1)
  })

  it('pénalité pour étapes supplémentaires', () => {
    // optimalLength=3, stepsUsed=5, wrongGuesses=0 → 6 - 5 - 0 = 1
    expect(computeScore(3, 5, 0)).toBe(1)
  })

  it('score minimum est toujours 1', () => {
    expect(computeScore(2, 10, 20)).toBe(1)
  })
})
