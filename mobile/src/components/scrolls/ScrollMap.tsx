// The large map of a scroll with zoom and pan: pinch, drag, double tap and the + / - / reset buttons (the buttons also
// serve the web, where there is no pinch). The map is moved by a transform and clamped so that all of it can be reached,
// even a very wide one (the Turin papyrus is 5.5 times wider than tall). Works on Expo web too (gesture handler).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Text, Touchable } from '@/components/ui'
import { ScrollImage, type ImageSize } from '@/components/scrolls/ScrollImage'
import { makeStyles, radius, space, useColors } from '@/theme'

export const MIN_SCALE = 1
export const MAX_SCALE = 8
const STEP = 1.5
// The viewport follows the map's shape, within these limits (width / height)
const MIN_RATIO = 0.75
const MAX_RATIO = 3

/** A translation kept so that the viewport stays covered by the map scaled by `scale` (top-left origin). */
export function clampAxis(value: number, size: number, scale: number) {
  'worklet'
  return Math.min(0, Math.max(size - size * scale, value))
}

export const clampScale = (scale: number) => {
  'worklet'
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function ScrollMap({ id, label, maxHeight }: { id: string; label: string; maxHeight?: number }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const [ratio, setRatio] = useState(1.5)
  const scale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const viewW = useSharedValue(0)
  const viewH = useSharedValue(0)
  const from = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0, es: 1, n: 0 })

  const onLayout = (event: LayoutChangeEvent) => {
    viewW.set(event.nativeEvent.layout.width)
    viewH.set(event.nativeEvent.layout.height)
  }
  const onLoadSize = ({ width, height }: ImageSize) => {
    if (width > 0 && height > 0) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height)))
  }

  // Zoom to `next` about the point (px, py) of the viewport, animated.
  const zoomTo = (next: number, px = viewW.get() / 2, py = viewH.get() / 2) => {
    const s = clampScale(next)
    const k = s / scale.get()
    scale.set(withTiming(s, { duration: 180 }))
    tx.set(withTiming(clampAxis(px - (px - tx.get()) * k, viewW.get(), s), { duration: 180 }))
    ty.set(withTiming(clampAxis(py - (py - ty.get()) * k, viewH.get(), s), { duration: 180 }))
  }
  const reset = () => {
    scale.set(withTiming(1, { duration: 180 }))
    tx.set(withTiming(0, { duration: 180 }))
    ty.set(withTiming(0, { duration: 180 }))
  }

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      from.set({ ...from.get(), scale: scale.get(), tx: tx.get(), ty: ty.get() })
    })
    .onUpdate((event) => {
      const start = from.get()
      tx.set(clampAxis(start.tx + event.translationX, viewW.get(), scale.get()))
      ty.set(clampAxis(start.ty + event.translationY, viewH.get(), scale.get()))
    })

  const pinch = Gesture.Pinch().onUpdate((event) => {
    // Anchor on the first update, and again whenever a finger is added or lifted
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

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event, success) => {
      if (!success) return
      if (scale.get() > 1.01) {
        scale.set(withTiming(1, { duration: 180 }))
        tx.set(withTiming(0, { duration: 180 }))
        ty.set(withTiming(0, { duration: 180 }))
      } else {
        const s = 3
        scale.set(withTiming(s, { duration: 180 }))
        tx.set(withTiming(clampAxis(event.x - event.x * s, viewW.get(), s), { duration: 180 }))
        ty.set(withTiming(clampAxis(event.y - event.y * s, viewH.get(), s), { duration: 180 }))
      }
    })

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap)
  // React Native scales about the center: translate so that the top-left corner is the origin
  const stageStyle = useAnimatedStyle(() => {
    const s = scale.get()
    return {
      transform: [{ translateX: tx.get() + (viewW.get() * (s - 1)) / 2 }, { translateY: ty.get() + (viewH.get() * (s - 1)) / 2 }, { scale: s }],
    }
  })

  return (
    <View style={{ gap: space.xs }}>
      <View style={[styles.frame, { aspectRatio: ratio, maxHeight }]}>
        <GestureDetector gesture={gesture}>
          <View
            testID="scroll-map"
            accessible
            accessibilityRole="image"
            accessibilityLabel={label}
            style={styles.viewport}
            onLayout={onLayout}
            // Web: data-geomap, where public/index.html keeps Safari's page zoom out of the map's pinch
            {...({ dataSet: { geomap: '' } } as object)}>
            <Animated.View style={[StyleSheet.absoluteFill, stageStyle]}>
              <ScrollImage id={id} size="large" contentFit="contain" onLoadSize={onLoadSize} style={styles.image} />
            </Animated.View>
          </View>
        </GestureDetector>
        <View style={styles.controls} pointerEvents="box-none">
          <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.zoom_in')} onPress={() => zoomTo(scale.get() * STEP)} style={styles.control}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
          </Touchable>
          <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.zoom_out')} onPress={() => zoomTo(scale.get() / STEP)} style={styles.control}>
            <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
          </Touchable>
          <Touchable accessibilityRole="button" accessibilityLabel={t('scrolls.zoom_reset')} onPress={reset} style={styles.control}>
            <MaterialCommunityIcons name="fit-to-screen-outline" size={20} color={colors.text} />
          </Touchable>
        </View>
      </View>
      <Text variant="caption" style={{ fontSize: 12 }}>
        {t('scrolls.map_hint')}
      </Text>
    </View>
  )
}

// The parchment image sits on a dark backdrop in both themes: the paper is fixed
const useStyles = makeStyles((colors) => ({
  frame: { width: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#1A1610' },
  viewport: { flex: 1, overflow: 'hidden' },
  // Explicit size: react-native-web draws an absolute-fill Image at its natural size
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  controls: { position: 'absolute', right: space.sm, bottom: space.sm, flexDirection: 'row', gap: 6 },
  control: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: `${colors.surface}D9`, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
}))
