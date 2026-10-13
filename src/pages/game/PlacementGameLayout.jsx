import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { ToastContainer } from 'react-toastify'
import { GAME_TYPES } from '../../utils/gameTypes'
import { setupGameRecord } from '../../utils/gameHistory'
import { useRecordGame } from '../../auth'
import { getCountryName } from '../../utils/getCountryName'
import LandLayer from '../../components/map/LandLayer'
import { createAppFillRenderer } from '../../components/map/appFillRenderer'
import PhaseIndicator from '../../components/PhaseIndicator'
import countries from '../../data/countriesWithDifficulty_FR.json'
import Form from '../form'
import AscensionForm from '../AscensionForm'
import ShareScoreButton from '../../components/ShareScoreButton'
import SmallCountryCircles from './SmallCountryCircles'
import { getShiftedFeatures } from './shiftedFeatures'
import { MAP_COLORS } from '../../utils/mapColors'

const GEO_STYLE = { fillColor: 'transparent', color: MAP_COLORS.stroke, fillOpacity: 1, weight: 1 }

export default function PlacementGameLayout({ difficulty, isTraining, isAscension, presetName, state, onGameFinished = null, continent }) {
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
  const [renderer] = useState(createAppFillRenderer)

  // Multiplayer games (onGameFinished) belong to their room, not to the history.
  useRecordGame(
    isGameOver && !onGameFinished
      ? setupGameRecord({ gameType: GAME_TYPES.PLACEMENT, isTraining, isAscension, presetName, difficulty, continent, score, stats, timer })
      : null
  )

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

  // A found or revealed country shows its name under the mouse, to learn from it (the app has no hover)
  const onMouseOver = useMemo(() => (event) => {
    onCountryMouseOver(event)
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (!foundCountriesRef?.current.has(name) && !shownCountriesRef?.current.has(name)) return
    if (!layer.getTooltip()) {
      layer.bindTooltip(
        () => getCountryName(layer.feature.properties.ISO_A2, i18n.language) || name,
        { sticky: true, direction: 'top', className: 'map-tooltip' }
      )
    }
    layer.openTooltip(event.latlng)
  }, [onCountryMouseOver, foundCountriesRef, shownCountriesRef, i18n])

  const onEachOffsetFeature = useMemo(() => (feature, layer) => {
    layer.on({ click: onCountryClick, mouseover: onMouseOver, mouseout: onCountryMouseOut })
  }, [onCountryClick, onMouseOver, onCountryMouseOut])

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
              <span className="hud-value" style={{ color: 'var(--accent)' }}>{score}</span>
              <span className="hud-label">{t('game_hud.score')}</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">{t('game_hud.target_country')}</span>
              <span className="hud-target-name">{getCountryName(targetCountryISO, i18n.language) || targetCountry}</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent)' }}>{displayTimer}</span>
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
        className="map-night" renderer={renderer}
        center={[20, 0]} zoom={3} zoomSnap={0.25} scrollWheelZoom zoomControl={false}
        doubleClickZoom={false} attributionControl={false}
        style={{ width: '100%', height: '100vh' }}
        whenReady={({ target }) => {
          setMapRef(target)
          setTimeout(() => target.invalidateSize(), 100)
        }}
      >
        <LandLayer />
        <GeoJSON
          key="geojson-left"
          ref={geoJsonRefLeft}
          style={GEO_STYLE}
          data={getShiftedFeatures().left}
          onEachFeature={onEachOffsetFeature}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={GEO_STYLE}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({ click: onCountryClick, mouseover: onMouseOver, mouseout: onCountryMouseOut })
          }}
        />
        <GeoJSON
          key="geojson-right"
          ref={geoJsonRefRight}
          style={GEO_STYLE}
          data={getShiftedFeatures().right}
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
      </MapContainer>
    </div>
  )
}
