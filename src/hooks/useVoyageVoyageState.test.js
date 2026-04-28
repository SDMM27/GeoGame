import { describe, it, expect } from 'vitest'
import { computeScore, isNeighbor, findShortestPath } from '../utils/voyageVoyageUtils'

// These tests verify pure logic extracted from the hook
// (the hook itself is tested via the UI)

const testBorders = {
  FR: ['ES', 'IT', 'DE'],
  ES: ['FR', 'PT'],
  IT: ['FR', 'AT', 'SI'],
  DE: ['FR', 'AT', 'CH'],
  PT: ['ES'],
  AT: ['IT', 'DE', 'SI'],
  SI: ['IT', 'AT'],
  CH: ['DE'],
}

describe('logique de validation de guess', () => {
  it('un pays voisin du dernier validé est accepté', () => {
    // Chain: [FR, IT] — next guess must be a neighbor of IT
    const lastISO = 'IT'
    expect(isNeighbor(lastISO, 'AT', testBorders)).toBe(true)
    expect(isNeighbor(lastISO, 'PT', testBorders)).toBe(false)
  })

  it('on peut atteindre SI depuis FR en 2 étapes', () => {
    const path = findShortestPath('FR', 'SI', testBorders)
    expect(path).toHaveLength(3) // FR → IT → SI
    expect(path[0]).toBe('FR')
    expect(path[path.length - 1]).toBe('SI')
  })
})

describe('computeScore — formule de score', () => {
  it('chemin parfait FR→SI en 2 étapes, 0 erreur : score = 2', () => {
    // optimal=2, steps=2, wrongs=0 → 2*2 - 2 - 0 = 2
    expect(computeScore(2, 2, 0)).toBe(2)
  })

  it('chemin parfait mais 2 erreurs : score = 1', () => {
    // optimal=2, steps=2, wrongs=2 → 4 - 2 - (2 × 0.5) = 1
    expect(computeScore(2, 2, 2)).toBe(1)
  })

  it('1 erreur donne une pénalité de 0.5 (poids × 0.5)', () => {
    // optimal=2, steps=2, wrongs=1 → 4 - 2 - 0.5 = 1.5
    expect(computeScore(2, 2, 1)).toBe(1.5)
  })

  it('chemin non optimal (3 étapes au lieu de 2) sans erreur : score = 1', () => {
    // optimal=2, steps=3, wrongs=0 → 2×2 - 3 - 0 = 1
    expect(computeScore(2, 3, 0)).toBe(1)
  })

  it('grand chemin optimal (5 étapes), parfait : score = 5', () => {
    expect(computeScore(5, 5, 0)).toBe(5)
  })
})
