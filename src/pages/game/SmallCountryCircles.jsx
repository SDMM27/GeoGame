import React, { useMemo, useRef, useState } from 'react'
import { CircleMarker, useMapEvents } from 'react-leaflet'
import { MAP_COLORS } from '../../utils/mapColors'
import countries from '../../data/countriesWithDifficulty_FR.json'

// A country gets a dot when its biggest piece of land is too small to click on the world map (about 2.5 degrees:
// 10px at the default zoom). The whole country's span is not used: an archipelago spread over the Pacific is huge,
// yet every one of its islands is a speck.
const SMALL_THRESHOLD = 2.5

// The dot goes away once the biggest piece is about 28px wide
function zoomThresholdForSpan(maxSpan) {
  return Math.ceil(Math.log2(28 / Math.max(maxSpan, 0.01)))
}

// Bounding box of a ring, over the dateline when the ring crosses it
function ringBox(ring) {
  let lngs = ring.map((c) => c[0])
  if (Math.max(...lngs) - Math.min(...lngs) > 180) lngs = lngs.map((l) => (l < 0 ? l + 360 : l))
  const lats = ring.map((c) => c[1])
  const west = Math.min(...lngs), east = Math.max(...lngs), south = Math.min(...lats), north = Math.max(...lats)
  return { span: Math.max(east - west, north - south), lat: (south + north) / 2, lng: (((west + east) / 2 + 540) % 360) - 180 }
}

const WORLD_COPY_OFFSETS = [-360, 0, 360]

// Computed on first use: the geometries are loaded after this module is evaluated.
// The map draws the world three times (shiftedFeatures): a dot on each copy, or the Pacific islands seen across the
// dateline would have none. The centers are built once: a new array on a render would move every dot again.
let smallCountriesCache = null
const getSmallCountries = () => smallCountriesCache ??= (() => {
  const result = []
  for (const [index, f] of countries.features.entries()) {
    try {
      const { type, coordinates } = f.geometry
      const polygons = type === 'Polygon' ? [coordinates] : coordinates
      const biggest = polygons.map((poly) => ringBox(poly[0])).reduce((a, c) => (c.span > a.span ? c : a))
      if (biggest.span >= SMALL_THRESHOLD) continue
      for (const offset of WORLD_COPY_OFFSETS) {
        // Two features can share a name: the position in the dataset keeps the React key unique
        result.push({
          key: `${f.properties.ADMIN}#${index}@${offset}`,
          name: f.properties.ADMIN,
          center: [biggest.lat, biggest.lng + offset],
          zoomThreshold: zoomThresholdForSpan(biggest.span),
        })
      }
    } catch (_) { /* skip */ }
  }
  return result
})()

const CIRCLE_DEFAULT = { fillColor: '#ffffff', fillOpacity: 0.15, color: MAP_COLORS.stroke, weight: 2 }
const CIRCLE_HOVER = { fillColor: MAP_COLORS.hover, fillOpacity: 0.5, color: MAP_COLORS.hover, weight: 2 }

// The same center and handlers on every render: the game's clock re-renders its page ten times a second, and new
// props moved and re-bound the ~300 dots each time, redrawing the whole map on iPhone.
export default function SmallCountryCircles({ onCountryNameClick, foundCountriesRef, shownCountriesRef }) {
  const [zoom, setZoom] = useState(3)
  useMapEvents({ zoomend: (e) => setZoom(e.target.getZoom()) })

  const onClickRef = useRef(onCountryNameClick)
  onClickRef.current = onCountryNameClick
  const handlers = useMemo(() => new Map(getSmallCountries().map((c) => [c.key, {
    click: () => onClickRef.current(c.name),
    mouseover: (e) => e.target.setStyle(CIRCLE_HOVER),
    mouseout: (e) => e.target.setStyle(CIRCLE_DEFAULT),
  }])), [])

  return getSmallCountries()
    .filter(c => zoom < c.zoomThreshold)
    .filter(c => !foundCountriesRef.current.has(c.name) && !shownCountriesRef.current.has(c.name))
    .map(c => (
      <CircleMarker
        key={c.key}
        center={c.center}
        radius={8}
        pathOptions={CIRCLE_DEFAULT}
        eventHandlers={handlers.get(c.key)}
      />
    ))
}

