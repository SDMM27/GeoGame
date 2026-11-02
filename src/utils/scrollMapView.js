// Zoom and pan of a scroll's map, as pure functions shared by the website's viewer (components/scrolls/ScrollMap.jsx).
// A view is { scale, x, y }: the map, drawn in the viewport at scale 1, is scaled by `scale` from its top-left corner and
// moved by (x, y) pixels. The viewport is always fully covered, so every part of the map can be reached by panning, however
// stretched it is (the Turin papyrus is 5.5 times wider than tall).
export const MIN_SCALE = 1
export const MAX_SCALE = 8
export const IDENTITY = { scale: 1, x: 0, y: 0 }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** `view` kept inside the limits for a viewport of `width` x `height` pixels. */
export function clampView(view, width, height) {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE)
  return { scale, x: clamp(view.x, width - width * scale, 0), y: clamp(view.y, height - height * scale, 0) }
}

/** `view` zoomed to `scale` so that the point (px, py) of the viewport stays where it is. */
export function zoomAt(view, scale, px, py, width, height) {
  const next = clamp(scale, MIN_SCALE, MAX_SCALE)
  const ratio = next / view.scale
  return clampView({ scale: next, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, width, height)
}

/** Distance and middle point of two pointers ({ x, y }). */
export function pinchOf(a, b) {
  return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
