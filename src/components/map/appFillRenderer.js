import L from 'leaflet'
import { MAP_COLORS } from '../../utils/mapColors'

const hexToRgb = (hex) => {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}
const LAND_RGB = hexToRgb(MAP_COLORS.land)

// The color of `fillColor` drawn with `opacity` over the land
const overLand = (fillColor, opacity) => {
  if (!opacity || typeof fillColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(fillColor)) return MAP_COLORS.land
  const rgb = hexToRgb(fillColor)
  return `rgb(${LAND_RGB.map((land, i) => Math.round(land + (rgb[i] - land) * opacity)).join(',')})`
}

// Web Mercator of a LatLng, kept on it: a zoom then only scales and shifts it instead of redoing the
// trigonometry for the ~200 000 vertices of the countries.
const projectCached = (map, latlng, scale, origin) => {
  const crs = map.options.crs
  latlng._mercator ??= crs.projection.project(latlng)
  return crs.transformation.transform(latlng._mercator, scale)._subtract(origin)
}

// The app draws the shared hooks' fills over filled land with their opacity ×1.8 (mobile/src/components/map/WorldMap.tsx).
// This renderer does the same on the website, so a found, wrong or hovered country stands out as much as in the app.
// It paints the countries' land itself (the fill blended over the land color, fully opaque) instead of drawing them over
// a LandLayer: the maps then draw their ~200 000 vertices once instead of twice, which keeps pinch and pan smooth on
// phones. Circles (SmallCountryCircles) keep their own see-through fill.
// A canvas, not SVG: Safari on iPhone redrew the SVG of the three world copies at the pinch's scale, and deep zooms on
// small islands (Impossible) ran the tab out of memory: iOS reloaded it and the game started over. A canvas keeps
// the size of the screen whatever the zoom.
//
// The polygons are added once and drawn again one world to the left or right wherever the canvas shows another copy of
// the world, and clicks and hovers on a copy reach the polygon. Three sets of layers (one per copy) made every zoom
// project and clip ~600 000 points, which took ~200 ms per wheel step. Circles and lines are drawn once, as usual.
// The canvas also covers 40% more than the screen on each side and is redrawn as soon as a drag reaches its edge,
// instead of only when the drag ends: a long horizontal drag used to show empty ocean until the mouse was released.
const AppFillCanvas = L.Canvas.extend({
  options: { padding: 0.4 },

  getEvents() {
    const events = L.Canvas.prototype.getEvents.call(this)
    events.move = this._updateIfOutside
    return events
  },

  _updateIfOutside() {
    const map = this._map
    // A zoom redraws through viewreset/zoomend once the layers are projected again
    if (!this._bounds || map._animatingZoom || map.getZoom() !== this._zoom) return
    const min = map.containerPointToLayerPoint([0, 0])
    if (!this._bounds.contains(L.bounds(min, min.add(map.getSize())))) this._update()
  },

  // The horizontal shifts (multiples of the world's width) at which `bounds` meets `area`, both in layer points
  _copyOffsets(bounds, area) {
    if (bounds.max.y < area.min.y || bounds.min.y > area.max.y) return []
    const world = this._map.options.crs.scale(this._map.getZoom())
    const offsets = []
    for (let k = Math.ceil((area.min.x - bounds.max.x) / world); k * world <= area.max.x - bounds.min.x; k++) {
      offsets.push(k * world)
    }
    return offsets
  },

  _initPath(layer) {
    if (layer instanceof L.Polygon) this._wrapPolygon(layer)
    L.Canvas.prototype._initPath.call(this, layer)
  },

  _wrapPolygon(layer) {
    const renderer = this
    layer._wrapsWorld = true
    layer._projectLatlngs = function projectLatlngs(latlngs, result, projectedBounds) {
      if (!(latlngs[0] instanceof L.LatLng)) {
        latlngs.forEach((child) => projectLatlngs.call(this, child, result, projectedBounds))
        return
      }
      const map = this._map
      const scale = map.options.crs.scale(map.getZoom())
      const origin = map.getPixelOrigin()
      const ring = latlngs.map((latlng) => projectCached(map, latlng, scale, origin))
      ring.forEach((point) => projectedBounds.extend(point))
      result.push(ring)
    }
    // Not clipped to the canvas: a copy may be the part on screen. The canvas clips the drawing itself.
    // A copy of the rings, as the smoothing replaces the parts' entries.
    layer._clipPoints = function () {
      const visible = this._pxBounds && renderer._copyOffsets(this._pxBounds, renderer._bounds).length
      this._parts = visible ? this._rings.slice() : []
    }
    const containsPoint = layer._containsPoint
    layer._containsPoint = function (point) {
      if (!this._pxBounds) return false
      return renderer._copyOffsets(this._pxBounds, L.bounds(point, point))
        .some((dx) => containsPoint.call(this, point.subtract([dx, 0])))
    }
  },

  _extendRedrawBounds(layer) {
    if (!layer._wrapsWorld || !layer._pxBounds || !this._bounds) {
      L.Canvas.prototype._extendRedrawBounds.call(this, layer)
      return
    }
    const padding = (layer.options.weight || 0) + 1
    const offsets = this._copyOffsets(layer._pxBounds, this._bounds)
    if (offsets.length) this._redrawBounds ??= new L.Bounds()
    for (const dx of offsets) {
      this._redrawBounds.extend(layer._pxBounds.min.add([dx - padding, -padding]))
      this._redrawBounds.extend(layer._pxBounds.max.add([dx + padding, padding]))
    }
  },

  // Leaflet's _draw, with the copies counted when only part of the canvas is redrawn (a hover, a found country)
  _draw() {
    const bounds = this._redrawBounds
    const ctx = this._ctx
    ctx.save()
    if (bounds) {
      const size = bounds.getSize()
      ctx.beginPath()
      ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y)
      ctx.clip()
    }
    this._drawing = true
    for (let order = this._drawFirst; order; order = order.next) {
      const { layer } = order
      const inBounds = !bounds || (layer._pxBounds && (layer._wrapsWorld
        ? this._copyOffsets(layer._pxBounds, bounds).length > 0
        : layer._pxBounds.intersects(bounds)))
      if (inBounds) layer._updatePath()
    }
    this._drawing = false
    ctx.restore()
  },

  _updatePoly(layer, closed) {
    if (!layer._wrapsWorld || !this._drawing || !layer._pxBounds) {
      L.Canvas.prototype._updatePoly.call(this, layer, closed)
      return
    }
    const ctx = this._ctx
    for (const dx of this._copyOffsets(layer._pxBounds, this._redrawBounds || this._bounds)) {
      ctx.save()
      ctx.translate(dx, 0)
      L.Canvas.prototype._updatePoly.call(this, layer, closed)
      ctx.restore()
    }
  },

  _fillStroke(ctx, layer) {
    const { options } = layer
    if (!options.fill) return L.Canvas.prototype._fillStroke.call(this, ctx, layer)
    const opacity = Math.min(1, options.fillOpacity * 1.8)
    const fill = layer instanceof L.Polygon
      ? { fillColor: overLand(options.fillColor || options.color, opacity), fillOpacity: 1 }
      : { fillOpacity: opacity }
    // Object.create, not a spread: Leaflet's defaults (fill, stroke, opacity...) sit on the options' prototype
    L.Canvas.prototype._fillStroke.call(this, ctx, { options: Object.assign(Object.create(options), fill) })
  },
})

export const createAppFillRenderer = () => new AppFillCanvas()
