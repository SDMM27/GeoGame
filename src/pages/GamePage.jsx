// src/pages/GamePage.jsx
import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ToastContainer } from 'react-toastify'
import useGameState from '../hooks/useGameState'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import PhaseIndicator from '../components/PhaseIndicator'
import countries from '../data/countriesWithDifficulty_FR.json'
import Form from './form'
import AscensionForm from './AscensionForm'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

const GEO_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }

function RightClickDrag() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    let isDragging = false, lastX = 0, lastY = 0
    const onMouseDown = (e) => { if (e.button !== 2) return; isDragging = true; lastX = e.clientX; lastY = e.clientY; container.style.cursor = 'grabbing'; e.preventDefault() }
    const onMouseMove = (e) => { if (!isDragging) return; const dx = lastX - e.clientX; const dy = lastY - e.clientY; lastX = e.clientX; lastY = e.clientY; map._rawPanBy(L.point(dx, dy)) }
    const onMouseUp = (e) => { if (e.button !== 2) return; isDragging = false; container.style.cursor = ''; map.fire('moveend') }
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

function PlacementGameLayout({ difficulty, isTraining, isAscension, presetName, state, onGameFinished = null }) {
  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    geoJsonRef, setMapRef,
    onCountryClick, onCountryMouseOver, onCountryMouseOut,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = state

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0

  return (
    <div className="game-page">
      {isAscension && (
        <PhaseIndicator
          currentPhase={currentPhase}
          phaseCountRemaining={phaseCountRemaining}
          totalPhaseCount={totalPhaseCount}
        />
      )}

      <div className={`hud-container${isAscension ? ' hud-container--with-phase' : ''}`}>
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{score}</span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">PAYS À TROUVER</span>
              <span className="hud-target-name">{targetCountry}</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} pays</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
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
        <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry}>👁 Voir</button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {onGameFinished ? (
              <div className="mp-game-waiting">
                <p style={{ color: '#4ade80', fontSize: '1.5rem' }}>✓ Terminé !</p>
                <p style={{ color: '#94a3b8' }}>En attente des autres joueurs...</p>
              </div>
            ) : isAscension ? (
              <AscensionForm
                score={score}
                timer={timer}
                stats={stats}
                phaseStats={phaseStats}
                gameType={GAME_TYPES.PLACEMENT}
                presetName={presetName ?? null}
                isTraining={isTraining}
              />
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="PLACEMENT" />
            )}
            {!onGameFinished && (
              <div className="game-over-actions">
                <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
                <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />

      <MapContainer
        center={[20, 0]} zoom={2} scrollWheelZoom zoomControl={false}
        dragging={false} doubleClickZoom={false}
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
          noWrap minZoom={2} maxZoom={20}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={GEO_STYLE}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({ click: onCountryClick, mouseover: onCountryMouseOver, mouseout: onCountryMouseOut })
          }}
        />
        <RightClickDrag />
      </MapContainer>
    </div>
  )
}

function StandardPlacementGame({ difficulty, isTraining }) {
  const state = useGameState(difficulty, isTraining)
  return (
    <PlacementGameLayout
      difficulty={difficulty}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
    />
  )
}

function AscensionPlacementGame({ phases, isTraining, presetName }) {
  const state = useAscensionState(GAME_TYPES.PLACEMENT, phases, isTraining, true)
  return (
    <PlacementGameLayout
      difficulty={null}
      isTraining={isTraining}
      isAscension
      presetName={presetName}
      state={state}
    />
  )
}

export function MultiplayerPlacementGame({ gameConfig, overrideCountries, overridesByDifficulty, onCountryFound, onGameFinished }) {
  if (gameConfig.mode === 'ascension') {
    return (
      <MultiplayerAscensionPlacementGame
        gameConfig={gameConfig}
        overridesByDifficulty={overridesByDifficulty}
        onCountryFound={onCountryFound}
        onGameFinished={onGameFinished}
      />
    )
  }
  return (
    <MultiplayerStandardPlacementGame
      gameConfig={gameConfig}
      overrideCountries={overrideCountries}
      onCountryFound={onCountryFound}
      onGameFinished={onGameFinished}
    />
  )
}

function MultiplayerStandardPlacementGame({ gameConfig, overrideCountries, onCountryFound, onGameFinished }) {
  const state = useGameState(gameConfig.difficulty, false, overrideCountries)
  const prevFoundRef = useRef(0)

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    onGameFinished({ attempts: state.stats.found + state.stats.skipped, elapsedTime: state.timer })
  }, [state.isGameOver, onGameFinished, state.stats.found, state.stats.skipped, state.timer])

  return (
    <PlacementGameLayout
      difficulty={gameConfig.difficulty}
      isTraining={false}
      isAscension={false}
      presetName={null}
      state={state}
      onGameFinished={onGameFinished}
    />
  )
}

function MultiplayerAscensionPlacementGame({ gameConfig, overridesByDifficulty, onCountryFound, onGameFinished }) {
  const state = useAscensionState(GAME_TYPES.PLACEMENT, gameConfig.phases, false, true, overridesByDifficulty)
  const prevFoundRef = useRef(0)

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    onGameFinished({ attempts: state.stats.found + state.stats.skipped, elapsedTime: state.timer })
  }, [state.isGameOver, onGameFinished, state.stats.found, state.stats.skipped, state.timer])

  return (
    <PlacementGameLayout
      difficulty={null}
      isTraining={false}
      isAscension
      presetName={gameConfig.presetName ?? null}
      state={state}
      onGameFinished={onGameFinished}
    />
  )
}

export default function GamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionPlacementGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardPlacementGame difficulty={difficulty} isTraining={isTraining} />
}
