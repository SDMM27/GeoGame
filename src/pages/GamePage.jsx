// src/pages/GamePage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ToastContainer } from 'react-toastify'
import useGameState from '../hooks/useGameState'
import { snapshotKey, loadSnapshot } from '../utils/multiplayerSnapshot'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import { getCountryName } from '../utils/getCountryName'
import PhaseIndicator from '../components/PhaseIndicator'
import { getCountryMetrics } from '../utils/borderGuessMap'
import countries from '../data/countriesWithDifficulty_FR.json'
import Form from './form'
import AscensionForm from './AscensionForm'
import ShareScoreButton from '../components/ShareScoreButton'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

const GEO_STYLE = { fillColor: 'transparent', color: '#94a3b8', fillOpacity: 1, weight: 1 }

const SMALL_THRESHOLD = 0.5

function zoomThresholdForSpan(maxSpan) {
  return Math.ceil(Math.log2(14 / Math.max(maxSpan, 0.01)))
}

const smallCountries = (() => {
  const result = []
  for (const f of countries.features) {
    try {
      const { maxSpan } = getCountryMetrics(f)
      if (maxSpan >= SMALL_THRESHOLD) continue
      const center = L.geoJSON(f).getBounds().getCenter()
      result.push({ name: f.properties.ADMIN, lat: center.lat, lng: center.lng, zoomThreshold: zoomThresholdForSpan(maxSpan) })
    } catch (_) { /* skip */ }
  }
  return result
})()

const CIRCLE_DEFAULT = { fillColor: '#ffffff', fillOpacity: 0.15, color: '#94a3b8', weight: 2 }
const CIRCLE_HOVER = { fillColor: '#7b2ff7', fillOpacity: 0.5, color: '#7b2ff7', weight: 2 }

function SmallCountryCircles({ onCountryNameClick, foundCountriesRef, shownCountriesRef, stats }) {
  const [zoom, setZoom] = useState(3)
  useMapEvents({ zoomend: (e) => setZoom(e.target.getZoom()) })

  return smallCountries
    .filter(c => zoom < c.zoomThreshold)
    .filter(c => !foundCountriesRef.current.has(c.name) && !shownCountriesRef.current.has(c.name))
    .map(c => (
      <CircleMarker
        key={c.name}
        center={[c.lat, c.lng]}
        radius={8}
        pathOptions={CIRCLE_DEFAULT}
        eventHandlers={{
          click: () => onCountryNameClick(c.name),
          mouseover: (e) => e.target.setStyle(CIRCLE_HOVER),
          mouseout: (e) => e.target.setStyle(CIRCLE_DEFAULT),
        }}
      />
    ))
}

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

function PlacementGameLayout({ difficulty, isTraining, isAscension, presetName, state, onGameFinished = null, continent }) {
  const { t, i18n } = useTranslation()
  const {
    targetCountry, targetCountryISO, score, timer, stats,
    isGameOver, displayTimer,
    geoJsonRef, extraGeoJsonRefs, mapRef, setMapRef,
    onCountryClick, onCountryNameClick, onCountryMouseOver, onCountryMouseOut,
    foundCountriesRef, shownCountriesRef,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = state

  const geoJsonRefLeft = useRef(null)
  const geoJsonRefRight = useRef(null)
  extraGeoJsonRefs.current = [geoJsonRefLeft, geoJsonRefRight]

  const CONTINENT_ZOOM = {
    'Amériques': { center: [10, -80], zoom: 3 },
    'Afrique': { center: [10, 20], zoom: 3.6 },
    'Europe': { center: [50, 20], zoom: 4 },
    'Océanie': { center: [-10, 170], zoom: 3.5 }
  }

  useEffect(() => {
    if (!mapRef || !continent) return
    const override = CONTINENT_ZOOM[continent]
    if (override) {
      mapRef.setView(override.center, override.zoom, { animate: false })
      return
    }
    const features = countries.features.filter(f => f.properties.continent === continent)
    if (features.length === 0) return
    mapRef.fitBounds(L.geoJSON(features).getBounds(), { padding: [20, 20], animate: false })
  }, [mapRef, continent])

  const onEachOffsetFeature = useMemo(() => (feature, layer) => {
    layer.on({ click: onCountryClick, mouseover: onCountryMouseOver, mouseout: onCountryMouseOut })
  }, [onCountryClick, onCountryMouseOver, onCountryMouseOut])

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
              <span className="hud-label">{t('game_hud.score')}</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">{t('game_hud.target_country')}</span>
              <span className="hud-target-name">{getCountryName(targetCountryISO, i18n.language) || targetCountry}</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">{t('game_hud.time')}</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} {t('game_hud.countries')}</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">{t('game_hud.found')}</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
            <span className="hud-stat-label">{t('game_hud.skipped')}</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">{t('game_hud.remaining')}</span>
          </div>
        </div>
      </div>

      <div className="controls-hint">
        <div className="controls-hint-row"><span className="controls-key">{t('controls.left_click')}</span><span className="controls-desc">{t('controls.select_country')}</span></div>
        <div className="controls-hint-row"><span className="controls-key">{t('controls.right_click')}</span><span className="controls-desc">{t('controls.move_map')}</span></div>
        <div className="controls-hint-row"><span className="controls-key">{t('controls.wheel')}</span><span className="controls-desc">{t('controls.zoom')}</span></div>
      </div>

      <div className="hud-actions">
        {!onGameFinished && <button className="hud-btn hud-btn--home" onClick={goHome}>{t('buttons.home')}</button>}
        <button className="hud-btn hud-btn--reveal" onClick={seeCountry}>{t('buttons.reveal')}</button>
        {!onGameFinished && <button className="hud-btn hud-btn--restart" onClick={restartGame}>{t('buttons.restart')}</button>}
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {onGameFinished ? (
              <div className="mp-game-waiting">
                <p style={{ color: '#4ade80', fontSize: '1.5rem' }}>{t('game_over.completed')}</p>
                <p style={{ color: '#94a3b8' }}>{t('game_over.waiting_players')}</p>
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
              <>
                <ShareScoreButton
                  score={score}
                  gameType="PLACEMENT"
                  difficulty={difficulty}
                  details={t('share.details_placement_timer', { found: stats.found, total: stats.total, time: timer ? `${Math.floor(timer/60000)}m${String(Math.floor((timer%60000)/1000)).padStart(2,'0')}s` : '' })}
                />
                <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="PLACEMENT" continent={continent} />
              </>
            )}
            {!onGameFinished && (
              <div className="game-over-actions">
                <button className="hud-btn hud-btn--restart" onClick={restartGame}>{t('buttons.restart')}</button>
                <button className="hud-btn hud-btn--home" onClick={goHome}>{t('buttons.home')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />

      <MapContainer
        center={[20, 0]} zoom={3} zoomSnap={0.25} scrollWheelZoom zoomControl={false}
        dragging={false} doubleClickZoom={false} attributionControl={false}
        style={{ width: '100%', height: '100vh' }}
        whenReady={({ target }) => {
          setMapRef(target)
          target.getContainer().style.background = 'var(--bg-primary)'
          setTimeout(() => target.invalidateSize(), 100)
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          minZoom={2} maxZoom={20}
        />
        <GeoJSON
          key="geojson-left"
          ref={geoJsonRefLeft}
          style={GEO_STYLE}
          data={featuresLeft}
          onEachFeature={onEachOffsetFeature}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={GEO_STYLE}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({ click: onCountryClick, mouseover: onCountryMouseOver, mouseout: onCountryMouseOut })
          }}
        />
        <GeoJSON
          key="geojson-right"
          ref={geoJsonRefRight}
          style={GEO_STYLE}
          data={featuresRight}
          onEachFeature={onEachOffsetFeature}
        />
        {onCountryNameClick && foundCountriesRef && shownCountriesRef && (
          <SmallCountryCircles
            onCountryNameClick={onCountryNameClick}
            foundCountriesRef={foundCountriesRef}
            shownCountriesRef={shownCountriesRef}
            stats={stats}
          />
        )}
        <RightClickDrag />
      </MapContainer>
    </div>
  )
}

function StandardPlacementGame({ difficulty, isTraining, continent }) {
  const state = useGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <PlacementGameLayout
      difficulty={difficulty ?? continent}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
      continent={continent}
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

export function MultiplayerPlacementGame({ gameConfig, overrideCountries, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  if (gameConfig.mode === 'ascension') {
    return (
      <MultiplayerAscensionPlacementGame
        gameConfig={gameConfig}
        overridesByDifficulty={overridesByDifficulty}
        onCountryFound={onCountryFound}
        onGameFinished={onGameFinished}
        roomId={roomId}
        playerId={playerId}
        gameIndex={gameIndex}
      />
    )
  }
  return (
    <MultiplayerStandardPlacementGame
      gameConfig={gameConfig}
      overrideCountries={overrideCountries}
      onCountryFound={onCountryFound}
      onGameFinished={onGameFinished}
      roomId={roomId}
      playerId={playerId}
      gameIndex={gameIndex}
    />
  )
}

function MultiplayerStandardPlacementGame({ gameConfig, overrideCountries, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useGameState(gameConfig.difficulty, false, overrideCountries, mpSnapshot, mpSnapKey)
  const prevFoundRef = useRef(mpSnapshot?.found ?? 0)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    const perfects = state.stats.foundFirstTry ?? 0
    onGameFinished({
      attempts: totalErrorsRef.current,
      elapsedTime: state.timer,
      countriesSolved: state.stats.found,
      weightedScore: scoreRef.current,
      perfects,
      stumbles: state.stats.found - perfects,
      failures: state.stats.skipped,
    })
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

function MultiplayerAscensionPlacementGame({ gameConfig, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useAscensionState(GAME_TYPES.PLACEMENT, gameConfig.phases, false, true, overridesByDifficulty, mpSnapshot, mpSnapKey)
  const prevFoundRef = useRef(mpSnapshot?.found ?? 0)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    const perfects = state.stats.foundFirstTry ?? 0
    onGameFinished({
      attempts: totalErrorsRef.current,
      elapsedTime: state.timer,
      countriesSolved: state.stats.found,
      weightedScore: scoreRef.current,
      perfects,
      stumbles: state.stats.found - perfects,
      failures: state.stats.skipped,
    })
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
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionPlacementGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardPlacementGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
}
