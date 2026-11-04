// An empire redrawn on the world map, with buttons through its stages. Tapping a territory tells which stage won it.
// The land is the base map of WorldMap (same projection, same tiles), the territories (src/data/empires, traced by
// scripts/trace-empire.py) are Skia paths on top. Pan, pinch and the + / - / reset buttons, framed on the empire's centre.
// The map sits above the sheet's scrolling text, so its gestures never fight the text. Works on Expo web too, like WorldMap.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Canvas, Group, Path, type SkPath } from '@shopify/react-native-skia'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { loadEmpireText } from '@shared/data/empireTexts'
import { EMPIRES, shownStages } from '@shared/data/empires'

import { BASE_ZOOM, WORLD_SIZE, featurePath, getBaseTiles, getCountryShapes, lodLevel, project } from '@/components/map/geometry'
import { BaseTile } from '@/components/map/WorldMap'
import { Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Stage = { id: string; color: string }
type Empire = { center: [number, number]; zoom: number; cumulative?: boolean; stages: Stage[]; load: () => Promise<unknown> }
type StageText = { label?: string; title?: string; text?: string }
type EmpireText = { stages: Record<string, StageText>; note?: string }
type Territories = { features: { properties: { stage: string }; geometry: unknown }[] }

// Same limits as the website (Leaflet zoom 3 to 7), in the scale of the base map
const MIN_SCALE = 2 ** (3 - BASE_ZOOM)
const MAX_SCALE = 2 ** (7 - BASE_ZOOM)
const STEP = 1.5
// A finger that moves further than this is dragging the map, not tapping a territory
const TAP_MAX_MOVE_PX = 10

export const clampScale = (scale: number) => {
  'worklet'
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** A translation kept so that the viewport stays inside the world drawn at `scale` (top-left origin). */
export function clampAxis(value: number, view: number, scale: number) {
  'worklet'
  return Math.min(0, Math.max(view - WORLD_SIZE * scale, value))
}

/** The scale and translation that put `center` ([lat, lon]) in the middle of a viewport, at a Leaflet-style zoom. */
export function frameOn(center: [number, number], zoom: number, width: number, height: number) {
  const scale = clampScale(2 ** (zoom - BASE_ZOOM))
  const { x, y } = project(center[0], center[1])
  return { scale, tx: clampAxis(width / 2 - x * scale, width, scale), ty: clampAxis(height / 2 - y * scale, height, scale) }
}

/** The topmost shown stage whose territory holds the map point (x, y), if any. */
export function stageAt(paths: Map<string, Pick<SkPath, 'contains'>>, shown: string[], x: number, y: number) {
  for (let index = shown.length - 1; index >= 0; index--) {
    if (paths.get(shown[index])?.contains(x, y)) return shown[index]
  }
  return null
}

export function EmpireMap({ id, maxHeight }: { id: string; maxHeight?: number }) {
  const { t, i18n } = useTranslation()
  const empire = (EMPIRES as Record<string, Empire>)[id]
  const [step, setStep] = useState(empire.stages.length - 1)
  const [picked, setPicked] = useState<string | null>(null)
  const [territories, setTerritories] = useState<{ id: string; data: Territories } | null>(null)
  const [loadedText, setLoadedText] = useState<{ key: string; text: EmpireText } | null>(null)
  const textKey = `${id}:${i18n.language}`
  const texts: EmpireText = loadedText?.key === textKey ? loadedText.text : { stages: {} }

  useEffect(() => {
    let cancelled = false
    empire.load().then(
      (module) => {
        const data = ((module as { default?: unknown }).default ?? module) as Territories
        if (!cancelled) setTerritories({ id, data })
      },
      () => {}
    )
    return () => {
      cancelled = true
    }
  }, [empire, id])
  useEffect(() => {
    let cancelled = false
    ;(loadEmpireText(id, i18n.language) as Promise<EmpireText>).then((text) => {
      if (!cancelled) setLoadedText({ key: `${id}:${i18n.language}`, text })
    })
    return () => {
      cancelled = true
    }
  }, [id, i18n.language])

  // The land, as drawn by the world map (its tiles are cached: opening this costs little once a game has run)
  const tiles = useMemo(() => getBaseTiles([...getCountryShapes().values()]), [])
  const paths = useMemo(() => {
    const result = new Map<string, SkPath>()
    if (territories?.id !== id) return result
    for (const feature of territories.data.features) {
      const path = featurePath(feature as never)
      if (path) result.set(feature.properties.stage, path)
    }
    return result
  }, [territories, id])

  const shown = shownStages(empire, step).filter((stage: Stage) => paths.has(stage.id)) as Stage[]
  const stage = empire.stages.find((candidate) => candidate.id === picked) ?? empire.stages[step]
  const info = texts.stages[stage.id]
  const go = (index: number) => {
    setStep(index)
    setPicked(null)
  }

  // ---- View: scale and translation of the map, set once the viewport is measured
  const scale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const viewW = useSharedValue(0)
  const viewH = useSharedValue(0)
  // Same size, readable synchronously from JS (a shared value written in onLayout can still read 0 right after)
  const viewSize = useRef({ width: 0, height: 0 })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const from = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0, es: 1, n: 0 })

  const transform = useDerivedValue(() => [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }])
  const level = useDerivedValue(() => lodLevel(scale.get()))
  const hairline = useDerivedValue(() => 1 / scale.get())

  const frame = useCallback(
    (animate: boolean) => {
      const next = frameOn(empire.center, empire.zoom, viewSize.current.width, viewSize.current.height)
      if (animate) {
        scale.set(withTiming(next.scale, { duration: 180 }))
        tx.set(withTiming(next.tx, { duration: 180 }))
        ty.set(withTiming(next.ty, { duration: 180 }))
      } else {
        scale.set(next.scale)
        tx.set(next.tx)
        ty.set(next.ty)
      }
    },
    [empire, scale, tx, ty]
  )
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    viewSize.current = { width, height }
    viewW.set(width)
    viewH.set(height)
    setSize({ width, height })
  }
  const framed = useRef('')
  useEffect(() => {
    if (!size.width || !size.height || framed.current === id) return
    framed.current = id
    frame(false)
  }, [size, id, frame])

  // Zoom to `next` about the point (px, py) of the viewport, animated
  const zoomTo = (next: number) => {
    const s = clampScale(next)
    const k = s / scale.get()
    const px = viewW.get() / 2
    const py = viewH.get() / 2
    scale.set(withTiming(s, { duration: 180 }))
    tx.set(withTiming(clampAxis(px - (px - tx.get()) * k, viewW.get(), s), { duration: 180 }))
    ty.set(withTiming(clampAxis(py - (py - ty.get()) * k, viewH.get(), s), { duration: 180 }))
  }

  // ---- Tap: the stage under the finger
  const shownIds = shown.map((item) => item.id)
  const handleTap = (sx: number, sy: number) => {
    const hit = stageAt(paths, shownIds, (sx - tx.get()) / scale.get(), (sy - ty.get()) / scale.get())
    if (hit) setPicked(hit)
  }

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      from.set({ ...from.get(), scale: scale.get(), tx: tx.get(), ty: ty.get() })
    })
    .onUpdate((event) => {
      tx.set(clampAxis(from.get().tx + event.translationX, viewW.get(), scale.get()))
      ty.set(clampAxis(from.get().ty + event.translationY, viewH.get(), scale.get()))
    })
  const pinch = Gesture.Pinch().onUpdate((event) => {
    // Anchor on the first update, and again whenever a finger is added or lifted (the focal point jumps)
    if (event.numberOfPointers !== from.get().n) {
      from.set({ scale: scale.get(), tx: tx.get(), ty: ty.get(), fx: event.focalX, fy: event.focalY, es: event.scale || 1, n: event.numberOfPointers })
      return
    }
    const start = from.get()
    const s = clampScale(start.scale * (event.scale / start.es))
    const k = s / start.scale
    scale.set(s)
    tx.set(clampAxis(event.focalX - (start.fx - start.tx) * k, viewW.get(), s))
    ty.set(clampAxis(event.focalY - (start.fy - start.ty) * k, viewH.get(), s))
  })
  const tap = Gesture.Tap()
    .maxDuration(400)
    .maxDistance(TAP_MAX_MOVE_PX)
    .onEnd((event, success) => {
      if (success) scheduleOnRN(handleTap, event.x, event.y)
    })
  const gesture = Gesture.Simultaneous(pinch, pan, tap)

  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.frame, { maxHeight }]}>
        <GestureDetector gesture={gesture}>
          <View
            testID="empire-map"
            accessible
            accessibilityRole="image"
            accessibilityLabel={t(`scrolls.title_${id}`)}
            style={styles.viewport}
            onLayout={onLayout}
            // Web: data-geomap, where public/index.html keeps Safari's page zoom out of the map's pinch
            {...({ dataSet: { geomap: '' } } as object)}>
            <Canvas style={StyleSheet.absoluteFill}>
              <Group transform={transform}>
                {tiles.map((levels, index) => (
                  <BaseTile key={`land-${index}`} levels={levels} level={level} />
                ))}
                {shown.map((item) => (
                  <Path key={item.id} path={paths.get(item.id)!} color={item.color} opacity={picked === item.id ? 0.95 : 0.7} />
                ))}
                {tiles.map((levels, index) => (
                  <BaseTile key={`border-${index}`} levels={levels} level={level} border />
                ))}
                {shown.map((item) => (
                  <Path key={`edge-${item.id}`} path={paths.get(item.id)!} color="#141a2e" style="stroke" strokeWidth={hairline} />
                ))}
              </Group>
            </Canvas>
          </View>
        </GestureDetector>
        <View style={styles.controls} pointerEvents="box-none">
          <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.zoom_in')} onPress={() => zoomTo(scale.get() * STEP)} style={styles.control}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
          </Touchable>
          <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.zoom_out')} onPress={() => zoomTo(scale.get() / STEP)} style={styles.control}>
            <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
          </Touchable>
          <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.zoom_reset')} onPress={() => frame(true)} style={styles.control}>
            <MaterialCommunityIcons name="fit-to-screen-outline" size={20} color={colors.text} />
          </Touchable>
        </View>
      </View>
      <View style={styles.steps} accessibilityLabel={t('scrolls.empire_period')}>
        {empire.stages.map((item, index) => {
          const on = empire.cumulative === false ? index === step : index <= step
          return (
            <Touchable
              key={item.id}
              testID={`empire-stage-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === step }}
              onPress={() => go(index)}
              style={styles.stepButton}>
              <View style={[styles.dot, { backgroundColor: item.color, opacity: on ? 1 : 0.35 }]} />
              <Text variant="bodyStrong" color={on ? colors.text : colors.textMuted}>
                {texts.stages[item.id]?.label ?? item.id}
              </Text>
            </Touchable>
          )
        })}
      </View>
      {info && (info.title || info.text) ? (
        <View style={[styles.info, { borderLeftColor: stage.color }]}>
          {info.title ? <Text variant="bodyStrong">{info.title}</Text> : null}
          {info.text ? <Text variant="body">{info.text}</Text> : null}
        </View>
      ) : null}
      {texts.note ? (
        <Text variant="caption" style={{ fontSize: 12 }}>
          {texts.note}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ocean },
  viewport: { flex: 1, overflow: 'hidden' },
  controls: { position: 'absolute', right: space.sm, bottom: space.sm, flexDirection: 'row', gap: 6 },
  control: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: 'rgba(11,16,32,0.85)', borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.xs },
  stepButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6, minHeight: 40 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, borderLeftWidth: 3 },
})
