// Last step: tap the country on the world map. Wrong taps are painted, and the right country once the step is over.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View } from 'react-native'

import { mainPartBounds } from '@shared/utils/countryInfo'

import { WorldMap, type MapLayer, type WorldMapHandle } from '@/components/map/WorldMap'
import { makeStyles, radius, space, useColors } from '@/theme'
import type { Feature } from './labels'

export function PlacementStep({
  country,
  wrong,
  resolved,
  found,
  onPick,
  bottomInset,
  children,
}: {
  country: Feature
  wrong: string[]
  resolved: boolean
  found: boolean
  onPick: (admin: string) => void
  // Room kept free at the bottom of the map for the panel
  bottomInset: number
  children: ReactNode
}) {
  const styles = useStyles()
  const colors = useColors()
  const mapRef = useRef<WorldMapHandle>(null)
  const [ready, setReady] = useState(false)
  const admin = country.properties.ADMIN
  // The map keeps the first callback it gets: always call the latest
  const pick = useRef(onPick)
  useEffect(() => {
    pick.current = onPick
  })

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.geoJson.resetStyle()
    for (const layer of map.geoJson.getLayers()) {
      const name = layer.feature.properties.ADMIN
      if (resolved && name === admin) {
        const color = found ? colors.accent : colors.warning
        layer.setStyle({ fillColor: color, fillOpacity: 0.6, color, weight: 2 })
      } else if (wrong.includes(name)) {
        layer.setStyle({ fillColor: colors.danger, fillOpacity: 0.5, color: colors.danger, weight: 1.5 })
      }
    }
  }, [ready, wrong, resolved, found, admin, colors])

  // A step lost zooms on the country, as the classic game's reveal does
  useEffect(() => {
    const map = mapRef.current
    const bounds = resolved && mainPartBounds(country)
    if (!ready || !map || !bounds) return
    map.fitBounds(bounds, { padding: 40, paddingBottom: bottomInset, maxZoom: 6, animate: true })
  }, [ready, resolved, country, bottomInset])

  return (
    <View style={styles.root}>
      <WorldMap ref={mapRef} onReady={() => setReady(true)} onCountryPress={(layer: MapLayer) => pick.current(layer.feature.properties.ADMIN)} />
      <View style={styles.panel}>{children}</View>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.ocean },
  panel: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
}))
