import { Fragment, useEffect } from 'react'
import { MapContainer, GeoJSON, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function getFeatureBBox(feature) {
  const geom = feature?.geometry
  if (!geom) return null
  let coords
  if (geom.type === 'Polygon') {
    coords = geom.coordinates[0]
  } else if (geom.type === 'MultiPolygon') {
    coords = geom.coordinates.flatMap(poly => poly[0])
  } else {
    return null
  }
  if (!coords?.length) return null
  const lats = coords.map(c => c[1])
  const lngs = coords.map(c => c[0])
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }
}

// color: 'start' | 'green' | 'yellow' | 'red' | 'target' | 'hint'
function getCountryStyle(color) {
  switch (color) {
    case 'start':   return { fillColor: '#38bdf8', fillOpacity: 0.75, color: '#0284c7', weight: 2 }
    case 'green':   return { fillColor: '#4ade80', fillOpacity: 0.75, color: '#15803d', weight: 2 }
    case 'yellow':  return { fillColor: '#fbbf24', fillOpacity: 0.75, color: '#b45309', weight: 2 }
    case 'red':     return { fillColor: '#ef4444', fillOpacity: 0.55, color: '#991b1b', weight: 1.5 }
    case 'target':  return { fillColor: '#f472b6', fillOpacity: 0.75, color: '#be185d', weight: 2 }
    case 'hint':    return { fillColor: '#94a3b8', fillOpacity: 0.08, color: '#94a3b8', weight: 1.5, dashArray: '5 5' }
    default:        return { fillColor: '#334155', fillOpacity: 0.1, color: '#475569', weight: 0.5 }
  }
}

function Graticule() {
  const lats = [-60, -30, 0, 30, 60]
  const lngs = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]
  const s = { color: '#1e3a5f', weight: 0.7, opacity: 0.8 }
  return (
    <>
      {lats.map(lat => (
        <Polyline key={`lat${lat}`} positions={[[lat, -180], [lat, 180]]} {...s} />
      ))}
      {lngs.map(lng => (
        <Polyline key={`lng${lng}`} positions={[[-90, lng], [90, lng]]} {...s} />
      ))}
    </>
  )
}

function MapController({ guessHistory, targetCountry, hintFeatures }) {
  const map = useMap()

  useEffect(() => {
    const mainFeatures = [
      ...guessHistory.map(g => g.feature),
      targetCountry,
    ].filter(Boolean)
    if (mainFeatures.length === 0) return

    const bboxes = mainFeatures.map(getFeatureBBox).filter(Boolean)
    if (bboxes.length === 0) return

    // Pour les hints, utiliser uniquement le centroïde (±8°) pour éviter
    // que des pays immenses (Russie, Canada…) dominent la vue
    for (const f of (hintFeatures ?? [])) {
      const bbox = getFeatureBBox(f)
      if (!bbox) continue
      const cLat = (bbox.minLat + bbox.maxLat) / 2
      const cLng = (bbox.minLng + bbox.maxLng) / 2
      bboxes.push({ minLat: cLat - 8, maxLat: cLat + 8, minLng: cLng - 8, maxLng: cLng + 8 })
    }

    const minLat = Math.min(...bboxes.map(b => b.minLat))
    const maxLat = Math.max(...bboxes.map(b => b.maxLat))
    const minLng = Math.min(...bboxes.map(b => b.minLng))
    const maxLng = Math.max(...bboxes.map(b => b.maxLng))

    map.fitBounds(
      [[minLat, minLng], [maxLat, maxLng]],
      { padding: [30, 30], maxZoom: 8, animate: false }
    )
  }, [map, guessHistory, targetCountry]) // hintFeatures intentionally excluded — outlines shouldn't trigger rezoom

  return null
}

export default function VoyageVoyageMap({
  startCountry,
  targetCountry,
  guessHistory,
  hintFeatures = [],
  interactive = false,
}) {
  const targetISO = targetCountry?.properties.ISO_A2 ?? ''
  const targetInChain = guessHistory.some(
    g => g.color !== 'red' && g.feature.properties.ISO_A2 === targetISO
  )

  // Build visible entries: guessHistory + target (if not already in history)
  const seen = new Set()
  const entries = []

  for (const g of guessHistory) {
    const iso = g.feature.properties.ISO_A2
    if (seen.has(iso)) continue
    seen.add(iso)
    entries.push({ feature: g.feature, color: g.color })
  }

  if (targetCountry && !seen.has(targetISO)) {
    entries.push({ feature: targetCountry, color: 'target' })
  }

  // Pays révélés par les indices (outlines pointillés)
  for (const feature of hintFeatures) {
    const iso = feature.properties.ISO_A2
    if (!seen.has(iso)) {
      seen.add(iso)
      entries.push({ feature, color: 'hint' })
    }
  }

  return (
    <MapContainer
      style={{ width: '100%', height: '100%', background: '#0f172a' }}
      center={[20, 0]}
      zoom={2}
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      attributionControl={false}
    >
      <Graticule />
      <MapController guessHistory={guessHistory} targetCountry={targetInChain ? null : targetCountry} hintFeatures={hintFeatures} />

      {entries.map(({ feature, color }) => {
        const iso = feature.properties.ISO_A2
        const style = getCountryStyle(color)
        const bbox = getFeatureBBox(feature)
        const isSmall = bbox && (bbox.maxLat - bbox.minLat < 1.5 && bbox.maxLng - bbox.minLng < 1.5)
        const centerLat = bbox ? (bbox.minLat + bbox.maxLat) / 2 : 0
        const centerLng = bbox ? (bbox.minLng + bbox.maxLng) / 2 : 0

        return (
          <Fragment key={`${iso}-${color}`}>
            <GeoJSON
              data={feature}
              style={() => style}
            >
              {color !== 'hint' && (
                <Tooltip sticky className="voyage-map-label">
                  {feature.properties.ADMIN}
                </Tooltip>
              )}
            </GeoJSON>
            {isSmall && (
              <CircleMarker
                center={[centerLat, centerLng]}
                radius={14}
                pathOptions={{
                  color: style.color,
                  fillColor: style.fillColor,
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              />
            )}
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
