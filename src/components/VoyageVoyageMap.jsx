import { useEffect } from 'react'
import { MapContainer, GeoJSON, Polyline, useMap } from 'react-leaflet'
import { normalizeWrappedCountry } from '../utils/borderGuessMap'
import 'leaflet/dist/leaflet.css'

/**
 * Calcule le centroïde approximatif d'une feature GeoJSON (pour la ligne de chemin).
 * @param {object} feature - Feature GeoJSON
 * @returns {[number, number]} [lat, lng] pour Leaflet
 */
function getCentroid(feature) {
  const normalized = normalizeWrappedCountry(feature)
  const geom = normalized.geometry
  const ring =
    geom.type === 'MultiPolygon'
      ? geom.coordinates[0][0]
      : geom.coordinates[0]
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length
  return [lat, lng]
}

/** Style Leaflet pour chaque feature selon son rôle dans le jeu */
function getCountryStyle(feature, startISO, targetISO, chainISOs, wrongISOs) {
  const iso = feature.properties.ISO_A2
  if (chainISOs.includes(iso)) {
    return { fillColor: '#4ade80', fillOpacity: 0.6, color: '#166534', weight: 2 }
  }
  if (iso === targetISO) {
    return { fillColor: '#f59e0b', fillOpacity: 0.6, color: '#78350f', weight: 2 }
  }
  if (wrongISOs.includes(iso)) {
    return { fillColor: '#ef4444', fillOpacity: 0.35, color: '#7f1d1d', weight: 1 }
  }
  return { fillColor: '#334155', fillOpacity: 0.12, color: '#475569', weight: 0.5 }
}

/** Composant interne pour ajuster les bounds de la carte via useMap() */
function MapController({ validatedChain, wrongGuesses, targetCountry }) {
  const map = useMap()

  useEffect(() => {
    const highlighted = [...validatedChain, ...wrongGuesses, targetCountry].filter(Boolean)
    if (highlighted.length === 0) return
    const centroids = highlighted.map(getCentroid)
    const lats = centroids.map(c => c[0])
    const lngs = centroids.map(c => c[1])
    const pad = 8
    const bounds = [
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ]
    map.fitBounds(bounds, { padding: [20, 20], animate: false })
  }, [map, validatedChain, wrongGuesses, targetCountry])

  return null
}

/**
 * Carte Leaflet pour Voyage Voyage.
 * Affiche tous les pays du monde en gris, avec les pays de la chaîne (vert),
 * la destination (orange), et les mauvaises tentatives (rouge).
 * Trace une ligne verte entre les pays validés.
 *
 * @param {object} allCountries - GeoJSON FeatureCollection complet
 * @param {object} startCountry - Feature GeoJSON du pays de départ
 * @param {object} targetCountry - Feature GeoJSON du pays cible
 * @param {object[]} validatedChain - Features validées (dans l'ordre)
 * @param {object[]} wrongGuesses - Features rejetées
 */
export default function VoyageVoyageMap({
  allCountries,
  startCountry,
  targetCountry,
  validatedChain,
  wrongGuesses,
}) {
  const startISO = startCountry?.properties.ISO_A2 ?? ''
  const targetISO = targetCountry?.properties.ISO_A2 ?? ''
  const chainISOs = validatedChain.map(f => f.properties.ISO_A2)
  const wrongISOs = wrongGuesses.map(f => f.properties.ISO_A2)

  // Clé pour forcer le re-rendu du GeoJSON quand les listes changent
  const geoJsonKey = `${chainISOs.join(',')}-${wrongISOs.join(',')}`

  // Positions du chemin validé (pour la Polyline)
  const chainCentroids = validatedChain.map(getCentroid)

  return (
    <MapContainer
      style={{ width: '100%', height: '400px', background: '#0f172a' }}
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      attributionControl={false}
    >
      <MapController
        validatedChain={validatedChain}
        wrongGuesses={wrongGuesses}
        targetCountry={targetCountry}
      />

      <GeoJSON
        key={geoJsonKey}
        data={allCountries}
        style={(feature) =>
          getCountryStyle(feature, startISO, targetISO, chainISOs, wrongISOs)
        }
        onEachFeature={(feature, layer) => {
          const iso = feature.properties.ISO_A2
          const isHighlighted = chainISOs.includes(iso) || iso === targetISO || wrongISOs.includes(iso)
          if (isHighlighted) {
            layer.bindTooltip(feature.properties.ADMIN, {
              permanent: true,
              direction: 'center',
              className: 'voyage-map-label',
            })
          }
        }}
      />

      {chainCentroids.length > 1 && (
        <Polyline
          positions={chainCentroids}
          color="#4ade80"
          weight={2}
          opacity={0.7}
          dashArray={null}
        />
      )}
    </MapContainer>
  )
}
