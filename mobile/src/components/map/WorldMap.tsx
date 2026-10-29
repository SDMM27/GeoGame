// World map drawn with Skia. Pinch/pan on the UI thread, tap hit-testing on paths.
// Exposes a Leaflet-like handle (setView, flyTo, fitBounds, getLayers, setStyle) so the
// website's game hooks (../src/hooks) drive it unchanged.
import { Canvas, Circle, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia'
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Easing, cancelAnimation, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { colors } from '@/theme'
import {
  BASE_ZOOM,
  WORLD_SIZE,
  getBaseTiles,
  getCountryShapes,
  lodLevel,
  project,
  unproject,
  type CountryFeature,
  type CountryShape,
  type LatLngBounds,
} from './geometry'

export type LeafletStyle = { fillColor?: string; fillOpacity?: number; color?: string; weight?: number }
export type LatLng = { lat: number; lng: number }

export type MapLayer = {
  feature: CountryFeature
  setStyle: (style: LeafletStyle) => void
  getBounds: () => { getCenter: () => LatLng }
}

export type Overlay =
  | { type: 'line'; points: [number, number][]; color: string; width?: number; dashed?: boolean }
  | { type: 'circle'; center: [number, number]; radius?: number; color: string }

export type ViewOptions = { animate?: boolean; duration?: number }
type BoundsInput = LatLngBounds | [[number, number], [number, number]]
type FitOptions = ViewOptions & { padding?: number; paddingTop?: number; paddingBottom?: number; maxZoom?: number }

export type WorldMapHandle = {
  setView: (center: [number, number] | LatLng, zoom?: number, options?: ViewOptions) => void
  flyTo: (center: [number, number] | LatLng, zoom?: number, options?: ViewOptions) => void
  // paddingTop/paddingBottom: pixels hidden by overlays (a search bar, a sheet); the bounds are framed in the part between
  fitBounds: (bounds: BoundsInput, options?: FitOptions) => void
  fitCountries: (names: string[], options?: ViewOptions & { maxZoom?: number }) => void
  getCenter: () => LatLng
  getZoom: () => number
  invalidateSize: () => void
  // Leaflet GeoJSON layer stand-in
  geoJson: { getLayers: () => MapLayer[]; resetStyle: (layer?: MapLayer) => void }
}

type Props = {
  countries?: string[]
  onCountryPress?: (layer: MapLayer, latlng: LatLng) => void
  onMapPress?: (latlng: LatLng) => void
  initialView?: { center: [number, number]; zoom: number }
  overlays?: Overlay[]
  showSmallCountryMarkers?: boolean
  showBorders?: boolean
  interactive?: boolean
  // Called once the map is measured and framed: the handle's view methods work from then on.
  onReady?: () => void
  // Called after the map is resized (e.g. the Android keyboard closing), once the handle uses the new size
  onResize?: (size: { width: number; height: number }) => void
}

const MAX_SCALE = 2 ** (18 - BASE_ZOOM)
// Same rule as the website's SmallCountryCircles: a country whose biggest piece is under 2.5 degrees gets a dot,
// which goes away once that piece is about 28px wide.
const MARKER_MAX_SPAN = (2.5 * WORLD_SIZE) / 360
const MARKER_HIDE_PX = 28
const MARKER_RADIUS_PX = 8
// A tap this close to a dot's center picks its country
const MARKER_TAP_PX = 18
const TAP_TOLERANCE_PX = 16
// A finger that moves further than this is dragging the map, not tapping a country
const TAP_MAX_MOVE_PX = 10
const INERTIA_MS = 350

// The website's hooks pass Leaflet colors; map them onto the app palette.
const COLOR_MAP: Record<string, string> = {
  '#4ade80': colors.accent,
  '#22c55e': colors.accent,
  '#ff4d4d': colors.danger,
  '#ef4444': colors.danger,
  '#7b2ff7': colors.highlight,
  '#94a3b8': colors.landStroke,
}

function mapColor(color?: string) {
  if (!color) return undefined
  return COLOR_MAP[color.toLowerCase()] ?? color
}

function isVisibleFill(style?: LeafletStyle) {
  return !!style?.fillColor && style.fillColor !== 'transparent' && (style.fillOpacity ?? 0.2) > 0
}

function toLatLng(value: [number, number] | LatLng): LatLng {
  return Array.isArray(value) ? { lat: value[0], lng: value[1] } : value
}

function toBounds(bounds: BoundsInput): LatLngBounds {
  if (Array.isArray(bounds)) {
    const [[south, west], [north, east]] = bounds
    return { south, west, north, east }
  }
  return bounds
}

function isMarkerVisible(shape: CountryShape, scale: number) {
  return shape.marker.span < MARKER_MAX_SPAN && shape.marker.span * scale < MARKER_HIDE_PX
}

function wrapX(tx: number, scale: number) {
  'worklet'
  const size = WORLD_SIZE * scale
  let x = tx % size
  if (x > 0) x -= size
  return x
}

function clampY(ty: number, scale: number, height: number) {
  'worklet'
  const size = WORLD_SIZE * scale
  if (size <= height) return (height - size) / 2
  return Math.min(0, Math.max(height - size, ty))
}

// One tile of the base map, at the level of detail of the current zoom (see getBaseTiles)
const BaseTile = memo(function BaseTile({
  levels,
  level,
  border,
}: {
  levels: SkPath[]
  level: SharedValue<number>
  border?: boolean
}) {
  const path = useDerivedValue(() => levels[level.value])
  return border ? (
    <Path path={path} color={colors.landStroke} style="stroke" strokeWidth={0} />
  ) : (
    <Path path={path} color={colors.land} />
  )
})

const MapScene = memo(function MapScene({
  tiles,
  level,
  fills,
  strokes,
  thick,
  showBorders,
}: {
  tiles: SkPath[][]
  level: SharedValue<number>
  fills: { key: string; path: SkPath; color: string; opacity: number }[]
  strokes: { key: string; path: SkPath; color: string; thick: boolean }[]
  thick: SharedValue<number>
  showBorders: boolean
}) {
  return (
    <>
      {tiles.map((levels, index) => (
        <BaseTile key={index} levels={levels} level={level} />
      ))}
      {fills.map((fill) => (
        <Path key={fill.key} path={fill.path} color={fill.color} opacity={fill.opacity} />
      ))}
      {/* Width 0 is a Skia hairline: one device pixel at any zoom, drawn without re-stroking
          the whole world on every frame of a pan or pinch. */}
      {showBorders &&
        tiles.map((levels, index) => <BaseTile key={index} levels={levels} level={level} border />)}
      {strokes.map((stroke) => (
        <Path
          key={stroke.key}
          path={stroke.path}
          color={stroke.color}
          style="stroke"
          strokeWidth={stroke.thick ? thick : 0}
        />
      ))}
    </>
  )
})

const OverlayLine = memo(function OverlayLine({
  overlay,
  scale,
}: {
  overlay: Extract<Overlay, { type: 'line' }>
  scale: SharedValue<number>
}) {
  const path = useMemo(() => {
    const p = Skia.Path.Make()
    overlay.points.forEach(([lat, lng], index) => {
      const { x, y } = project(lat, lng)
      if (index === 0) p.moveTo(x, y)
      else p.lineTo(x, y)
    })
    return p
  }, [overlay.points])
  const width = useDerivedValue(() => (overlay.width ?? 3) / scale.value)
  return (
    <Path path={path} color={overlay.color} style="stroke" strokeWidth={width} strokeCap="round" strokeJoin="round" />
  )
})

const OverlayCircle = memo(function OverlayCircle({
  overlay,
  scale,
}: {
  overlay: Extract<Overlay, { type: 'circle' }>
  scale: SharedValue<number>
}) {
  const { x, y } = project(overlay.center[0], overlay.center[1])
  const r = useDerivedValue(() => (overlay.radius ?? 6) / scale.value)
  return <Circle cx={x} cy={y} r={r} color={overlay.color} />
})

export const WorldMap = forwardRef<WorldMapHandle, Props>(function WorldMap(
  {
    countries,
    onCountryPress,
    onMapPress,
    initialView,
    overlays = [],
    showSmallCountryMarkers = true,
    showBorders = true,
    interactive = true,
    onReady,
    onResize,
  },
  ref
) {
  const { t } = useTranslation()
  const shapes = useMemo(() => {
    const all = getCountryShapes()
    if (!countries) return [...all.values()]
    return countries.map((name) => all.get(name)).filter((shape): shape is CountryShape => !!shape)
  }, [countries])

  const tiles = useMemo(() => getBaseTiles(shapes), [shapes])

  const [styles, setStyles] = useState<Record<string, LeafletStyle>>({})
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoomScale, setZoomScale] = useState(1)

  const scale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const viewW = useSharedValue(0)
  const viewH = useSharedValue(0)
  // Same size, readable synchronously from JS: a shared value written in onLayout can still read 0 right after.
  const viewSize = useRef({ width: 0, height: 0 })

  const transform = useDerivedValue(() => [
    { translateX: wrapX(tx.value, scale.value) },
    { translateY: ty.value },
    { scale: scale.value },
  ])
  const level = useDerivedValue(() => lodLevel(scale.value))
  const thick = useDerivedValue(() => 2 / scale.value)
  const markerRadius = useDerivedValue(() => MARKER_RADIUS_PX / scale.value)
  const markerStroke = useDerivedValue(() => 2 / scale.value)

  // ---- Leaflet-compatible layers ------------------------------------------------
  const layers = useMemo<MapLayer[]>(
    () =>
      shapes.map((shape) => ({
        feature: shape.feature,
        setStyle: (style: LeafletStyle) =>
          setStyles((prev) => ({ ...prev, [shape.name]: { ...prev[shape.name], ...style } })),
        // Center of the biggest piece of land: the middle of the lat/lng box fell in the Atlantic for countries
        // across the dateline (Fiji, New Zealand, Russia, the United States), where a reveal left a black screen.
        getBounds: () => ({ getCenter: () => unproject(shape.marker.x, shape.marker.y) }),
      })),
    [shapes]
  )
  const layerByName = useMemo(() => new Map(layers.map((layer) => [layer.feature.properties.ADMIN, layer])), [layers])

  // Group styled countries by paint so the scene stays a handful of draw calls.
  const { fills, strokes } = useMemo(() => {
    const fillGroups = new Map<string, { key: string; path: SkPath; color: string; opacity: number }>()
    const strokeGroups = new Map<string, { key: string; path: SkPath; color: string; thick: boolean }>()
    for (const shape of shapes) {
      const style = styles[shape.name]
      if (!style) continue
      if (isVisibleFill(style)) {
        const color = mapColor(style.fillColor)!
        const opacity = Math.min(1, (style.fillOpacity ?? 0.2) * 1.8)
        const key = `${color}|${opacity}`
        if (!fillGroups.has(key)) fillGroups.set(key, { key, path: Skia.Path.Make(), color, opacity })
        fillGroups.get(key)!.path.addPath(shape.path)
      }
      const strokeColor = mapColor(style.color)
      if (strokeColor && strokeColor !== colors.landStroke) {
        const isThick = (style.weight ?? 1) >= 2
        const key = `${strokeColor}|${isThick}`
        if (!strokeGroups.has(key)) strokeGroups.set(key, { key, path: Skia.Path.Make(), color: strokeColor, thick: isThick })
        strokeGroups.get(key)!.path.addPath(shape.path)
      } else if (isVisibleFill(style) && (style.weight ?? 1) >= 2) {
        const color = mapColor(style.fillColor)!
        const key = `${color}|true`
        if (!strokeGroups.has(key)) strokeGroups.set(key, { key, path: Skia.Path.Make(), color, thick: true })
        strokeGroups.get(key)!.path.addPath(shape.path)
      }
    }
    return { fills: [...fillGroups.values()], strokes: [...strokeGroups.values()] }
  }, [shapes, styles])

  // Tiny countries get a tappable dot until zoomed in enough to see them.
  const markers = useMemo(() => {
    if (!showSmallCountryMarkers) return []
    return shapes
      .filter((shape) => isMarkerVisible(shape, zoomScale))
      .map((shape) => {
        const style = styles[shape.name]
        return {
          name: shape.name,
          x: shape.marker.x,
          y: shape.marker.y,
          color: isVisibleFill(style) ? mapColor(style!.fillColor)! : colors.text,
          styled: isVisibleFill(style),
        }
      })
  }, [shapes, styles, zoomScale, showSmallCountryMarkers])

  // ---- View control -------------------------------------------------------------
  const minScale = useCallback(() => (size.width > 0 ? size.width / WORLD_SIZE : 0.3), [size.width])

  const applyView = useCallback(
    (targetScale: number, centerX: number, centerY: number, options?: ViewOptions, focusY?: number) => {
      const { width: W, height: H } = viewSize.current
      if (!W || !H) return
      const s = Math.min(MAX_SCALE, Math.max(minScale(), targetScale))
      // Pick the horizontal copy of the target nearest to the current view to avoid long pans
      const currentCenterX = (W / 2 - tx.value) / scale.value
      const shift = Math.round((currentCenterX - centerX) / WORLD_SIZE) * WORLD_SIZE
      const nextX = W / 2 - (centerX + shift) * s
      const nextY = clampY((focusY ?? H / 2) - centerY * s, s, H)
      setZoomScale(s)
      if (options?.animate === false) {
        scale.value = s
        tx.value = nextX
        ty.value = nextY
        return
      }
      const config = { duration: options?.duration ?? 650, easing: Easing.inOut(Easing.cubic) }
      scale.value = withTiming(s, config)
      tx.value = withTiming(nextX, config)
      ty.value = withTiming(nextY, config)
    },
    [minScale, scale, tx, ty]
  )

  const setView = useCallback(
    (center: [number, number] | LatLng, zoom?: number, options?: ViewOptions) => {
      const { lat, lng } = toLatLng(center)
      const { x, y } = project(lat, lng)
      const z = zoom ?? Math.log2(scale.value) + BASE_ZOOM
      applyView(2 ** (z - BASE_ZOOM), x, y, options)
    },
    [applyView, scale]
  )

  const fitBounds = useCallback(
    (input: BoundsInput, options?: FitOptions) => {
      const b = toBounds(input)
      const topLeft = project(b.north, b.west)
      const bottomRight = project(b.south, b.east)
      const padding = options?.padding ?? 48
      const top = options?.paddingTop ?? 0
      const visibleHeight = Math.max(1, viewSize.current.height - top - (options?.paddingBottom ?? 0))
      const w = Math.max(1, bottomRight.x - topLeft.x)
      const h = Math.max(1, bottomRight.y - topLeft.y)
      let s = Math.min((viewSize.current.width - padding * 2) / w, Math.max(1, visibleHeight - padding * 2) / h)
      if (options?.maxZoom != null) s = Math.min(s, 2 ** (options.maxZoom - BASE_ZOOM))
      applyView(s, topLeft.x + w / 2, topLeft.y + h / 2, options, top + visibleHeight / 2)
    },
    [applyView]
  )

  const fitCountries = useCallback(
    (names: string[], options?: ViewOptions & { maxZoom?: number }) => {
      const all = getCountryShapes()
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      names.forEach((name) => {
        const shape = all.get(name)
        if (!shape) return
        minX = Math.min(minX, shape.x)
        minY = Math.min(minY, shape.y)
        maxX = Math.max(maxX, shape.x + shape.width)
        maxY = Math.max(maxY, shape.y + shape.height)
      })
      if (!Number.isFinite(minX)) return
      const padding = 48
      let s = Math.min(
        (viewSize.current.width - padding * 2) / Math.max(1, maxX - minX),
        (viewSize.current.height - padding * 2) / Math.max(1, maxY - minY)
      )
      if (options?.maxZoom != null) s = Math.min(s, 2 ** (options.maxZoom - BASE_ZOOM))
      applyView(s, (minX + maxX) / 2, (minY + maxY) / 2, options)
    },
    [applyView]
  )

  useImperativeHandle(
    ref,
    () => ({
      setView,
      flyTo: setView,
      fitBounds,
      fitCountries,
      getCenter: () => {
        const { width, height } = viewSize.current
        const currentScale = scale.value
        return unproject(
          (width / 2 - wrapX(tx.value, currentScale)) / currentScale,
          (height / 2 - ty.value) / currentScale
        )
      },
      getZoom: () => Math.log2(scale.value) + BASE_ZOOM,
      invalidateSize: () => {},
      geoJson: {
        getLayers: () => layers,
        resetStyle: (layer?: MapLayer) => {
          if (!layer) setStyles({})
          else
            setStyles((prev) => {
              const next = { ...prev }
              delete next[layer.feature.properties.ADMIN]
              return next
            })
        },
      },
    }),
    [setView, fitBounds, fitCountries, layers, scale]
  )

  // Initial framing once the canvas is measured
  const framed = useRef(false)
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    viewSize.current = { width, height }
    viewW.value = width
    viewH.value = height
    setSize({ width, height })
    onResize?.({ width, height })
  }
  useEffect(() => {
    if (framed.current || !size.width || !size.height) return
    framed.current = true
    if (initialView) setView(initialView.center, initialView.zoom, { animate: false })
    else setView([25, 10], 2.4, { animate: false })
    onReady?.()
  }, [size, initialView, setView, applyView, onReady])

  // ---- Hit testing ---------------------------------------------------------------
  const handleTap = useCallback(
    (sx: number, sy: number) => {
      const s = scale.value
      let mx = (sx - wrapX(tx.value, s)) / s
      const my = (sy - ty.value) / s
      mx = ((mx % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE
      const latlng = unproject(mx, my)

      let hit: CountryShape | null = null
      // Dots sit on top of the map, as on the website: a tap on one wins
      if (showSmallCountryMarkers) {
        let best = MARKER_TAP_PX / s
        for (const shape of shapes) {
          if (!isMarkerVisible(shape, s)) continue
          const dx = Math.abs(shape.marker.x - mx)
          const distance = Math.hypot(Math.min(dx, WORLD_SIZE - dx), shape.marker.y - my)
          if (distance <= best) {
            best = distance
            hit = shape
          }
        }
      }
      if (!hit) for (const shape of shapes) {
        if (mx < shape.x || mx > shape.x + shape.width || my < shape.y || my > shape.y + shape.height) continue
        if (shape.path.contains(mx, my)) {
          if (!hit || shape.width * shape.height < hit.width * hit.height) hit = shape
        }
      }
      if (!hit) {
        // Forgiving taps for small islands/microstates
        const tolerance = TAP_TOLERANCE_PX / s
        let best = Infinity
        for (const shape of shapes) {
          if (Math.max(shape.width, shape.height) * s > TAP_TOLERANCE_PX * 2) continue
          const dx = Math.max(shape.x - mx, 0, mx - (shape.x + shape.width))
          const dy = Math.max(shape.y - my, 0, my - (shape.y + shape.height))
          const distance = Math.hypot(dx, dy)
          if (distance <= tolerance && distance < best) {
            best = distance
            hit = shape
          }
        }
      }
      if (hit && onCountryPress) onCountryPress(layerByName.get(hit.name)!, latlng)
      else onMapPress?.(latlng)
    },
    [shapes, layerByName, onCountryPress, onMapPress, scale, tx, ty, showSmallCountryMarkers]
  )

  // ---- Gestures ------------------------------------------------------------------
  const start = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0 })
  // Pinch anchor: the view, focal point, gesture scale and finger count it was taken at (see the pinch below)
  const pinchFrom = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0, es: 1, n: 0 })
  const pinching = useSharedValue(false)
  const minScaleValue = useDerivedValue(() => (viewW.value > 0 ? viewW.value / WORLD_SIZE : 0.3))
  // While the map still glides after a pan, a touch only stops it. Zooming never counts as a tap.
  const glideUntil = useSharedValue(0)
  const ignoreTap = useSharedValue(false)

  const pan = Gesture.Pan()
    .enabled(interactive)
    .maxPointers(1)
    .onStart(() => {
      start.value = { scale: scale.value, tx: tx.value, ty: ty.value, fx: 0, fy: 0 }
    })
    .onUpdate((event) => {
      if (pinching.value) return
      tx.value = start.value.tx + event.translationX
      ty.value = clampY(start.value.ty + event.translationY, scale.value, viewH.value)
    })
    .onEnd((event) => {
      // A second finger ends the pan: no glide, it would drag the map away while zooming
      if (pinching.value) return
      // Light inertia
      const targetX = tx.value + event.velocityX * 0.12
      const targetY = clampY(ty.value + event.velocityY * 0.12, scale.value, viewH.value)
      tx.value = withTiming(targetX, { duration: INERTIA_MS, easing: Easing.out(Easing.cubic) })
      ty.value = withTiming(targetY, { duration: INERTIA_MS, easing: Easing.out(Easing.cubic) })
      glideUntil.value = Date.now() + INERTIA_MS
    })

  const pinch = Gesture.Pinch()
    .enabled(interactive)
    .onStart(() => {
      ignoreTap.value = true
      pinching.value = true
      cancelAnimation(tx)
      cancelAnimation(ty)
      glideUntil.value = 0
      pinchFrom.value = { ...pinchFrom.value, n: 0 }
    })
    .onUpdate((event) => {
      // Anchor on the first update, and again whenever a finger is added or lifted: Android reports a stale focal
      // point at the start, and the focal point jumps to the remaining finger, which shifted the map.
      if (event.numberOfPointers !== pinchFrom.value.n) {
        pinchFrom.value = {
          scale: scale.value,
          tx: tx.value,
          ty: ty.value,
          fx: event.focalX,
          fy: event.focalY,
          es: event.scale || 1,
          n: event.numberOfPointers,
        }
        return
      }
      const from = pinchFrom.value
      const s = Math.min(MAX_SCALE, Math.max(minScaleValue.value, from.scale * (event.scale / from.es)))
      const ratio = s / from.scale
      scale.value = s
      tx.value = event.focalX - (from.fx - from.tx) * ratio
      ty.value = clampY(event.focalY - (from.fy - from.ty) * ratio, s, viewH.value)
    })
    .onEnd(() => {
      scheduleOnRN(setZoomScale, scale.value)
    })
    .onFinalize(() => {
      pinching.value = false
    })

  const tap = Gesture.Tap()
    // A static map still names the country it is tapped on when the screen asks for it
    .enabled(interactive || !!onCountryPress)
    .maxDuration(400)
    .maxDistance(TAP_MAX_MOVE_PX)
    .onBegin(() => {
      ignoreTap.value = Date.now() < glideUntil.value
      if (ignoreTap.value) {
        cancelAnimation(tx)
        cancelAnimation(ty)
        glideUntil.value = 0
      }
    })
    .onEnd((event, success) => {
      if (success && !ignoreTap.value) scheduleOnRN(handleTap, event.x, event.y)
    })

  const gesture = Gesture.Simultaneous(pinch, pan, tap)

  const scene = (
    <>
      <MapScene tiles={tiles} level={level} fills={fills} strokes={strokes} thick={thick} showBorders={showBorders} />
      {markers.map((marker) => (
        <Group key={marker.name}>
          <Circle cx={marker.x} cy={marker.y} r={markerRadius} color={marker.styled ? marker.color : '#ffffff'} opacity={marker.styled ? 0.6 : 0.15} />
          <Circle cx={marker.x} cy={marker.y} r={markerRadius} color={marker.color} style="stroke" strokeWidth={markerStroke} opacity={marker.styled ? 1 : 0.8} />
        </Group>
      ))}
      {overlays.map((overlay, index) =>
        overlay.type === 'line' ? (
          <OverlayLine key={index} overlay={overlay} scale={scale} />
        ) : (
          <OverlayCircle key={index} overlay={overlay} scale={scale} />
        )
      )}
    </>
  )

  return (
    <GestureDetector gesture={gesture}>
      <View accessible accessibilityRole="image" accessibilityLabel={t('mobile.a11y.world_map')} style={mapStyles.container} onLayout={onLayout}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={transform}>
            {scene}
            <Group transform={[{ translateX: WORLD_SIZE }]}>{scene}</Group>
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  )
})

const mapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ocean, overflow: 'hidden' },
})
