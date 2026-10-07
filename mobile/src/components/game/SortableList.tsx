// Vertical list reordered by dragging: long-press a row (or drag its handle), then move it.
// Rows have a fixed height; the order is reported once the row is dropped.
import * as Haptics from 'expo-haptics'
import { useEffect, type ReactNode } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

type Positions = Record<string, number>

const SPRING = { damping: 22, stiffness: 260 }

function toPositions(keys: string[]): Positions {
  return Object.fromEntries(keys.map((key, index) => [key, index]))
}

function Row({
  id,
  positions,
  count,
  step,
  height,
  onDrop,
  children,
}: {
  id: string
  positions: SharedValue<Positions>
  count: number
  step: number
  height: number
  onDrop: (positions: Positions) => void
  children: ReactNode
}) {
  const top = useSharedValue(positions.value[id] * step)
  const startTop = useSharedValue(0)
  const dragging = useSharedValue(false)

  useAnimatedReaction(
    () => positions.value[id],
    (position, previous) => {
      if (position !== previous && !dragging.value) top.value = withSpring(position * step, SPRING)
    }
  )

  const pan = Gesture.Pan()
    .activateAfterLongPress(160)
    .onStart(() => {
      dragging.set(true)
      startTop.set(top.value)
      scheduleOnRN(Haptics.selectionAsync)
    })
    .onUpdate((event) => {
      top.set(Math.max(-step / 2, Math.min((count - 1) * step + step / 2, startTop.value + event.translationY)))
      const target = Math.max(0, Math.min(count - 1, Math.round(top.value / step)))
      const current = positions.value[id]
      if (target === current) return
      const next = { ...positions.value }
      for (const key in next) if (next[key] === target) next[key] = current
      next[id] = target
      positions.set(next)
      scheduleOnRN(Haptics.selectionAsync)
    })
    .onFinalize(() => {
      if (!dragging.value) return
      dragging.set(false)
      top.set(withSpring(positions.value[id] * step, SPRING))
      scheduleOnRN(onDrop, positions.value)
    })

  const style = useAnimatedStyle(() => ({
    top: top.value,
    zIndex: dragging.value ? 10 : 0,
    transform: [{ scale: withTiming(dragging.value ? 1.03 : 1, { duration: 120 }) }],
    shadowOpacity: withTiming(dragging.value ? 0.35 : 0, { duration: 120 }),
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height, shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  )
}

export function SortableList<T>({
  items,
  keyOf,
  renderItem,
  onReorder,
  rowHeight,
  gap = 0,
}: {
  items: T[]
  keyOf: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
  onReorder: (items: T[]) => void
  rowHeight: number
  gap?: number
}) {
  const keys = items.map(keyOf)
  const signature = keys.join('|')
  const positions = useSharedValue<Positions>(toPositions(keys))
  const step = rowHeight + gap

  useEffect(() => {
    positions.value = toPositions(signature.split('|'))
  }, [signature, positions])

  const onDrop = (dropped: Positions) => {
    const next = [...items].sort((a, b) => dropped[keyOf(a)] - dropped[keyOf(b)])
    if (next.map(keyOf).join('|') !== signature) onReorder(next)
  }

  return (
    <View style={{ height: items.length * step - gap }}>
      {items.map((item, index) => (
        <Row key={keys[index]} id={keys[index]} positions={positions} count={items.length} step={step} height={rowHeight} onDrop={onDrop}>
          {renderItem(item, index)}
        </Row>
      ))}
    </View>
  )
}
