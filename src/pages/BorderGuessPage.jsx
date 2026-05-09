import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import { ToastContainer } from 'react-toastify'
import { getCountryName } from '../utils/getCountryName'
import NavBar from '../components/NavBar'
import ShareScoreButton from '../components/ShareScoreButton'
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

function GuessHistory({ guesses, t, i18n }) {
  if (guesses.length === 0) {
    return <p className="border-guess-empty">{t('labels.no_attempts')}</p>
  }

  return (
    <div className="border-guess-history">
      {[...guesses].reverse().map((guess, index) => (
        <div
          key={`${guess.value}-${index}`}
          className={`border-guess-chip ${guess.isCorrect ? 'border-guess-chip--correct' : 'border-guess-chip--wrong'}`}
        >
          <div className="border-guess-chip-main">
            <span>{(guess.iso && getCountryName(guess.iso, i18n.language)) || guess.value}</span>
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
          <strong>{guess.isCorrect ? t('labels.found') : t('labels.missed')}</strong>
        </div>
      ))}
    </div>
  )
}

export default function BorderGuessPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const mode = location.state?.mode ?? 'daily'
  const {
    currentCountry,
    currentCountryISO,
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

  const localizedAnswerName = getCountryName(currentCountryISO, i18n.language) || answerName

  const title = mode === 'daily' ? t('borderguess.daily_title') : t('borderguess.infinite_title')
  const subtitle =
    mode === 'daily'
      ? t('borderguess.daily_subtitle')
      : t('borderguess.infinite_subtitle')
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
            <p className="border-guess-eyebrow">{t('labels.new_game')}</p>
            <h1>{title}</h1>
            <p className="border-guess-subtitle">{subtitle}</p>
          </div>
          <div className="border-guess-stats">
            <div className="border-guess-stat">
              <span className="border-guess-stat-value">{guesses.length}</span>
              <span className="border-guess-stat-label">{t('labels.attempts')}</span>
            </div>
          </div>
        </section>

        <section className="border-guess-layout">
          <div className="border-guess-panel border-guess-panel--map">
            <div className="border-guess-map-frame">
              {mode === 'daily' && !hasStarted ? (
                <div className="daily-map-placeholder">
                  {t('borderguess.start_timer_hint')}
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
              {t('borderguess.map_caption')}
            </p>
          </div>

          <div className="border-guess-panel border-guess-panel--side">
            <div className="border-guess-input-wrap">
              {mode === 'daily' && !hasStarted && !isComplete && (
                <button className="daily-start-btn" onClick={startGame}>
                  {t('buttons.start_timer')}
                </button>
              )}
              <label htmlFor="border-guess-input" className="border-guess-label">
                {t('labels.your_country')}
              </label>
              <div className="border-guess-input-overlay">
                <input
                  id="border-guess-input"
                  className="border-guess-input"
                  type="text"
                  placeholder={t('placeholders.country_examples')}
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
                {t('buttons.validate')}
              </button>
            </div>

            <GuessHistory guesses={guesses} t={t} i18n={i18n} />

            {isComplete && (
              <ShareScoreButton
                score={guesses.length}
                gameType="BORDER_GUESS"
                difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
                scoreLabel={t('share.score_attempts')}
                details={isSolved
                  ? t('share.details_found_attempts', { count: guesses.length })
                  : t('share.details_not_found_attempts', { count: guesses.length })}
              />
            )}

            <div className={`border-guess-result${isSolved ? ' border-guess-result--win' : isLost ? ' border-guess-result--lose' : ''}`}>
              {isSolved && <p>{t('borderguess.success_message')} <strong>{localizedAnswerName}</strong>.</p>}
              {isLost && (
                <p>
                  {t('borderguess.answer_was')} <strong>{localizedAnswerName}</strong>.
                  {mode === 'daily' ? ` ${t('borderguess.see_tomorrow')}` : ` ${t('borderguess.start_new_game')}`}
                </p>
              )}
            </div>

            {isComplete && mode === 'daily' && (
              <>
                {isSolved && (
                  <DailyForm
                    attempts={guesses.length}
                    elapsedTime={elapsedTime}
                    guesses={guesses.map((g) => g.value)}
                    gameType={GAME_TYPES.BORDER_GUESS}
                    dailyKey={dailyKey}
                  />
                )}
                <DailyLeaderboard gameType={GAME_TYPES.BORDER_GUESS} dailyKey={dailyKey} />
              </>
            )}

            <div className="border-guess-actions">
              <button className="border-guess-secondary" onClick={goHome}>
                {t('buttons.return_home')}
              </button>
              {!isComplete && (mode !== 'daily' || hasStarted) && (
                <button className="border-guess-secondary border-guess-secondary--warning" onClick={revealCountry}>
                  {t('buttons.reveal_country')}
                </button>
              )}
              {mode === 'infinite' && (
                <button className="border-guess-primary border-guess-action-button" onClick={startNextInfiniteRound}>
                  {t('buttons.new_country')}
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
