import type { GlobePalette, GlobeSkin } from '@/hooks/useActiveGlobeSkin'
import type { Theme } from '@/theme'

export function resolveGlobePalette(skin: GlobeSkin, colors: Theme['colors'], scheme: Theme['scheme']): GlobePalette {
  const { palette } = skin
  if (palette && skin.fixedPalette) return palette

  return {
    ocean: colors.globeOcean,
    oceanDeep: colors.globeOceanDeep,
    land: palette?.land ?? colors.globeLand,
    // For styled land, outline the coast with the theme's text color at 55% opacity.
    landEdge: palette ? `${colors.text}8C` : colors.globeLandEdge,
    graticule: colors.globeGraticule,
    reticle: palette?.reticle ?? colors.text,
    reticleHalo: palette?.reticleHalo ?? (scheme === 'light' ? colors.surface : colors.globeOceanDeep),
  }
}

export function resolveGlobeSwatch(
  skin: Pick<GlobeSkin, 'fixedPalette' | 'swatch'>,
  colors: Theme['colors'],
): [string, string] {
  const [ocean, land] = skin.swatch ?? [colors.globeOcean, colors.globeLand]
  return [skin.fixedPalette ? ocean : colors.globeOcean, land]
}
