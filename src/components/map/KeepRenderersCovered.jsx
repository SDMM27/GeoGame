import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

// Leaflet redraws its vector layers (SVG and canvas renderers) only when a move ends: it draws a margin around the
// view (the renderer's `padding`) and stops there. A long drag, or a fling, goes past that margin and shows empty
// ocean until the user lets go. This redraws a renderer while the map moves, as soon as the view nears the edge of
// what it has drawn. Skipped during zoom animations (Leaflet scales the drawing then, and redraws at the end).
export default function KeepRenderersCovered() {
  const map = useMap()

  useEffect(() => {
    // Runs on every move event: only a few point comparisons, and a redraw only when the view nears the edge
    const onMove = () => {
      if (map._animatingZoom) return
      const size = map.getSize()
      const margin = size.multiplyBy(0.1)
      const topLeft = map.containerPointToLayerPoint([0, 0]).subtract(margin)
      const bottomRight = map.containerPointToLayerPoint(size).add(margin)
      const renderers = new Set()
      map.eachLayer((layer) => { if (layer._renderer) renderers.add(layer._renderer) })
      renderers.forEach((renderer) => {
        const bounds = renderer._bounds
        // Bounds from another zoom level are in other units: the move's end redraws those anyway
        if (!bounds || renderer._zoom !== map.getZoom()) return
        if (!bounds.contains(topLeft) || !bounds.contains(bottomRight)) renderer._update()
      })
    }

    map.on('move', onMove)
    return () => { map.off('move', onMove) }
  }, [map])

  return null
}
