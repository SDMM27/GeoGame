import React, { useState } from 'react'
import { CircleMarker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { getCountryMetrics } from '../../utils/borderGuessMap'
import countries from '../../data/countriesWithDifficulty_FR.json'

const SMALL_THRESHOLD = 0.5

function zoomThresholdForSpan(maxSpan) {
  return Math.ceil(Math.log2(14 / Math.max(maxSpan, 0.01)))
}

// Computed on first use: the geometries are loaded after this module is evaluated
let smallCountriesCache = null
const getSmallCountries = () => smallCountriesCache ??= (() => {
  const result = []
  for (const f of countries.features) {
    try {
      const { maxSpan } = getCountryMetrics(f)
      if (maxSpan >= SMALL_THRESHOLD) continue
      const center = L.geoJSON(f).getBounds().getCenter()
      result.push({ name: f.properties.ADMIN, lat: center.lat, lng: center.lng, zoomThreshold: zoomThresholdForSpan(maxSpan) })
    } catch (_) { /* skip */ }
  }
  return result
})()

const CIRCLE_DEFAULT = { fillColor: '#ffffff', fillOpacity: 0.15, color: '#94a3b8', weight: 2 }
const CIRCLE_HOVER = { fillColor: '#7b2ff7', fillOpacity: 0.5, color: '#7b2ff7', weight: 2 }

export default function SmallCountryCircles({ onCountryNameClick, foundCountriesRef, shownCountriesRef, stats }) {
  const [zoom, setZoom] = useState(3)
  useMapEvents({ zoomend: (e) => setZoom(e.target.getZoom()) })

  return getSmallCountries()
    .filter(c => zoom < c.zoomThreshold)
    .filter(c => !foundCountriesRef.current.has(c.name) && !shownCountriesRef.current.has(c.name))
    .map(c => (
      <CircleMarker
        key={c.name}
        center={[c.lat, c.lng]}
        radius={8}
        pathOptions={CIRCLE_DEFAULT}
        eventHandlers={{
          click: () => onCountryNameClick(c.name),
          mouseover: (e) => e.target.setStyle(CIRCLE_HOVER),
          mouseout: (e) => e.target.setStyle(CIRCLE_DEFAULT),
        }}
      />
    ))
}
