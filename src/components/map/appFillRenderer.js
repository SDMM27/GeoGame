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

// The app draws the shared hooks' fills over filled land with their opacity ×1.8 (mobile/src/components/map/WorldMap.tsx).
// This renderer does the same on the website, so a found, wrong or hovered country stands out as much as in the app.
// It paints the countries' land itself (the fill blended over the land color, fully opaque) instead of drawing them over
// a LandLayer: the maps then draw their ~200 000 vertices once instead of twice, which keeps pinch and pan smooth on
// phones. Circles (SmallCountryCircles) keep their own see-through fill.
// A canvas, not SVG: Safari on iPhone redrew the SVG of the three world copies at the pinch's scale, and deep zooms on
// small islands (Impossible) ran the tab out of memory: iOS reloaded it and the game started over. A canvas keeps
// the size of the screen whatever the zoom.
const AppFillCanvas = L.Canvas.extend({
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
