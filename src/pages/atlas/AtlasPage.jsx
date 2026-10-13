// Atlas: an explorable world map, no game. Clicking a country (or picking it in the search) opens its info sheet
// (utils/countryInfo.js); its neighbors in the sheet lead on to theirs. ?country=FR opens a country directly.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { CircleMarker, GeoJSON, MapContainer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import NavBar from '../../components/NavBar'
import countries from '../../data/countriesWithDifficulty_FR.json'
import LandLayer from '../../components/map/LandLayer'
import { getCountryMetrics, getFocusCountry } from '../../utils/borderGuessMap'
import { ATLAS_COUNTRIES, countryDisplayName, findAtlasCountry, getCountryInfo, searchAtlasCountries } from '../../utils/countryInfo'
import { getShiftedFeatures } from '../game/shiftedFeatures'
import CountrySheet from './CountrySheet'
import { MAP_COLORS } from '../../utils/mapColors'
import './AtlasPage.css'

const STYLE = { fillColor: '#2A3E66', fillOpacity: 0.55, color: MAP_COLORS.stroke, weight: 1 }
// Hover: a lighter fill and a light outline; the selected country keeps the stronger blue fill
const STYLE_HOVER = { fillColor: MAP_COLORS.hover, fillOpacity: 0.5, color: MAP_COLORS.hoverStroke, weight: 2 }
const STYLE_SELECTED = { fillColor: MAP_COLORS.hover, fillOpacity: 0.6, color: MAP_COLORS.hover, weight: 2 }

// Countries too small to click at low zoom get a dot until the map is zoomed in enough
const SMALL_SPAN = 0.5
let smallCountries = null
const getSmallCountries = () =>
  (smallCountries ??= countries.features.flatMap((feature, index) => {
    try {
      const { maxSpan } = getCountryMetrics(feature)
      if (maxSpan >= SMALL_SPAN) return []
      const center = L.geoJSON(feature).getBounds().getCenter()
      return [{ key: `${feature.properties.ADMIN}#${index}`, admin: feature.properties.ADMIN, center, minZoom: Math.ceil(Math.log2(14 / Math.max(maxSpan, 0.01))) }]
    } catch {
      return []
    }
  }))

function SmallCountryDots({ selected, onSelect }) {
  const [zoom, setZoom] = useState(2)
  useMapEvents({ zoomend: (event) => setZoom(event.target.getZoom()) })
  return getSmallCountries()
    .filter((dot) => zoom < dot.minZoom)
    .map((dot) => (
      <CircleMarker
        key={dot.key}
        center={dot.center}
        radius={6}
        pathOptions={dot.admin === selected ? { ...STYLE_SELECTED, fillOpacity: 0.9 } : { fillColor: '#ffffff', fillOpacity: 0.15, color: MAP_COLORS.stroke, weight: 1.5 }}
        eventHandlers={{ click: () => onSelect(dot.admin) }}
      />
    ))
}

function Search({ onSelect }) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchAtlasCountries(query, i18n.language), [query, i18n.language])
  const pick = (feature) => {
    onSelect(feature.properties.ADMIN)
    setQuery('')
  }
  return (
    <div className="atlas-search">
      <input
        type="search"
        value={query}
        placeholder={t('atlas.search_placeholder')}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) pick(results[0]) }}
        aria-label={t('atlas.search_placeholder')}
      />
      {query.trim() && (
        <ul className="atlas-search-results">
          {results.length === 0 ? (
            <li className="atlas-muted">{t('atlas.no_results')}</li>
          ) : (
            results.map((feature) => (
              <li key={feature.properties.ADMIN}>
                <button type="button" onClick={() => pick(feature)}>
                  <img src={`/flags/${feature.properties.ISO_A2.toLowerCase()}.png`} alt="" />
                  {countryDisplayName(feature, i18n.language)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function AtlasPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [map, setMap] = useState(null)
  const layersRef = useRef(new Map()) // ADMIN -> its layers (the map and its two copies left and right)
  const selectedRef = useRef(null)
  const isoParam = params.get('country')?.toUpperCase() ?? null
  const [selected, setSelected] = useState(
    () => (isoParam && ATLAS_COUNTRIES.find((feature) => feature.properties.ISO_A2 === isoParam)?.properties.ADMIN) || null
  )
  selectedRef.current = selected
  const info = useMemo(() => (selected ? getCountryInfo(findAtlasCountry(selected), i18n.language) : null), [selected, i18n.language])

  const restyle = useCallback((admin, style) => {
    layersRef.current.get(admin)?.forEach((layer) => layer.setStyle(style))
  }, [])

  const select = useCallback((admin) => setSelected(admin), [])

  // Highlight the selected country, frame it, and keep it in the URL
  useEffect(() => {
    if (!selected) return undefined
    restyle(selected, STYLE_SELECTED)
    // Frame the country's main part (France without French Guiana), above the sheet on phones
    const feature = findAtlasCountry(selected)
    if (map && feature?.geometry) {
      const phone = window.innerWidth <= 760
      map.flyToBounds(L.geoJSON(getFocusCountry(feature)).getBounds(), {
        maxZoom: 5,
        paddingTopLeft: [40, phone ? 70 : 40],
        paddingBottomRight: [40, phone ? Math.round(window.innerHeight * 0.58) + 20 : 40],
        duration: 0.8,
      })
    }
    const iso = findAtlasCountry(selected)?.properties.ISO_A2
    if (iso && iso !== isoParam) setParams({ country: iso }, { replace: true })
    return () => restyle(selected, STYLE)
  }, [selected, map, restyle]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setSelected(null)
    setParams({}, { replace: true })
  }

  const onEachFeature = (copy) => (feature, layer) => {
    const admin = feature.properties.ADMIN
    layer.options.copy = copy
    const list = layersRef.current.get(admin) ?? []
    list.push(layer)
    layersRef.current.set(admin, list)
    if (admin === selectedRef.current) layer.setStyle(STYLE_SELECTED)
    layer.bindTooltip(() => countryDisplayName(feature, i18n.language), { sticky: true, direction: 'top', className: 'atlas-tooltip' })
    layer.on({
      click: () => select(admin),
      mouseover: () => { if (admin !== selectedRef.current) restyle(admin, STYLE_HOVER) },
      mouseout: () => { if (admin !== selectedRef.current) restyle(admin, STYLE) },
    })
  }

  const shifted = getShiftedFeatures()

  return (
    <div className="atlas-page">
      <NavBar />
      <div className="atlas-body">
        <div className="atlas-map">
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
            <GeoJSON data={shifted.left} style={STYLE} onEachFeature={onEachFeature(-1)} />
            <GeoJSON data={countries.features} style={STYLE} onEachFeature={onEachFeature(0)} />
            <GeoJSON data={shifted.right} style={STYLE} onEachFeature={onEachFeature(1)} />
            <SmallCountryDots selected={selected} onSelect={select} />
          </MapContainer>
          <div className="atlas-overlay">
            <h1 className="atlas-title">🗺️ {t('atlas.title')}</h1>
            <Search onSelect={select} />
            {!info && <p className="atlas-hint">{t('atlas.subtitle')}</p>}
          </div>
        </div>
        {info && <CountrySheet info={info} onSelect={select} onClose={close} />}
      </div>
    </div>
  )
}
