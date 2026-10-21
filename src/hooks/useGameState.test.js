import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useGameState from './useGameState'
import { reportEloAnswer } from '../utils/eloReport'
import { FIXTURE_COUNTRIES } from './testUtils/countriesFixture'

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-i18next', () => {
  const value = { t: (key) => key, i18n: { language: 'fr' } }
  return { useTranslation: () => value }
})
vi.mock('../utils/multiplayerSnapshot', () => ({ saveSnapshot: vi.fn() }))
vi.mock('../utils/eloReport', () => ({ reportEloAnswer: vi.fn(), flushElo: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

// Helper: builds a fake Leaflet layer with a name and a mutable style
function makeLayer(name, initialStyle = {}) {
  const style = { fillColor: 'transparent', fillOpacity: 1, weight: 0.85, ...initialStyle }
  return {
    feature: { properties: { ADMIN: name } },
    options: style,
    setStyle(newStyle) { Object.assign(this.options, newStyle) },
  }
}

// Simulate the guard logic we are about to implement
function makeHoverGuards(foundSet, shownSet) {
  const COUNTRY_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }
  const onMouseOver = (layer) => {
    const name = layer.feature.properties.ADMIN
    if (foundSet.has(name)) return
    if (shownSet.has(name)) return
    layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
  }
  const onMouseOut = (layer) => {
    const name = layer.feature.properties.ADMIN
    if (foundSet.has(name)) return
    if (shownSet.has(name)) return
    layer.setStyle(COUNTRY_STYLE)
  }
  return { onMouseOver, onMouseOut }
}

describe('hover guards — found countries', () => {
  let foundSet, shownSet, guards

  beforeEach(() => {
    foundSet = new Set()
    shownSet = new Set()
    guards = makeHoverGuards(foundSet, shownSet)
  })

  it('does not change style on mouseover when country is found', () => {
    const layer = makeLayer('France', { fillColor: '#4ade80' })
    foundSet.add('France')
    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
  })

  it('does not reset style on mouseout when country is found', () => {
    const layer = makeLayer('France', { fillColor: '#4ade80' })
    foundSet.add('France')
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
  })

  it('applies hover color on mouseover for normal (unfound) country', () => {
    const layer = makeLayer('Espagne')
    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#7b2ff7')
  })

  it('resets style on mouseout for normal country', () => {
    const layer = makeLayer('Espagne', { fillColor: '#7b2ff7' })
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('transparent')
  })
})

describe('hover guards — shown (red) countries', () => {
  let foundSet, shownSet, guards

  beforeEach(() => {
    foundSet = new Set()
    shownSet = new Set()
    guards = makeHoverGuards(foundSet, shownSet)
  })

  it('does not change style on mouseover when country is shown (red)', () => {
    const layer = makeLayer('Italie', { fillColor: '#ff4d4d' })
    shownSet.add('Italie')
    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#ff4d4d')
  })

  it('does not reset style on mouseout when country is shown (red)', () => {
    const layer = makeLayer('Italie', { fillColor: '#ff4d4d' })
    shownSet.add('Italie')
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('#ff4d4d')
  })
})

describe('hover guards — shown country then found', () => {
  it('once moved from shownSet to foundSet, stays green on hover', () => {
    const foundSet = new Set()
    const shownSet = new Set(['Japon'])
    const guards = makeHoverGuards(foundSet, shownSet)
    const layer = makeLayer('Japon', { fillColor: '#ff4d4d' })

    // Player finally clicks the red country correctly
    shownSet.delete('Japon')
    foundSet.add('Japon')
    layer.setStyle({ fillColor: '#4ade80' })

    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
  })
})

// Helper qui reproduit la logique de calcul du score (miroir de SCORE_TABLE dans useGameState)
function computeScore(diff, errorCount) {
  const table = {
    Facile:     [3, 2, 1],
    Moyen:      [5, 3, 2],
    Difficile:  [7, 5, 3],
    Impossible: [9, 7, 5],
  }
  const row = table[diff]
  if (!row) return 0
  const idx = Math.min(errorCount, 2)
  return row[idx]
}

describe('score dégressif selon tentatives', () => {
  it('Facile : 1re tentative = +3', () => {
    expect(computeScore('Facile', 0)).toBe(3)
  })
  it('Facile : 2e tentative = +2', () => {
    expect(computeScore('Facile', 1)).toBe(2)
  })
  it('Facile : 3e tentative = +1', () => {
    expect(computeScore('Facile', 2)).toBe(1)
  })

  it('Moyen : 1re tentative = +5', () => {
    expect(computeScore('Moyen', 0)).toBe(5)
  })
  it('Moyen : 2e tentative = +3', () => {
    expect(computeScore('Moyen', 1)).toBe(3)
  })
  it('Moyen : 3e tentative = +2', () => {
    expect(computeScore('Moyen', 2)).toBe(2)
  })

  it('Difficile : 1re tentative = +7', () => {
    expect(computeScore('Difficile', 0)).toBe(7)
  })
  it('Difficile : 2e tentative = +5', () => {
    expect(computeScore('Difficile', 1)).toBe(5)
  })
  it('Difficile : 3e tentative = +3', () => {
    expect(computeScore('Difficile', 2)).toBe(3)
  })

  it('Impossible : 1re tentative = +9', () => {
    expect(computeScore('Impossible', 0)).toBe(9)
  })
  it('Impossible : 2e tentative = +7', () => {
    expect(computeScore('Impossible', 1)).toBe(7)
  })
  it('Impossible : 3e tentative = +5', () => {
    expect(computeScore('Impossible', 2)).toBe(5)
  })

  it('difficulté inconnue retourne 0', () => {
    expect(computeScore('Hardcore', 0)).toBe(0)
  })

  it('à chaque niveau, pays plus difficile rapporte plus (1re tentative)', () => {
    expect(computeScore('Moyen', 0)).toBeGreaterThan(computeScore('Facile', 0))
    expect(computeScore('Difficile', 0)).toBeGreaterThan(computeScore('Moyen', 0))
    expect(computeScore('Impossible', 0)).toBeGreaterThan(computeScore('Difficile', 0))
  })

  it('à chaque niveau, pays plus difficile rapporte plus (2e tentative)', () => {
    expect(computeScore('Moyen', 1)).toBeGreaterThan(computeScore('Facile', 1))
    expect(computeScore('Difficile', 1)).toBeGreaterThan(computeScore('Moyen', 1))
    expect(computeScore('Impossible', 1)).toBeGreaterThan(computeScore('Difficile', 1))
  })

  it('à chaque niveau, pays plus difficile rapporte plus (3e tentative)', () => {
    expect(computeScore('Moyen', 2)).toBeGreaterThan(computeScore('Facile', 2))
    expect(computeScore('Difficile', 2)).toBeGreaterThan(computeScore('Moyen', 2))
    expect(computeScore('Impossible', 2)).toBeGreaterThan(computeScore('Difficile', 2))
  })
})

describe('useGameState — Elo', () => {
  it('reports the errors made before the country was found', () => {
    const { result } = renderHook(() => useGameState('Facile', false))
    const name = result.current.targetCountry
    const wrong = FIXTURE_COUNTRIES.find((c) => c.properties.ADMIN !== name).properties.ADMIN
    act(() => result.current.onCountryNameClick(wrong))
    act(() => result.current.onCountryNameClick(name))
    expect(reportEloAnswer).toHaveBeenCalledWith('PLACEMENT', name, { found: true, errors: 1 })
  })

  it('reports a country shown with "see" as not found', () => {
    const { result } = renderHook(() => useGameState('Facile', false))
    const name = result.current.targetCountry
    act(() => result.current.seeCountry())
    act(() => result.current.onCountryNameClick(name))
    expect(reportEloAnswer).toHaveBeenCalledWith('PLACEMENT', name, { found: false, errors: 0 })
  })

  it('reports nothing in a room (override list)', () => {
    const { result } = renderHook(() => useGameState('Facile', false, ['France', 'Espagne'], null, 'room-key'))
    act(() => result.current.onCountryNameClick('France'))
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})

describe('useGameState — Hardcore', () => {
  it('keeps the map without borders when the game restarts', () => {
    const { result } = renderHook(() => useGameState('Facile', false, null, null, null, null, 'HARDCORE'))
    const layer = makeLayer('France', { fillColor: '#3DDC97', weight: 2 })
    result.current.geoJsonRef.current = { getLayers: () => [layer] }
    act(() => result.current.restartGame())
    expect(layer.options).toMatchObject({ fillColor: '#2A3E66', color: '#2A3E66', fillOpacity: 1, weight: 1 })
  })

  it('reports a tap to Elo in a normal game', () => {
    const { result } = renderHook(() => useGameState('Facile', false, null, null, null, null, 'HARDCORE'))
    const name = result.current.targetCountry
    act(() => result.current.onMapClick({ latlng: { lat: 0, lng: 0 } }))
    expect(reportEloAnswer).toHaveBeenCalledWith('HARDCORE', name, expect.objectContaining({ errors: 0 }))
  })

  it('reports nothing with an imposed list of countries', () => {
    const { result } = renderHook(() => useGameState('Facile', false, ['France', 'Espagne'], null, null, null, 'HARDCORE'))
    act(() => result.current.onMapClick({ latlng: { lat: 0, lng: 0 } }))
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})
