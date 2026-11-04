// The large map of a scroll with zoom and pan: pointer events (drag, pinch), mouse wheel, double click, the + / - / reset
// buttons and the arrow keys. The map is moved with a CSS transform and clamped (scrollMapView.js) so that all of it can be
// reached, even a very wide one.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IDENTITY, clampView, pinchOf, zoomAt } from '../../utils/scrollMapView'
import ScrollImage from './ScrollImage'
import './Scrolls.css'

const STEP = 1.5
const KEY_PAN = 48
// The viewport follows the map's shape, within these limits (width / height)
const MIN_RATIO = 0.75
const MAX_RATIO = 3

export default function ScrollMap({ id, alt }) {
  const { t } = useTranslation()
  const box = useRef(null)
  const [view, setView] = useState(IDENTITY)
  const [ratio, setRatio] = useState(1.5)
  const viewRef = useRef(IDENTITY)
  const pointers = useRef(new Map())
  const start = useRef(null)

  const apply = useCallback((next) => {
    viewRef.current = next
    setView(next)
  }, [])
  const size = () => {
    const rect = box.current.getBoundingClientRect()
    return { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
  }
  // The point of the viewport under a client position
  const local = (event) => {
    const { left, top } = size()
    return { x: event.clientX - left, y: event.clientY - top }
  }

  // Starts (or restarts, when a finger is added or lifted) the gesture the pointers down make
  const begin = () => {
    const points = [...pointers.current.values()]
    if (points.length === 1) start.current = { kind: 'pan', view: viewRef.current, x: points[0].x, y: points[0].y }
    else if (points.length >= 2) start.current = { kind: 'pinch', view: viewRef.current, ...pinchOf(points[0], points[1]) }
    else start.current = null
  }

  const onPointerDown = (event) => {
    if (event.button > 0) return
    pointers.current.set(event.pointerId, local(event))
    event.currentTarget.setPointerCapture?.(event.pointerId)
    begin()
  }
  const onPointerMove = (event) => {
    if (!pointers.current.has(event.pointerId) || !start.current) return
    pointers.current.set(event.pointerId, local(event))
    const { width, height } = size()
    const points = [...pointers.current.values()]
    const from = start.current
    if (from.kind === 'pan') {
      apply(clampView({ scale: from.view.scale, x: from.view.x + points[0].x - from.x, y: from.view.y + points[0].y - from.y }, width, height))
    } else if (points.length >= 2) {
      const now = pinchOf(points[0], points[1])
      const zoomed = zoomAt(from.view, from.view.scale * (now.distance / from.distance), from.x, from.y, width, height)
      apply(clampView({ ...zoomed, x: zoomed.x + now.x - from.x, y: zoomed.y + now.y - from.y }, width, height))
    }
  }
  const onPointerEnd = (event) => {
    if (!pointers.current.delete(event.pointerId)) return
    begin()
  }

  const zoomBy = (factor, at) => {
    const { width, height } = size()
    const point = at ?? { x: width / 2, y: height / 2 }
    apply(zoomAt(viewRef.current, viewRef.current.scale * factor, point.x, point.y, width, height))
  }

  // Non-passive: the page must not scroll or zoom while the wheel zooms the map
  useEffect(() => {
    const node = box.current
    const onWheel = (event) => {
      event.preventDefault()
      const { left, top } = node.getBoundingClientRect()
      zoomBy(Math.exp(-event.deltaY * 0.0015), { x: event.clientX - left, y: event.clientY - top })
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  })

  // The limits follow the viewport when the window is resized
  useEffect(() => {
    const onResize = () => apply(IDENTITY)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [apply])

  const onDoubleClick = (event) => {
    if (viewRef.current.scale > 1.01) apply(IDENTITY)
    else zoomBy(3, local(event))
  }
  const onKeyDown = (event) => {
    const { width, height } = size()
    const move = (dx, dy) => apply(clampView({ ...viewRef.current, x: viewRef.current.x + dx, y: viewRef.current.y + dy }, width, height))
    const handled = {
      '+': () => zoomBy(STEP),
      '=': () => zoomBy(STEP),
      '-': () => zoomBy(1 / STEP),
      '0': () => apply(IDENTITY),
      ArrowLeft: () => move(KEY_PAN, 0),
      ArrowRight: () => move(-KEY_PAN, 0),
      ArrowUp: () => move(0, KEY_PAN),
      ArrowDown: () => move(0, -KEY_PAN),
    }[event.key]
    if (!handled) return
    event.preventDefault()
    handled()
  }
  const onLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget
    if (naturalWidth > 0 && naturalHeight > 0) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, naturalWidth / naturalHeight)))
  }

  // A button must not start a drag of the map
  const stop = (event) => event.stopPropagation()
  return (
    <div className="scroll-map-wrap">
      <div
        ref={box}
        className="scroll-map"
        style={{ aspectRatio: String(ratio) }}
        tabIndex={0}
        role="group"
        aria-label={alt}
        aria-describedby="scroll-map-hint"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        <div className="scroll-map-stage" data-testid="scroll-map-stage" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
          <ScrollImage id={id} size="large" alt={alt} className="scroll-map-image" onLoad={onLoad} />
        </div>
        <div className="scroll-map-controls" onPointerDown={stop} onDoubleClick={stop}>
          <button type="button" aria-label={t('scrolls.zoom_in')} onClick={() => zoomBy(STEP)}>+</button>
          <button type="button" aria-label={t('scrolls.zoom_out')} onClick={() => zoomBy(1 / STEP)}>−</button>
          <button type="button" aria-label={t('scrolls.zoom_reset')} onClick={() => apply(IDENTITY)}>⤢</button>
        </div>
      </div>
      <small id="scroll-map-hint" className="scroll-map-hint">{t('scrolls.map_hint')}</small>
    </div>
  )
}
