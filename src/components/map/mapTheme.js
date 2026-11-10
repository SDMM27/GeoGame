import L from 'leaflet'

// Game maps in the light theme. The map styles come from the shared hooks and src/utils/mapColors.js, spelled like the
// app's dark palette (the app compares them with its own theme), so they can't change. Instead the colors are swapped
// here, when Leaflet paints a path (canvas or SVG), for their light counterparts: every map follows the theme without
// touching the shared styles, and the dark theme draws exactly what it did. Imported once by each map (side effect).
const LIGHT = {
  '#2a3e66': '#ffffff', // land
  '#6f88bd': '#94a3c4', // land stroke
  '#7aa2ff': '#3557c9', // hover, highlight
  '#3ddc97': '#14a86b', // right
  '#ff7a6b': '#e5484d', // wrong
  '#f5b83d': '#d99100', // missed
  '#eef1f8': '#0b1020', // hover stroke
  '#ffffff': '#0b1020', // faint white fill of the small-country circles
  '#5fd4f4': '#0a8fb5', // Voyage Voyage start
  '#ff9ec7': '#d6337a', // Voyage Voyage target
  '#7a84a3': '#5a6380', // Voyage Voyage hint
  '#1e3a5f': '#b8c3dc', // Voyage Voyage borders
  '#141a2e': '#ffffff', // empire outlines
}

const isLight = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'

/** The color to paint for a map color in the current theme. */
export const themedMapColor = (color) => (isLight() && typeof color === 'string' && LIGHT[color.toLowerCase()]) || color

// A layer's options with its colors swapped, on top of the real ones (Leaflet's defaults sit on their prototype)
const themedOptions = (options) => {
  if (!isLight()) return options
  const color = themedMapColor(options.color)
  const fillColor = themedMapColor(options.fillColor)
  if (color === options.color && fillColor === options.fillColor) return options
  return Object.assign(Object.create(options), { color, fillColor })
}

const withThemedOptions = (paint) =>
  function themedPaint(...args) {
    const layer = args.find((arg) => arg && arg.options && arg._renderer === this) ?? args.at(-1)
    const own = layer.options
    layer.options = themedOptions(own)
    try {
      return paint.apply(this, args)
    } finally {
      layer.options = own
    }
  }

if (!L.Canvas.prototype._ggThemed) {
  L.Canvas.prototype._ggThemed = true
  L.Canvas.prototype._fillStroke = withThemedOptions(L.Canvas.prototype._fillStroke)
  L.SVG.prototype._updateStyle = withThemedOptions(L.SVG.prototype._updateStyle)

  // Every live map, to repaint its paths when the theme changes
  const maps = new Set()
  L.Map.addInitHook(function registerMap() {
    maps.add(this)
    this.once('unload', () => maps.delete(this))
  })
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    new MutationObserver(() => {
      maps.forEach((map) => map.eachLayer((layer) => layer instanceof L.Path && layer._renderer && layer.setStyle({})))
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }
}
