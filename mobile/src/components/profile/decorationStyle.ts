// Native drawing of a profile decoration (see @shared/utils/decorations): the border of a frame ring.
import type { ViewStyle } from 'react-native'

export type Frame = { color: string; style: 'solid' | 'dashed' | 'double' } | null

// Widths of the ring; "double" is a thicker solid line. The widest one sizes the room reserved around a decorated avatar.
export const RING_WIDTH = 2.5
export const RING_WIDTH_DOUBLE = 4

export function ringBorder(frame: Frame): Pick<ViewStyle, 'borderColor' | 'borderStyle' | 'borderWidth'> | null {
  if (!frame) return null
  return {
    borderColor: frame.color,
    borderStyle: frame.style === 'dashed' ? 'dashed' : 'solid',
    borderWidth: frame.style === 'double' ? RING_WIDTH_DOUBLE : RING_WIDTH,
  }
}
