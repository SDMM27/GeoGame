import React from 'react'
import { useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import NavBar from '../components/NavBar'
import useCountryClueState from '../hooks/useCountryClueState'
import CountryClueMap from './CountryClueMap'
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
import 'react-toastify/dist/ReactToastify.css'
import './CountryCluePage.css'

function GuessRow({ guess }) {
  return (
    <article className={`country-clue-row${guess.isCorrect ? ' country-clue-row--correct' : ''}`}>
      <div className="country-clue-row-main">
        <strong>{guess.value}</strong>
      </div>

      <div className="country-clue-metric">
        <span className="country-clue-metric-label">Distance</span>
        <strong>{guess.distanceKm?.toLocaleString('fr-FR')} km</strong>
      </div>

      <div className="country-clue-metric">
        <span className="country-clue-metric-label">Direction</span>
        <strong>{guess.directionArrow} {guess.direction}</strong>
      </div>

      <div className={`country-clue-metric country-clue-metric--${guess.hemisphereHint.tone}`}>
        <span className="country-clue-metric-label">Hémisphère</span>
        <strong>{guess.hemisphereHint.arrow} {guess.hemisphereHint.label}</strong>
      </div>

      <div className={`country-clue-metric country-clue-metric--${guess.areaHint.tone}`}>
        <span className="country-clue-metric-label">Surface</span>
        <strong>{guess.areaHint.arrow} {guess.areaHint.label}</strong>
        <small>{guess.areaLabel}</small>
      </div>

      <div className={`country-clue-metric country-clue-metric--${guess.populationHint.tone}`}>
        <span className="country-clue-metric-label">Population</span>
        <strong>{guess.populationHint.arrow} {guess.populationHint.label}</strong>
        <small>{guess.populationLabel}</small>
      </div>
    </article>
  )
}

export default function CountryCluePage() {
  const location = useLocation()
  const mode = location.state?.mode ?? 'daily'
  const {
    inputValue,
    setInputValue,
    guesses,
    isSolved,
    isLost,
    isComplete,
    answerName,
    answerFlag,
    answerCapital,
    filteredCountrySuggestions,
    dailyKey,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    goHome,
    hasStarted,
    startGame,
    elapsedTime,
  } = useCountryClueState(mode)

  const title = mode === 'daily' ? 'Country Clue Journalier' : 'Country Clue Infini'
  const subtitle =
    mode === 'daily'
      ? `Un pays mystère à retrouver aujourd'hui. Puzzle du ${dailyKey ?? 'jour'}.`
      : 'Une version libre inspirée de Countryle, à enchaîner sans limite.'
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

  return (
    <div className="country-clue-page">
      <NavBar />
      <main className="country-clue-main">
        <section className="country-clue-hero">
          <div>
            <p className="country-clue-eyebrow">Nouveau jeu</p>
            <h1>{title}</h1>
            <p className="country-clue-subtitle">{subtitle}</p>
          </div>
          <div className="country-clue-stat-strip">
            <div className="country-clue-stat">
              <span>{guesses.length}</span>
              <small>Tentatives</small>
            </div>
          </div>
        </section>

        <section className="country-clue-layout">
          <div className="country-clue-panel country-clue-panel--play">
            <div className="country-clue-intro-card">
              <h2>Devine le pays</h2>
              <p>
                Chaque proposition révèle la distance, la direction, l’hémisphère
                et un repère de surface pour t’aider à converger vers le bon pays.
              </p>
            </div>

            <div className="country-clue-input-block">
              {mode === 'daily' && !hasStarted && !isComplete && (
                <button className="daily-start-btn" onClick={startGame}>
                  Démarrer le chrono
                </button>
              )}
              <label htmlFor="country-clue-input">Ta proposition</label>
              <div className="country-clue-input-overlay">
                <input
                  id="country-clue-input"
                  className="country-clue-input"
                  type="text"
                  placeholder="Ex : Canada, Japon, Maroc..."
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={isComplete || (mode === 'daily' && !hasStarted)}
                />
                {shouldShowSuggestions && (
                  <div className="country-clue-suggestions">
                    {filteredCountrySuggestions.map((countryName) => (
                      <button
                        key={countryName}
                        type="button"
                        className="country-clue-suggestion"
                        onClick={() => setInputValue(countryName)}
                      >
                        {countryName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="country-clue-submit"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isComplete || (mode === 'daily' && !hasStarted)}
              >
                Valider
              </button>
            </div>

            {isComplete && (
              <CountryClueMap guesses={guesses} answerName={answerName} isLost={isLost} />
            )}

            <div className="country-clue-history">
              {guesses.length === 0 ? (
                <p className="country-clue-empty">Aucune tentative pour l’instant.</p>
              ) : (
                [...guesses].reverse().map((guess, index) => <GuessRow key={`${guess.value}-${index}`} guess={guess} />)
              )}
            </div>
          </div>

          <aside className="country-clue-panel country-clue-panel--side">
            <div className={`country-clue-result${isSolved ? ' country-clue-result--win' : isLost ? ' country-clue-result--lose' : ''}`}>
              {isSolved && (
                <>
                  <span className="country-clue-flag" aria-hidden="true">{answerFlag}</span>
                  <h3>{answerName}</h3>
                  <p>Bien joué. Capitale: <strong>{answerCapital || 'Inconnue'}</strong>.</p>
                </>
              )}
              {isLost && (
                <>
                  <span className="country-clue-flag" aria-hidden="true">{answerFlag}</span>
                  <h3>{answerName}</h3>
                  <p>Capitale: <strong>{answerCapital || 'Inconnue'}</strong>.</p>
                </>
              )}
              {!isComplete && (
                <>
                  <h3>Comment lire les indices</h3>
                  <p>Direction pointe vers le pays cible. Hémisphère indique la position par rapport à l'équateur. Surface et Population indiquent si le pays recherché est plus grand/petit ou plus/moins peuplé.</p>
                </>
              )}
            </div>

            {isSolved && mode === 'daily' && (
              <>
                <DailyForm
                  attempts={guesses.length}
                  elapsedTime={elapsedTime}
                  guesses={guesses.map((g) => g.value)}
                  gameType={GAME_TYPES.COUNTRY_CLUE}
                  dailyKey={dailyKey}
                />
                <DailyLeaderboard gameType={GAME_TYPES.COUNTRY_CLUE} />
              </>
            )}

            <div className="country-clue-actions">
              <button className="country-clue-secondary" onClick={goHome}>
                Retour à l'accueil
              </button>
              {!isComplete && (mode !== 'daily' || hasStarted) && (
                <button className="country-clue-secondary country-clue-secondary--warning" onClick={revealCountry}>
                  Révéler le pays
                </button>
              )}
              {mode === 'infinite' && (
                <button className="country-clue-primary" onClick={startNextInfiniteRound}>
                  Nouveau pays
                </button>
              )}
            </div>
          </aside>
        </section>
      </main>

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1800} theme="dark" hideProgressBar />
    </div>
  )
}
