// src/components/multiplayer/chill/ChillPlacementInput.jsx
import React, { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import countries from '../../../data/countriesWithDifficulty_FR.json'

const GEO_STYLE = { fillColor: 'transparent', color: '#94a3b8', fillOpacity: 1, weight: 1 }
const HOVER_STYLE = { fillColor: '#7b2ff7', fillOpacity: 0.4, color: '#94a3b8', weight: 1 }
const SELECTED_STYLE = { fillColor: '#3b82f6', fillOpacity: 0.6, color: '#60a5fa', weight: 2 }

function shiftLng(coords, offset) {
  if (typeof coords[0] === 'number') return [coords[0] + offset, coords[1]]
  return coords.map(c => shiftLng(c, offset))
}
function offsetFeatures(features, lngOffset) {
  return features.map(f => ({
    ...f,
    geometry: { ...f.geometry, coordinates: shiftLng(f.geometry.coordinates, lngOffset) }
  }))
}
const featuresLeft = offsetFeatures(countries.features, -360)
const featuresRight = offsetFeatures(countries.features, 360)

function RightClickDrag() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    let isDragging = false, lastX = 0, lastY = 0
    const onMouseDown = (e) => {
      if (e.button !== 2) return
      isDragging = true; lastX = e.clientX; lastY = e.clientY
      container.style.cursor = 'grabbing'; e.preventDefault()
    }
    const onMouseMove = (e) => {
      if (!isDragging) return
      const dx = lastX - e.clientX; const dy = lastY - e.clientY
      lastX = e.clientX; lastY = e.clientY
      map._rawPanBy(L.point(dx, dy))
    }
    const onMouseUp = (e) => {
      if (!isDragging) return
      isDragging = false
      container.style.cursor = ''
      if (e.button === 2) map.fire('moveend')
    }
    const onContextMenu = (e) => e.preventDefault()
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('contextmenu', onContextMenu)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('contextmenu', onContextMenu)
    }
  }, [map])
  return null
}

export default function ChillPlacementInput({ onSubmit, countdownEnd, locked }) {
  const geoJsonRef = useRef(null)
  const geoJsonRefLeft = useRef(null)
  const geoJsonRefRight = useRef(null)

  // Source of truth for selected country — never stale in timers/callbacks
  const selectedRef = useRef(null)
  const submittedRef = useRef(false)

  // Ref to the previously highlighted layer, to reset style on new selection
  const prevLayerRef = useRef(null)

  // Re-initialize on new question (countdownEnd changes with each round)
  useEffect(() => {
    selectedRef.current = null
    submittedRef.current = false
    prevLayerRef.current = null

    // Reset all layers to base style
    for (const ref of [geoJsonRef, geoJsonRefLeft, geoJsonRefRight]) {
      if (ref.current) {
        ref.current.getLayers().forEach(l => l.setStyle(GEO_STYLE))
      }
    }
  }, [countdownEnd])

  // Auto-submit at countdownEnd
  useEffect(() => {
    if (!countdownEnd) return
    const endMs = typeof countdownEnd.toMillis === 'function'
      ? countdownEnd.toMillis()
      : Number(countdownEnd)
    const ms = Math.max(0, endMs - Date.now())
    const id = setTimeout(() => {
      if (!submittedRef.current) {
        submittedRef.current = true
        onSubmit(selectedRef.current)
      }
    }, ms)
    return () => clearTimeout(id)
  }, [countdownEnd, onSubmit])

  // Helper: find the canonical ADMIN layer from any of the 3 GeoJSON layers
  function findLayersByAdmin(adminName) {
    const refs = [geoJsonRef, geoJsonRefLeft, geoJsonRefRight]
    const found = []
    for (const ref of refs) {
      if (!ref.current) continue
      const layer = ref.current.getLayers().find(
        l => l.feature.properties.ADMIN === adminName
      )
      if (layer) found.push(layer)
    }
    return found
  }

  const handleCountryClick = (event) => {
    if (locked || submittedRef.current) return
    const layer = event.target
    const adminName = layer.feature.properties.ADMIN

    // Deselect previous country (all copies: left, center, right)
    if (prevLayerRef.current && prevLayerRef.current !== adminName) {
      findLayersByAdmin(prevLayerRef.current).forEach(l => l.setStyle(GEO_STYLE))
    }

    // Highlight all copies of newly selected country
    findLayersByAdmin(adminName).forEach(l => l.setStyle(SELECTED_STYLE))
    prevLayerRef.current = adminName
    selectedRef.current = adminName
  }

  const handleMouseOver = (event) => {
    if (locked) return
    const layer = event.target
    const adminName = layer.feature.properties.ADMIN
    // Don't override the selected highlight
    if (selectedRef.current === adminName) return
    layer.setStyle(HOVER_STYLE)
  }

  const handleMouseOut = (event) => {
    if (locked) return
    const layer = event.target
    const adminName = layer.feature.properties.ADMIN
    // Don't reset the selected country
    if (selectedRef.current === adminName) return
    layer.setStyle(GEO_STYLE)
  }

  const onEachFeature = useCallback((feature, layer) => {
    layer.on({ click: handleCountryClick, mouseover: handleMouseOver, mouseout: handleMouseOut })
  }, []) // safe: all handler logic reads refs, not closure state

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <MapContainer
        center={[20, 0]}
        zoom={3}
        zoomSnap={0.25}
        scrollWheelZoom
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100vh' }}
        whenReady={({ target }) => {
          target.getContainer().style.background = '#0f172a'
          setTimeout(() => target.invalidateSize(), 100)
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          minZoom={2}
          maxZoom={20}
        />
        <GeoJSON
          key="geojson-left"
          ref={geoJsonRefLeft}
          style={GEO_STYLE}
          data={featuresLeft}
          onEachFeature={onEachFeature}
        />
        <GeoJSON
          key="geojson-center"
          ref={geoJsonRef}
          style={GEO_STYLE}
          data={countries.features}
          onEachFeature={onEachFeature}
        />
        <GeoJSON
          key="geojson-right"
          ref={geoJsonRefRight}
          style={GEO_STYLE}
          data={featuresRight}
          onEachFeature={onEachFeature}
        />
        <RightClickDrag />
      </MapContainer>
    </div>
  )
}
