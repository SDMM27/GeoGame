// The answer of a Border Guess on the map with its land neighbours around it. A tap on a country names it in the
// corner of the map, which names the answer until then.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import { countryDisplayName, getNeighbors } from '@shared/utils/countryInfo'

import { Text } from '@/components/ui'
import { makeStyles, radius, space, useColors, useTheme } from '@/theme'
import { getGeoBounds, type CountryFeature } from './geometry'
import { WorldMap, type MapLayer, type Overlay, type WorldMapHandle } from './WorldMap'

export function BorderGuessReveal({ country, style }: { country: CountryFeature; style?: StyleProp<ViewStyle> }) {
  const { i18n } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const accent = useTheme().gameColors.border_guess
  const mapRef = useRef<WorldMapHandle>(null)
  const [ready, setReady] = useState(false)
  const [picked, setPicked] = useState<CountryFeature | null>(null)
  const admin = country.properties.ADMIN
  const neighbors = useMemo(() => getNeighbors(country, i18n.language) as { admin: string; name: string }[], [country, i18n.language])
  const named = picked ?? country
  const namedIsAnswer = named.properties.ADMIN === admin

  // A dot on the answer keeps a tiny country visible
  const overlays = useMemo<Overlay[]>(() => {
    const center = country.properties.center
    return center ? [{ type: 'circle', center: [center[1], center[0]], radius: 4, color: accent }] : []
  }, [country, accent])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const answer = { fillColor: accent, fillOpacity: 0.6, color: accent, weight: 2 }
    const neighbor = { fillColor: colors.landStroke, fillOpacity: 0.55, color: colors.landStroke, weight: 1.5 }
    const names = new Set(neighbors.map((neighbor) => neighbor.admin))
    map.geoJson.resetStyle()
    for (const layer of map.geoJson.getLayers()) {
      const name = layer.feature.properties.ADMIN
      if (name === admin) layer.setStyle(answer)
      else if (names.has(name)) layer.setStyle(neighbor)
    }
    // Framed on the answer alone, with room around it: fitting the neighbours too would shrink it next to Russia or China
    map.fitBounds(getGeoBounds(country), { animate: false, padding: 60, maxZoom: 7 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, admin, neighbors, accent, colors])

  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.frame, style]}>
        <WorldMap
          ref={mapRef}
          interactive={false}
          showSmallCountryMarkers={false}
          overlays={overlays}
          onReady={() => setReady(true)}
          onCountryPress={(layer: MapLayer) => setPicked(layer.feature)}
        />
        <View style={styles.name} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text variant="bodyStrong" color={namedIsAnswer ? accent : colors.text} numberOfLines={1}>
            {countryDisplayName(named, i18n.language)}
          </Text>
        </View>
      </View>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  frame: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ocean,
  },
  name: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    maxWidth: '80%',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
}))
