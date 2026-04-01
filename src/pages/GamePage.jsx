// src/pages/GamePage.jsx
import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ToastContainer } from 'react-toastify'
import useGameState from '../hooks/useGameState'
import countries from '../data/countriesWithDifficulty_FR.json'
import Form from './form'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

const GEO_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }

function RightClickDrag() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    let isDragging = false
    let lastX = 0
    let lastY = 0

    const onMouseDown = (e) => {
      if (e.button !== 2) return
      isDragging = true
      lastX = e.clientX
      lastY = e.clientY
      container.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const onMouseMove = (e) => {
      if (!isDragging) return
      const dx = lastX - e.clientX
      const dy = lastY - e.clientY
      lastX = e.clientX
      lastY = e.clientY
      map._rawPanBy(L.point(dx, dy))
    }

    const onMouseUp = (e) => {
      if (e.button !== 2) return
      isDragging = false
      container.style.cursor = ''
      map.fire('moveend')
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

      <div className="controls-hint">
        <div className="controls-hint-row"><span className="controls-key">Clic gauche</span><span className="controls-desc">Sélectionner un pays</span></div>
        <div className="controls-hint-row"><span className="controls-key">Clic droit</span><span className="controls-desc">Déplacer la carte</span></div>
        <div className="controls-hint-row"><span className="controls-key">Molette</span><span className="controls-desc">Zoomer / Dézoomer</span></div>
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
          <div className="game-over-content">
            <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} />
            <div className="game-over-actions">
              <button className="hud-btn hud-btn--restart" onClick={restartGame}>
                ↺ Recommencer
              </button>
              <button className="hud-btn hud-btn--home" onClick={goHome}>
                ← Accueil
              </button>
            </div>
          </div>
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
        dragging={false}
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
        <RightClickDrag />
      </MapContainer>
    </div>
  )
}
