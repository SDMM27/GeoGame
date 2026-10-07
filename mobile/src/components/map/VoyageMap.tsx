// Voyage Voyage map: start, target and guessed countries colored like the website (Travle colors).
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, radius } from '@/theme'
import { allCountries, type CountryFeature } from './geometry'
import { WorldMap, type LeafletStyle, type Overlay, type WorldMapHandle } from './WorldMap'

export type VoyageColor = 'start' | 'green' | 'yellow' | 'red' | 'target' | 'hint'

export const VOYAGE_COLORS: Record<VoyageColor, string> = {
  start: '#5FD4F4',
  green: colors.accent,
  yellow: colors.warning,
  red: colors.danger,
  target: '#FF9EC7',
  hint: colors.textMuted,
}

function styleFor(color: VoyageColor): LeafletStyle {
  if (color === 'hint') return { fillColor: VOYAGE_COLORS.hint, fillOpacity: 0.08, color: '#EEF1F8', weight: 2 }
  return { fillColor: VOYAGE_COLORS[color], fillOpacity: color === 'red' ? 0.4 : 0.55, color: VOYAGE_COLORS[color], weight: 2 }
}

const CENTERS = new Map(
  allCountries.map((feature) => [feature.properties.ADMIN, feature.properties.center as [number, number] | undefined])
)

export function VoyageMap({
  start,
  target,
  guesses,
  hints,
  interactive,
  style,
}: {
  start: CountryFeature
  target: CountryFeature
  guesses: { feature: CountryFeature; color: VoyageColor }[]
  hints: CountryFeature[]
  interactive: boolean
  style?: StyleProp<ViewStyle>
}) {
  const mapRef = useRef<WorldMapHandle>(null)
  const [ready, setReady] = useState(false)
  const framed = useRef(false)

  // Later entries win: the target keeps its color until it is reached.
  const colored = useMemo(() => {
    const byName = new Map<string, VoyageColor>()
    hints.forEach((feature) => byName.set(feature.properties.ADMIN, 'hint'))
    byName.set(target.properties.ADMIN, 'target')
    guesses.forEach(({ feature, color }) => byName.set(feature.properties.ADMIN, color))
    byName.set(start.properties.ADMIN, 'start')
    return byName
  }, [start, target, guesses, hints])
  const signature = [...colored].map(([name, color]) => `${name}:${color}`).join('|')

  // A dot on each country keeps tiny ones visible.
  const overlays = useMemo<Overlay[]>(
    () =>
      [...colored].flatMap(([name, color]) => {
        const center = CENTERS.get(name)
        if (!center || color === 'hint') return []
        return [{ type: 'circle' as const, center: [center[1], center[0]] as [number, number], radius: 4, color: VOYAGE_COLORS[color] }]
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  )

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.geoJson.resetStyle()
    for (const layer of map.geoJson.getLayers()) {
      const color = colored.get(layer.feature.properties.ADMIN)
      if (color) layer.setStyle(styleFor(color))
    }
    // Hints are not framed: a huge country (Russia, Canada) would take over the view.
    const framedNames = [...colored].filter(([, color]) => color !== 'hint' && color !== 'red').map(([name]) => name)
    map.fitCountries(framedNames, { animate: framed.current, maxZoom: 5 })
    framed.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature])

  return (
    <View style={[styles.frame, style]}>
      <WorldMap
        ref={mapRef}
        interactive={interactive}
        showSmallCountryMarkers={false}
        overlays={overlays}
        onReady={() => setReady(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    height: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ocean,
  },
})
