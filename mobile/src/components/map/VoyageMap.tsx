// Voyage Voyage map: like the website, only the start, the target, the guesses and the hints are drawn,
// over a graticule; every other country stays hidden.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'
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

const GRATICULE_COLOR = '#1E3A5F'
const GRATICULE: Overlay[] = [
  ...[-60, -30, 0, 30, 60].map((lat) => ({
    type: 'line' as const,
    points: [-180, -90, 0, 90, 180].map((lng) => [lat, lng] as [number, number]),
    color: GRATICULE_COLOR,
    width: 1,
  })),
  ...[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => ({
    type: 'line' as const,
    points: [[-85, lng], [85, lng]] as [number, number][],
    color: GRATICULE_COLOR,
    width: 1,
  })),
]

const CENTERS = new Map(
  allCountries.map((feature) => [feature.properties.ADMIN, feature.properties.center as [number, number] | undefined])
)

type VoyageMapProps = {
  start: CountryFeature
  target: CountryFeature
  guesses: { feature: CountryFeature; color: VoyageColor }[]
  hints: CountryFeature[]
  interactive: boolean
  style?: StyleProp<ViewStyle>
  // A tap anywhere on the map (and the corner button) calls this
  onExpand?: () => void
}

// The small map of the screen: framed on the route, and a tap opens it full screen to zoom and pan in.
// Pinching a map a third of the screen tall inside a scrolling page was cramped and fought the scroll.
export function ExpandableVoyageMap(props: Omit<VoyageMapProps, 'interactive' | 'onExpand'>) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  return (
    <>
      <VoyageMap {...props} interactive={false} onExpand={() => setOpen(true)} />
      <Modal visible={open} animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        {/* A Modal is a separate root on Android: the map's gestures need their own handler root */}
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ocean }}>
          <VoyageMap {...props} style={styles.fullScreen} interactive />
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t('mobile.a11y.close_map')}
            onPress={() => setOpen(false)}
            style={[styles.close, { top: insets.top + space.md }]}>
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </Touchable>
        </GestureHandlerRootView>
      </Modal>
    </>
  )
}

export function VoyageMap({ start, target, guesses, hints, interactive, style, onExpand }: VoyageMapProps) {
  const { t } = useTranslation()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visible = useMemo(() => [...colored.keys()].sort(), [signature])

  // A dot on each country keeps tiny ones visible.
  const overlays = useMemo<Overlay[]>(
    () =>
      GRATICULE.concat(
        [...colored].flatMap(([name, color]) => {
          const center = CENTERS.get(name)
          if (!center || color === 'hint') return []
          return [{ type: 'circle' as const, center: [center[1], center[0]] as [number, number], radius: 4, color: VOYAGE_COLORS[color] }]
        })
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  )

  // Hints are not framed: a huge country (Russia, Canada) would take over the view.
  const frame = (animate: boolean) => {
    const framedNames = [...colored].filter(([, color]) => color !== 'hint' && color !== 'red').map(([name]) => name)
    mapRef.current?.fitCountries(framedNames, { animate, maxZoom: 5 })
  }

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.geoJson.resetStyle()
    for (const layer of map.geoJson.getLayers()) {
      const color = colored.get(layer.feature.properties.ADMIN)
      if (color) layer.setStyle(styleFor(color))
    }
    frame(framed.current)
    framed.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature])

  return (
    <View
      style={[styles.frame, style]}
      // The map shrinks while the keyboard is up: frame the route again once it is measured.
      onLayout={() => {
        if (ready) requestAnimationFrame(() => frame(false))
      }}>
      <WorldMap
        ref={mapRef}
        countries={visible}
        interactive={interactive}
        showSmallCountryMarkers={false}
        overlays={overlays}
        onReady={() => setReady(true)}
        onCountryPress={onExpand && (() => onExpand())}
        onMapPress={onExpand && (() => onExpand())}
      />
      {onExpand && (
        <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.a11y.open_map')} onPress={onExpand} style={styles.expand}>
          <MaterialCommunityIcons name="arrow-expand" size={18} color={colors.text} />
        </Touchable>
      )}
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
  fullScreen: { flex: 1, height: undefined, borderRadius: 0, borderWidth: 0 },
  expand: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: `${colors.surfaceHigh}E6`,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    right: space.lg,
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
