import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import { ToastContainer } from 'react-toastify'
import NavBar from '../components/NavBar'
import useBorderGuessState from '../hooks/useBorderGuessState'
import { getCountryStyle, getFocusCountry, getViewportSettings } from '../utils/borderGuessMap'
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './BorderGuessPage.css'

function FitCountryBounds({ country }) {
  const map = useMap()

  useEffect(() => {
    if (!country) return
    const { bounds, zoom, padding } = getViewportSettings(country)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding, maxZoom: zoom, animate: false })
    }
  }, [country, map])

  return null
}

function GuessHistory({ guesses }) {
  if (guesses.length === 0) {
    return <p className="border-guess-empty">Aucune tentative pour l'instant.</p>
  }

  return (
    <div className="border-guess-history">
      {[...guesses].reverse().map((guess, index) => (
        <div
          key={`${guess.value}-${index}`}
          className={`border-guess-chip ${guess.isCorrect ? 'border-guess-chip--correct' : 'border-guess-chip--wrong'}`}
        >
          <div className="border-guess-chip-main">
            <span>{guess.value}</span>
            {!guess.isCorrect && guess.distanceKm != null && (
              <div className="border-guess-hint">
                {guess.direction && guess.directionArrow && (
                  <span className="border-guess-arrow" aria-hidden="true">
                    {guess.directionArrow}
                  </span>
                )}
                <small>
                  {guess.distanceKm.toLocaleString('fr-FR')} km
                  {guess.direction ? ` • ${guess.direction}` : ''}
                </small>
              </div>
            )}
          </div>
          <strong>{guess.isCorrect ? 'Trouvé' : 'Raté'}</strong>
        </div>
      ))}
    </div>
  )
}

export default function BorderGuessPage() {
  const location = useLocation()
  const mode = location.state?.mode ?? 'daily'
  const {
    currentCountry,
    inputValue,
    setInputValue,
    guesses,
    isSolved,
    isLost,
    isComplete,
    answerName,
    filteredCountrySuggestions,
    dailyKey,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    goHome,
    hasStarted,
    startGame,
    elapsedTime,
  } = useBorderGuessState(mode)

  const title = mode === 'daily' ? 'BorderGuess Journalier' : 'BorderGuess Infini'
  const subtitle =
    mode === 'daily'
      ? `Un seul pays par jour, partagé pour tout le monde. Puzzle du ${dailyKey ?? 'jour'}.`
      : 'Enchaîne autant de silhouettes que tu veux, sans attendre demain.'
  const trimmedInputValue = inputValue.trim()
  const shouldShowSuggestions =
    !isComplete &&
    filteredCountrySuggestions.length > 0 &&
    !filteredCountrySuggestions.some((countryName) => countryName === trimmedInputValue)

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSubmit()
    }
  }

  const displayCountry = currentCountry ? getFocusCountry(currentCountry) : null

  return (
    <div className="border-guess-page">
      <NavBar />
      <main className="border-guess-main">
        <section className="border-guess-panel border-guess-panel--hero">
          <div>
            <p className="border-guess-eyebrow">Nouveau jeu</p>
            <h1>{title}</h1>
            <p className="border-guess-subtitle">{subtitle}</p>
          </div>
          <div className="border-guess-stats">
            <div className="border-guess-stat">
              <span className="border-guess-stat-value">{guesses.length}</span>
              <span className="border-guess-stat-label">Tentatives</span>
            </div>
          </div>
        </section>

        <section className="border-guess-layout">
          <div className="border-guess-panel border-guess-panel--map">
            <div className="border-guess-map-frame">
              {mode === 'daily' && !hasStarted ? (
                <div className="daily-map-placeholder">
                  Lance le chrono pour révéler les frontières.
                </div>
              ) : currentCountry ? (
                <MapContainer
                  key={currentCountry.properties.ADMIN}
                  className="border-guess-map"
                  center={[20, 0]}
                  zoom={2}
                  zoomControl={false}
                  attributionControl={false}
                  dragging={false}
                  doubleClickZoom={false}
                  scrollWheelZoom={false}
                  boxZoom={false}
                  keyboard={false}
                  touchZoom={false}
                >
                  <GeoJSON data={displayCountry} style={() => getCountryStyle(currentCountry)} />
                  <FitCountryBounds country={currentCountry} />
                </MapContainer>
              ) : null}
            </div>
            <p className="border-guess-map-caption">
              Observe uniquement les frontières du pays, puis propose ta réponse.
            </p>
          </div>

          <div className="border-guess-panel border-guess-panel--side">
            <div className="border-guess-input-wrap">
              {mode === 'daily' && !hasStarted && !isComplete && (
                <button className="daily-start-btn" onClick={startGame}>
                  Démarrer le chrono
                </button>
              )}
              <label htmlFor="border-guess-input" className="border-guess-label">
                Ton pays
              </label>
              <div className="border-guess-input-overlay">
                <input
                  id="border-guess-input"
                  className="border-guess-input"
                  type="text"
                  placeholder="Ex : Japon, Brésil, Maroc..."
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={isComplete || (mode === 'daily' && !hasStarted)}
                />
                {shouldShowSuggestions && (
                  <div className="border-guess-suggestions">
                    {filteredCountrySuggestions.map((countryName) => (
                      <button
                        key={countryName}
                        type="button"
                        className="border-guess-suggestion"
                        onClick={() => setInputValue(countryName)}
                      >
                        {countryName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="border-guess-submit"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isComplete || (mode === 'daily' && !hasStarted)}
              >
                Valider
              </button>
            </div>

            <GuessHistory guesses={guesses} />

            <div className={`border-guess-result${isSolved ? ' border-guess-result--win' : isLost ? ' border-guess-result--lose' : ''}`}>
              {isSolved && <p>Bien joué, la bonne réponse était <strong>{answerName}</strong>.</p>}
              {isLost && (
                <p>
                  La bonne réponse était <strong>{answerName}</strong>.
                  {mode === 'daily' ? ' Reviens demain pour un nouveau pays.' : ' Lance un nouveau pays pour continuer.'}
                </p>
              )}
            </div>

            {isSolved && mode === 'daily' && (
              <>
                <DailyForm
                  attempts={guesses.length}
                  elapsedTime={elapsedTime}
                  guesses={guesses.map((g) => g.value)}
                  gameType={GAME_TYPES.BORDER_GUESS}
                  dailyKey={dailyKey}
                />
                <DailyLeaderboard gameType={GAME_TYPES.BORDER_GUESS} />
              </>
            )}

            <div className="border-guess-actions">
              <button className="border-guess-secondary" onClick={goHome}>
                Retour à l'accueil
              </button>
              {!isComplete && (mode !== 'daily' || hasStarted) && (
                <button className="border-guess-secondary border-guess-secondary--warning" onClick={revealCountry}>
                  Révéler le pays
                </button>
              )}
              {mode === 'infinite' && (
                <button className="border-guess-primary border-guess-action-button" onClick={startNextInfiniteRound}>
                  Nouveau pays
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1800} theme="dark" hideProgressBar />
    </div>
  )
}
