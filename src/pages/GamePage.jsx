// src/pages/GamePage.jsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { ToastContainer } from 'react-toastify'
import useGameState from '../hooks/useGameState'
import countries from '../data/countriesWithDifficulty_FR.json'
import Form from './form'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

const GEO_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }

export default function GamePage() {
  const { difficulty, isTraining } = useLocation().state || {}
  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    geoJsonRef, setMapRef,
    onCountryClick, onCountryMouseOver, onCountryMouseOut,
    seeCountry, restartGame, goHome,
  } = useGameState(difficulty, isTraining)

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0

  return (
    <div className="game-page">
      <div className="hud-container">
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>
                {score}
              </span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">PAYS À TROUVER</span>
              <span className="hud-target-name">{targetCountry}</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>
                {displayTimer}
              </span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div
                className="hud-progress-bar"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="hud-progress-text">
              {stats.found} / {stats.total} pays
            </span>
          </div>
        </div>

        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">
              {stats.found}
            </span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">
              {stats.skipped}
            </span>
            <span className="hud-stat-label">✗ PASSÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">◎ RESTANTS</span>
          </div>
        </div>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>
          ← Accueil
        </button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry}>
          👁 Voir
        </button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>
          ↺ Recommencer
        </button>
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} />
        </div>
      )}

      <ToastContainer
        enableMultiContainer
        containerId="centerToast"
        position="bottom-center"
        autoClose={3000}
        theme="dark"
        hideProgressBar
      />
      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        zoomControl={false}
        dragging
        doubleClickZoom={false}
        maxBounds={[[90, -180], [-90, 180]]}
        style={{ width: '100%', height: '100vh' }}
        whenReady={({ target }) => {
          setMapRef(target)
          target.getContainer().style.background = 'var(--bg-primary)'
          setTimeout(() => target.invalidateSize(), 100)
        }}
      >
        <TileLayer
          attribution="Stamen Toner"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png"
          noWrap
          minZoom={2}
          maxZoom={20}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={GEO_STYLE}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({
              click: onCountryClick,
              mouseover: onCountryMouseOver,
              mouseout: onCountryMouseOut,
            })
          }}
        />
      </MapContainer>
    </div>
  )
}
