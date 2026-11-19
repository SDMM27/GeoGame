import { globeSkin } from '@shared/utils/globeSkins'
import type { GlobeSkin } from '@/hooks/useActiveGlobeSkin'
import { darkColors, lightColors } from '@/theme/palettes'

import { resolveGlobePalette, resolveGlobeSwatch } from './globePalette'

const themes = [['light', lightColors], ['dark', darkColors]] as const
const skinWithId = (id: string) => globeSkin(id) as GlobeSkin

describe('mobile globe colors', () => {
  it.each(['parchment', 'tropical', 'glacier'])('keeps the original %s palette in either theme', (id) => {
    const skin = skinWithId(id)
    for (const [scheme, colors] of themes) {
      expect(resolveGlobePalette(skin, colors, scheme)).toEqual(skin.palette)
      expect(resolveGlobeSwatch(skin, colors)).toEqual(skin.swatch)
    }
  })

  it.each(['volcano', 'neon', 'aurora', 'gold', 'disco'])('uses the current theme for the %s ocean', (id) => {
    const skin = skinWithId(id)
    for (const [scheme, colors] of themes) {
      expect(resolveGlobePalette(skin, colors, scheme)).toMatchObject({
        ocean: colors.globeOcean,
        oceanDeep: colors.globeOceanDeep,
        land: skin.palette?.land,
        reticle: skin.palette?.reticle,
        reticleHalo: skin.palette?.reticleHalo,
        graticule: colors.globeGraticule,
      })
      expect(resolveGlobeSwatch(skin, colors)).toEqual([colors.globeOcean, skin.swatch?.[1]])
    }
  })

  it('keeps the classic globe on the full theme palette', () => {
    const skin = skinWithId('classic')
    for (const [scheme, colors] of themes) {
      expect(resolveGlobePalette(skin, colors, scheme)).toEqual({
        ocean: colors.globeOcean,
        oceanDeep: colors.globeOceanDeep,
        land: colors.globeLand,
        landEdge: colors.globeLandEdge,
        graticule: colors.globeGraticule,
        reticle: colors.text,
        reticleHalo: scheme === 'light' ? colors.surface : colors.globeOceanDeep,
      })
      expect(resolveGlobeSwatch(skin, colors)).toEqual([colors.globeOcean, colors.globeLand])
    }
  })
})
