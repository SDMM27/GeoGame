// Draws a single country's outline, framed to fill its box (Border Guess).
import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import { geoMercator, geoPath } from 'd3-geo'
import type { Geometry } from 'geojson'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'

import { getFocusCountry } from '@shared/utils/borderGuessMap'

import silhouettes from '@/assets/data/silhouettes.json'
import { colors } from '@/theme'
import type { CountryFeature } from './geometry'

const PADDING = 20

// Outlines simplified per country (scripts/build-silhouettes.mjs): the map dataset is too coarse for small countries.
const OUTLINES = silhouettes as unknown as Record<string, Geometry>

export function CountrySilhouette({
  country,
  color = colors.highlight,
  style,
  label,
}: {
  country: CountryFeature
  color?: string
  style?: StyleProp<ViewStyle>
  /** Spoken description; the outline is the question by default, so it does not name the country. */
  label?: string
}) {
  const { t } = useTranslation()
  const [size, setSize] = useState({ width: 0, height: 0 })

  const path = useMemo(() => {
    if (!size.width || !size.height) return null
    // Tiny islands are dropped when the mainland dominates, like on the website.
    const detailed = { ...country, geometry: OUTLINES[country.properties.ADMIN] ?? country.geometry }
    const focus = getFocusCountry(detailed) as CountryFeature
    // Rotate to the country's own center so shapes crossing the antimeridian stay whole.
    const [lng] = (country.properties.center as [number, number] | undefined) ?? [0, 0]
    const projection = geoMercator()
      .rotate([-lng, 0])
      .fitExtent(
        [
          [PADDING, PADDING],
          [size.width - PADDING, size.height - PADDING],
        ],
        focus
      )
    const d = geoPath(projection)(focus)
    return d ? Skia.Path.MakeFromSVGString(d) : null
  }, [country, size])

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize({ width, height })
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? t('mobile.a11y.outline_to_identify')}
      style={style}
      onLayout={onLayout}>
      {path && (
        <Canvas style={{ flex: 1 }}>
          <Path path={path} color={`${color}33`} />
          <Path path={path} color={color} style="stroke" strokeWidth={2} strokeJoin="round" />
        </Canvas>
      )}
    </View>
  )
}
