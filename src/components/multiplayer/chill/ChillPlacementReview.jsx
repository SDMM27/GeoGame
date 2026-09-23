// src/components/multiplayer/chill/ChillPlacementReview.jsx
import { useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import countries from '../../../data/countriesWithDifficulty_FR.json'
import { DARK_NOLABELS_TILE_URL } from '../../../mapTiles'

const BASE_STYLE = { fillColor: 'transparent', color: '#94a3b8', fillOpacity: 1, weight: 1 }
const CORRECT_STYLE = { fillColor: '#22c55e', fillOpacity: 0.55, color: '#86efac', weight: 2 }
const WRONG_STYLE = { fillColor: '#ef4444', fillOpacity: 0.55, color: '#fca5a5', weight: 2 }

function shiftLng(coords, offset) {
  if (typeof coords[0] === 'number') return [coords[0] + offset, coords[1]]
  return coords.map(c => shiftLng(c, offset))
}
function offsetFeatures(features, lngOffset) {
  return features.map(f => ({
    ...f,
    geometry: { ...f.geometry, coordinates: shiftLng(f.geometry.coordinates, lngOffset) },
  }))
}
const featuresLeft = offsetFeatures(countries.features, -360)
const featuresRight = offsetFeatures(countries.features, 360)

export default function ChillPlacementReview({
  mancheCountries,
  mancheStartIndex,
  playerAnswers,
  reviewStep,
  isHost,
  players,
  onNext,
  onContinue,
}) {
  // Construire la liste des mauvaises réponses
  const wrongAnswers = mancheCountries.flatMap((country, i) => {
    const idx = mancheStartIndex + i
    const countryName = typeof country === 'string' ? country : country.properties?.ADMIN ?? country.ADMIN
    return Object.entries(players)
      .filter(([pid]) => {
        const ans = playerAnswers?.[pid]?.[String(idx)]
        return ans !== undefined && ans !== null && !ans.correct
      })
      .map(([pid]) => ({
        pid,
        pseudo: players[pid].pseudo,
        country,
        countryName,
        answer: playerAnswers[pid][String(idx)],
      }))
  })

  // Résumé scores (step 0)
  const correctSummary = Object.entries(players).map(([pid, p]) => {
    const correctCount = mancheCountries.filter((_, i) => {
      const idx = mancheStartIndex + i
      return playerAnswers?.[pid]?.[String(idx)]?.correct === true
    }).length
    return { pid, pseudo: p.pseudo, correctCount, total: mancheCountries.length }
  }).sort((a, b) => b.correctCount - a.correctCount)

  const isAllDone = reviewStep > wrongAnswers.length

  const current = reviewStep >= 1 ? wrongAnswers[reviewStep - 1] : null
  const correctName = current?.countryName ?? ''
  const wrongName = current?.answer?.clickedAdmin ?? null

  const getStyle = useCallback((feature) => {
    const admin = feature?.properties?.ADMIN
    if (admin === correctName) return CORRECT_STYLE
    if (wrongName && admin === wrongName) return WRONG_STYLE
    return BASE_STYLE
  }, [correctName, wrongName])

  // ─── Step 0 : résumé texte ───────────────────────────────────────────────
  if (reviewStep === 0) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ color: '#f1f5f9', marginBottom: 16 }}>
          📋 Revue de manche — {mancheCountries.length} pays
        </h2>
        <h3 style={{ color: '#22c55e', marginBottom: 12 }}>✓ Résultats</h3>
        {correctSummary.map(({ pid, pseudo, correctCount, total }) => (
          <div key={pid} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 14px', borderRadius: 8, marginBottom: 6,
            background: correctCount === total ? '#166534' : '#1e293b',
          }}>
            <span style={{ color: '#f1f5f9' }}>{pseudo}</span>
            <span style={{ color: correctCount === total ? '#86efac' : '#94a3b8' }}>
              {correctCount} / {total}
            </span>
          </div>
        ))}
        {wrongAnswers.length > 0 && isHost && (
          <button onClick={onNext} style={btnStyle('#1d4ed8')}>Voir les erreurs »</button>
        )}
        {wrongAnswers.length === 0 && isHost && (
          <button onClick={onContinue} style={btnStyle('#166534')}>Continuer →</button>
        )}
        {!isHost && (
          <p style={{ color: '#64748b', marginTop: 12 }}>En attente de l'hôte…</p>
        )}
      </div>
    )
  }

  // ─── Step ≥ 1 : carte plein écran + barre bas ────────────────────────────
  if (!current && !isAllDone) return null

  const clickedAdmin = current?.answer?.clickedAdmin ?? null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, overflow: 'hidden', background: '#0f172a' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        zoomSnap={0.25}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100%' }}
        whenReady={({ target }) => {
          target.getContainer().style.background = '#0f172a'
          setTimeout(() => target.invalidateSize(), 100)
        }}
      >
        <TileLayer
          url={DARK_NOLABELS_TILE_URL}
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          minZoom={2}
          maxZoom={20}
        />
        <GeoJSON key={`left-${reviewStep}`} style={getStyle} data={featuresLeft} />
        <GeoJSON key={`center-${reviewStep}`} style={getStyle} data={countries.features} />
        <GeoJSON key={`right-${reviewStep}`} style={getStyle} data={featuresRight} />
      </MapContainer>

      {/* Barre overlay en bas */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.92)', padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1em' }}>
          ✗ Erreur {reviewStep} / {wrongAnswers.length}
        </span>
        <span style={{ color: '#94a3b8', fontSize: '0.9em' }}>
          Joueur : <strong style={{ color: '#f1f5f9' }}>{current?.pseudo}</strong>
        </span>
        <span style={{ color: '#fca5a5' }}>{clickedAdmin ?? '(rien)'}</span>
        <span style={{ color: '#94a3b8' }}>→</span>
        <span style={{ color: '#86efac', fontWeight: 'bold' }}>{correctName}</span>
        <div style={{ marginLeft: 'auto' }}>
          {isHost && !isAllDone && reviewStep < wrongAnswers.length && (
            <button onClick={onNext} style={btnStyle('#1d4ed8')}>Suivant »</button>
          )}
          {isHost && !isAllDone && reviewStep === wrongAnswers.length && (
            <button onClick={onContinue} style={btnStyle('#166534')}>Continuer →</button>
          )}
          {isHost && isAllDone && (
            <button onClick={onContinue} style={btnStyle('#166534')}>Continuer →</button>
          )}
          {!isHost && (
            <span style={{ color: '#64748b' }}>En attente de l'hôte…</span>
          )}
        </div>
      </div>
    </div>
  )
}

function btnStyle(bg) {
  return {
    padding: '8px 20px', borderRadius: 8,
    background: bg, color: 'white', border: 'none',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '1em',
  }
}
