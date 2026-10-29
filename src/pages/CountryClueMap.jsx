import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, GeoJSON, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { COUNTRY_CENTER_MAP, getCountryByName } from '../hooks/useCountryClueState'
import { getCountryMetrics } from '../utils/borderGuessMap'
import 'leaflet/dist/leaflet.css'
import LandLayer from '../components/map/LandLayer'
import { MAP_COLORS } from '../utils/mapColors'

const SMALL_COUNTRY_THRESHOLD = 1.5

const STYLE_WRONG = { fillColor: MAP_COLORS.wrong, color: MAP_COLORS.wrong, fillOpacity: 0.65, weight: 2 }
const STYLE_CORRECT = { fillColor: MAP_COLORS.right, color: MAP_COLORS.right, fillOpacity: 0.72, weight: 2 }
const CIRCLE_WRONG = { color: MAP_COLORS.wrong, fillColor: MAP_COLORS.wrong, fillOpacity: 0.95, weight: 3, radius: 11 }
const CIRCLE_CORRECT = { color: MAP_COLORS.right, fillColor: MAP_COLORS.right, fillOpacity: 0.95, weight: 3, radius: 13 }

// zoom minimum pour qu'un pays de maxSpan degrés soit visible (~10px sur l'écran)
function switchZoomForSpan(maxSpan) {
  return Math.ceil(Math.log2(14 / Math.max(maxSpan, 0.01)))
}

function shiftLng(coords, offset) {
  if (typeof coords[0] === 'number') return [coords[0] + offset, coords[1]]
  return coords.map(c => shiftLng(c, offset))
}
function offsetFeature(feature, lngOffset) {
  if (lngOffset === 0) return feature
  return { ...feature, geometry: { ...feature.geometry, coordinates: shiftLng(feature.geometry.coordinates, lngOffset) } }
}

const LNG_OFFSETS = [-360, 0, 360]

function ZoomTracker({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) })
  return null
}

function CountryLayer({ name, correct, zoom, lngOffset = 0 }) {
  const baseFeature = useMemo(() => getCountryByName(name), [name])
  const feature = useMemo(() => offsetFeature(baseFeature, lngOffset), [baseFeature, lngOffset])
  const coords = COUNTRY_CENTER_MAP.get(name)

  if (!feature || !coords) return null

  const { maxSpan } = getCountryMetrics(baseFeature)
  const isSmall = maxSpan < SMALL_COUNTRY_THRESHOLD
  const style = correct ? STYLE_CORRECT : STYLE_WRONG
  const circleProps = correct ? CIRCLE_CORRECT : CIRCLE_WRONG

  if (isSmall && zoom < switchZoomForSpan(maxSpan)) {
    return (
      <CircleMarker center={[coords.lat, coords.lng + lngOffset]} {...circleProps}>
        <Tooltip>{name}</Tooltip>
      </CircleMarker>
    )
  }

  return (
    <GeoJSON key={`${name}-${lngOffset}`} data={feature} style={() => style}>
      <Tooltip sticky>{name}</Tooltip>
    </GeoJSON>
  )
}

// Zooms in on the answer, for a map that shows nothing else
function FitAnswer({ name }) {
  const map = useMap()
  useEffect(() => {
    const feature = getCountryByName(name)
    if (!feature) return
    map.fitBounds(getCountryMetrics(feature).bounds, { padding: [40, 40], maxZoom: 5, animate: false })
  }, [map, name])
  return null
}

export default function CountryClueMap({ guesses, answerName, isLost, focusAnswer = false }) {
  const [zoom, setZoom] = useState(2)

  return (
    <div className="country-clue-map-container">
      <MapContainer
        className="map-night"
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        zoomControl={true}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <LandLayer borders />
        <ZoomTracker onZoom={setZoom} />
        {focusAnswer && <FitAnswer name={answerName} />}
        {LNG_OFFSETS.flatMap(offset =>
          guesses.map((guess) => (
            <CountryLayer key={`${guess.value}-${offset}`} name={guess.value} correct={guess.isCorrect} zoom={zoom} lngOffset={offset} />
          ))
        )}
        {isLost && LNG_OFFSETS.map(offset => (
          <CountryLayer key={`${answerName}-answer-${offset}`} name={answerName} correct={true} zoom={zoom} lngOffset={offset} />
        ))}
      </MapContainer>
    </div>
  )
}
