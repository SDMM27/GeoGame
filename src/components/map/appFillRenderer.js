import L from 'leaflet'

// The app draws the shared hooks' fills over filled land with their opacity ×1.8 (mobile/src/components/map/WorldMap.tsx).
// This SVG renderer does the same on the website, so a found, wrong or hovered country stands out as much as in the app.
const AppFillSVG = L.SVG.extend({
  _updateStyle(layer) {
    L.SVG.prototype._updateStyle.call(this, layer)
    if (layer._path && layer.options.fill) {
      layer._path.setAttribute('fill-opacity', Math.min(1, layer.options.fillOpacity * 1.8))
    }
  },
})

export const createAppFillRenderer = () => new AppFillSVG()
