import React, { useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet'
import { COUNTRY_CENTER_MAP, getCountryByName } from '../hooks/useCountryClueState'
import { getCountryMetrics } from '../utils/borderGuessMap'
import 'leaflet/dist/leaflet.css'

const SMALL_COUNTRY_THRESHOLD = 1.0

const STYLE_WRONG = { fillColor: '#ef4444', color: '#334155', fillOpacity: 0.5, weight: 0.85 }
const STYLE_CORRECT = { fillColor: '#22c55e', color: '#334155', fillOpacity: 0.6, weight: 0.85 }
const CIRCLE_WRONG = { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2, radius: 7 }
const CIRCLE_CORRECT = { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.9, weight: 2, radius: 9 }

// zoom minimum pour qu'un pays de maxSpan degrés soit visible (~10px sur l'écran)
function switchZoomForSpan(maxSpan) {
  return Math.ceil(Math.log2(14 / Math.max(maxSpan, 0.01)))
}

function ZoomTracker({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

function CountryLayer({ name, correct, zoom }) {
  const feature = useMemo(() => getCountryByName(name), [name])
  const coords = COUNTRY_CENTER_MAP.get(name)

  if (!feature || !coords) return null

  const { maxSpan } = getCountryMetrics(feature)
  const isSmall = maxSpan < SMALL_COUNTRY_THRESHOLD
  const style = correct ? STYLE_CORRECT : STYLE_WRONG
  const circleProps = correct ? CIRCLE_CORRECT : CIRCLE_WRONG

  if (isSmall && zoom < switchZoomForSpan(maxSpan)) {
    return (
      <CircleMarker center={[coords.lat, coords.lng]} {...circleProps}>
        <Tooltip>{name}</Tooltip>
      </CircleMarker>
    )
  }

  return (
    <GeoJSON key={name} data={feature} style={() => style}>
      <Tooltip sticky>{name}</Tooltip>
    </GeoJSON>
  )
}

export default function CountryClueMap({ guesses, answerName, isLost }) {
  const [zoom, setZoom] = useState(2)

  return (
    <div className="country-clue-map-container">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        zoomControl={true}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png"
          noWrap
          minZoom={2}
        />
        <ZoomTracker onZoom={setZoom} />
        {guesses.map((guess) => (
          <CountryLayer key={guess.value} name={guess.value} correct={guess.isCorrect} zoom={zoom} />
        ))}
        {isLost && <CountryLayer key={answerName} name={answerName} correct={true} zoom={zoom} />}
      </MapContainer>
    </div>
  )
}
