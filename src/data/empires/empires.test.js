// The empires of the interactive maps: each has its stages in the traced file, as one MultiPolygon per stage.
import { describe, it, expect } from 'vitest'
import { EMPIRES, hasEmpireMap } from './index'
import { SCROLLS } from '../scrolls'

describe('EMPIRES', () => {
  it('are scrolls of the catalogue', () => {
    for (const id of Object.keys(EMPIRES)) {
      expect(SCROLLS.some((scroll) => scroll.id === id), id).toBe(true)
      expect(hasEmpireMap(id)).toBe(true)
    }
    expect(hasEmpireMap('turin-papyrus')).toBe(false)
    expect(hasEmpireMap('toString')).toBe(false)
  })

  it('have a view, distinct stage ids and colours, and an optional boolean cumulative', () => {
    for (const [id, empire] of Object.entries(EMPIRES)) {
      expect(empire.center, id).toHaveLength(2)
      expect(empire.zoom, id).toBeGreaterThanOrEqual(3)
      expect(empire.stages.length, id).toBeGreaterThan(0)
      expect(new Set(empire.stages.map((stage) => stage.id)).size, id).toBe(empire.stages.length)
      for (const stage of empire.stages) expect(stage.color, id).toMatch(/^#[0-9a-fA-F]{6}$/)
      if ('cumulative' in empire) expect(typeof empire.cumulative, id).toBe('boolean')
    }
  })

  it('load a territory for every stage, and only for them', async () => {
    for (const [id, empire] of Object.entries(EMPIRES)) {
      const module = await empire.load()
      const data = module.default ?? module
      expect(data.type, id).toBe('FeatureCollection')
      expect(data.features.map((feature) => feature.properties.stage), id).toEqual(empire.stages.map((stage) => stage.id))
      for (const feature of data.features) {
        expect(feature.geometry.type, id).toBe('MultiPolygon')
        expect(feature.geometry.coordinates.length, `${id} ${feature.properties.stage}`).toBeGreaterThan(0)
      }
    }
  })
})
