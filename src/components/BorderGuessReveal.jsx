import React, { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { CircleMarker, GeoJSON, MapContainer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import LandLayer from './map/LandLayer'
import { getFocusCountry, normalizeWrappedCountry } from '../utils/borderGuessMap'
import countries from '../data/countriesWithDifficulty_FR.json'
import { countryDisplayName, findAtlasCountry, getNeighbors } from '../utils/countryInfo'
import { MAP_COLORS } from '../utils/mapColors'
import 'leaflet/dist/leaflet.css'
import './BorderGuessReveal.css'

const NEIGHBOR_STYLE = { fillColor: MAP_COLORS.stroke, fillOpacity: 0.18, color: MAP_COLORS.stroke, opacity: 0.9, weight: 1.2 }
const ANSWER_STYLE = { fillColor: MAP_COLORS.hover, fillOpacity: 0.65, color: MAP_COLORS.hoverStroke, weight: 2 }
// The other countries: invisible until the mouse is over them, so their name can show
const HOVER_STYLE = { fillColor: MAP_COLORS.hover, fillOpacity: 0, stroke: false }
const HOVER_ON = { fillOpacity: 0.12 }
const MAX_ZOOM = 8

// Frames the answer with room around it, so the neighbours show: the bounds are not widened to fit them (Russia would
// shrink Mongolia to a speck).
function FitAnswer({ country }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.geoJSON(getFocusCountry(country)).getBounds()
    if (!bounds.isValid()) return
    const fit = () => {
      const { x, y } = map.getSize()
      const pad = Math.round(Math.min(x, y) * 0.18)
      map.fitBounds(bounds, { padding: [pad, pad], maxZoom: MAX_ZOOM, animate: false })
    }
    fit()
    map.on('resize', fit)
    return () => map.off('resize', fit)
  }, [country, map])
  return null
}

// Each neighbour's name sits in the middle of its visible part: its own center is often off the frame (Russia, Brazil).
function NeighborLabels({ neighbors }) {
  const map = useMap()
  const [view, setView] = useState(() => map.getBounds())
  useMapEvents({ moveend: () => setView(map.getBounds()) })
  const boundsByIso = useMemo(
    () => new Map(neighbors.map(({ iso, feature }) => [iso, L.geoJSON(feature).getBounds()])),
    [neighbors]
  )
  return neighbors.map(({ iso, name }) => {
    const bounds = boundsByIso.get(iso)
    const south = Math.max(bounds.getSouth(), view.getSouth())
    const north = Math.min(bounds.getNorth(), view.getNorth())
    const west = Math.max(bounds.getWest(), view.getWest())
    const east = Math.min(bounds.getEast(), view.getEast())
    if (south >= north || west >= east) return null
    return (
      <CircleMarker key={iso} center={[(south + north) / 2, (west + east) / 2]} radius={0} stroke={false} fill={false} interactive={false}>
        <Tooltip permanent direction="center" className="border-guess-reveal__label">
          {name}
        </Tooltip>
      </CircleMarker>
    )
  })
}

// The answer of a Border Guess with its land neighbours around it, named. Hovering any other country shows its name.
// `country` is a feature of the dataset.
export default function BorderGuessReveal({ country }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const neighbors = useMemo(
    () =>
      getNeighbors(country, lang)
        .map((neighbor) => ({ ...neighbor, feature: findAtlasCountry(neighbor.admin) }))
        .filter((neighbor) => neighbor.feature)
        .map((neighbor) => ({ ...neighbor, feature: normalizeWrappedCountry(neighbor.feature) })),
    [country, lang]
  )
  const answer = useMemo(() => normalizeWrappedCountry(country), [country])
  const others = useMemo(() => {
    const shown = new Set([country.properties.ADMIN, ...neighbors.map((neighbor) => neighbor.admin)])
    return countries.features.filter((feature) => !shown.has(feature.properties.ADMIN))
  }, [country, neighbors])

  return (
    <div className="border-guess-reveal">
      <div className="border-guess-reveal__map">
        <MapContainer key={country.properties.ADMIN} className="map-night" center={[20, 0]} zoom={2} attributionControl={false} style={{ height: '100%', width: '100%' }}>
          <LandLayer borders />
          <GeoJSON
            key={`others-${lang}`}
            data={others}
            style={() => HOVER_STYLE}
            onEachFeature={(feature, layer) => layer.bindTooltip(countryDisplayName(feature, lang), { sticky: true })}
            eventHandlers={{
              mouseover: (event) => event.layer.setStyle(HOVER_ON),
              mouseout: (event) => event.layer.setStyle(HOVER_STYLE),
            }}
          />
          {neighbors.map(({ iso, feature }) => (
            <GeoJSON key={iso} data={feature} style={() => NEIGHBOR_STYLE} interactive={false} />
          ))}
          <GeoJSON data={answer} style={() => ANSWER_STYLE}>
            <Tooltip sticky>{countryDisplayName(country, lang)}</Tooltip>
          </GeoJSON>
          <NeighborLabels neighbors={neighbors} />
          <FitAnswer country={country} />
        </MapContainer>
      </div>
    </div>
  )
}
