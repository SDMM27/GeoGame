import { describe, expect, it } from 'vitest'
import { getMissingFlagMask } from './missingFlag'
import masks from '../data/missingFlagMasks.json'

describe('getMissingFlagMask', () => {
  it('returns the chosen mask of a known flag', () => {
    expect(getMissingFlagMask('FR')).toEqual({ axis: 'v', band: masks.FR.band })
  })

  it('accepts a lower-case iso', () => {
    expect(getMissingFlagMask('fr')).toEqual(getMissingFlagMask('FR'))
  })

  it('falls back to a stable horizontal band for an unknown iso', () => {
    const mask = getMissingFlagMask('ZZ')
    expect(mask.axis).toBe('h')
    expect([0, 1, 2]).toContain(mask.band)
    expect(getMissingFlagMask('ZZ')).toEqual(mask)
    expect(getMissingFlagMask(undefined)).toEqual({ axis: 'h', band: 0 })
  })

  it('only holds valid masks', () => {
    for (const { axis, band } of Object.values(masks)) {
      expect(['h', 'v']).toContain(axis)
      expect([0, 1, 2]).toContain(band)
    }
  })
})
