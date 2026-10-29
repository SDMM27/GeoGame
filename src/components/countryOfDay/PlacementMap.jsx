// The placement step of the Country of the Day: a world map without names, a click answers with the country's ADMIN.
// A wrong click paints the country; once the step is over the answer is framed and painted (green if found, red if missed).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, GeoJSON, MapContainer, useMapEvents } from 'react-leaflet'
import LandLayer from '../map/LandLayer'
import countries from '../../data/countriesWithDifficulty_FR.json'
import { getShiftedFeatures } from '../../pages/game/shiftedFeatures'
import { getFocusCountry } from '../../utils/borderGuessMap'
import { getSmallCountryCircleDescriptors } from '../../utils/largestLandmass'
import { NON_CLICKABLE_MAP_AREAS } from '../../utils/mapInteraction'
import { MAP_COLORS } from '../../utils/mapColors'
import 'leaflet/dist/leaflet.css'

const STYLE = { fillColor: MAP_COLORS.land, fillOpacity: 0.55, color: MAP_COLORS.stroke, weight: 1 }
const STYLE_HOVER = { fillColor: MAP_COLORS.hover, fillOpacity: 0.5, color: MAP_COLORS.hoverStroke, weight: 2 }
const STYLE_WRONG = { fillColor: MAP_COLORS.wrong, fillOpacity: 0.5, color: MAP_COLORS.wrong, weight: 2 }
const STYLE_RIGHT = { fillColor: MAP_COLORS.right, fillOpacity: 0.75, color: MAP_COLORS.right, weight: 2.5 }
const STYLE_MISSED = { fillColor: MAP_COLORS.wrong, fillOpacity: 0.85, color: MAP_COLORS.hoverStroke, weight: 2.5 }
const MAX_FRAME_ZOOM = 6

let smallCountries = null
const getSmallCountries = () => (smallCountries ??= getSmallCountryCircleDescriptors(countries.features))

// Countries too small to click at the world zoom show as dots until the map is zoomed in enough
function SmallCountryDots({ styleOf, onPick, disabled }) {
  const [zoom, setZoom] = useState(2)
  useMapEvents({ zoomend: (event) => setZoom(event.target.getZoom()) })
  return getSmallCountries()
    .filter((dot) => zoom < dot.zoomThreshold)
    .map((dot) => {
      const style = styleOf(dot.name)
      return (
        <CircleMarker
          key={`${dot.key}-${style.fillColor}`}
          center={dot.center}
          radius={dot.radius}
          pathOptions={style === STYLE ? { fillColor: '#ffffff', fillOpacity: 0.15, color: MAP_COLORS.stroke, weight: 2 } : { ...style, fillOpacity: 0.9 }}
          eventHandlers={{ click: () => { if (!disabled) onPick(dot.name) } }}
        />
      )
    })
}

// `answer`: the country's feature. `wrong`: ADMIN names clicked. `resolved`/`found`: the step is over.
export default function PlacementMap({ answer, wrong, resolved, found, onPick }) {
  const [map, setMap] = useState(null)
  const admin = answer.properties.ADMIN
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  const resolvedRef = useRef(resolved)
  resolvedRef.current = resolved

  const styleOf = useCallback(
    (name) => {
      if (name === admin && resolved) return found ? STYLE_RIGHT : STYLE_MISSED
      return wrong.includes(name) ? STYLE_WRONG : STYLE
    },
    [admin, wrong, resolved, found]
  )
  const styleRef = useRef(styleOf)
  styleRef.current = styleOf
  const geoStyle = useCallback((feature) => styleOf(feature.properties.ADMIN), [styleOf])

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties.ADMIN
    if (NON_CLICKABLE_MAP_AREAS.has(name)) return
    layer.on({
      click: () => { if (!resolvedRef.current) pickRef.current(name) },
      mouseover: () => { if (!resolvedRef.current && styleRef.current(name) === STYLE) layer.setStyle(STYLE_HOVER) },
      mouseout: () => layer.setStyle(styleRef.current(name)),
    })
  }, [])

  // Frame the answer once the step is over (found or not), so the player sees where it is
  useEffect(() => {
    if (!map || !resolved) return
    const bounds = L.geoJSON(getFocusCountry(answer)).getBounds()
    if (!bounds.isValid()) return
    const shift = Math.round((map.getCenter().lng - bounds.getCenter().lng) / 360) * 360
    map.flyToBounds(
      L.latLngBounds([bounds.getSouth(), bounds.getWest() + shift], [bounds.getNorth(), bounds.getEast() + shift]),
      { maxZoom: MAX_FRAME_ZOOM, padding: [40, 40], duration: 0.8 }
    )
  }, [map, resolved, answer])

  const shifted = useMemo(() => getShiftedFeatures(), [])

  return (
    <div className="cod-map">
      <MapContainer
        className="map-night"
        center={[25, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={9}
        zoomSnap={0.5}
        worldCopyJump
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
        ref={setMap}
      >
        <LandLayer />
        <GeoJSON data={shifted.left} style={geoStyle} onEachFeature={onEachFeature} />
        <GeoJSON data={countries.features} style={geoStyle} onEachFeature={onEachFeature} />
        <GeoJSON data={shifted.right} style={geoStyle} onEachFeature={onEachFeature} />
        <SmallCountryDots styleOf={styleOf} onPick={onPick} disabled={resolved} />
      </MapContainer>
    </div>
  )
}
