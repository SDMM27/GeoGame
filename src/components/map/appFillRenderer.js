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
// This SVG renderer does the same on the website, so a found, wrong or hovered country stands out as much as in the app.
// It paints the countries' land itself (the fill blended over the land color, fully opaque) instead of drawing them over
// a LandLayer: the maps then draw their ~200 000 vertices once instead of twice, which keeps pinch and pan smooth on
// phones. Circles (SmallCountryCircles) keep their own see-through fill.
const AppFillSVG = L.SVG.extend({
  _updateStyle(layer) {
    L.SVG.prototype._updateStyle.call(this, layer)
    if (!layer._path || !layer.options.fill) return
    const opacity = Math.min(1, layer.options.fillOpacity * 1.8)
    if (layer instanceof L.Polygon) {
      layer._path.setAttribute('fill', overLand(layer.options.fillColor || layer.options.color, opacity))
      layer._path.setAttribute('fill-opacity', 1)
    } else {
      layer._path.setAttribute('fill-opacity', opacity)
    }
  },
})

export const createAppFillRenderer = () => new AppFillSVG()
