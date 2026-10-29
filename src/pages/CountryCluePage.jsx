import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import NavBar from '../components/NavBar'
import ShareScoreButton from '../components/ShareScoreButton'
import ChallengeBanner from '../components/ChallengeBanner'
import { resolveMode } from '../utils/challenge'
import useCountryClueState from '../hooks/useCountryClueState'
import CountryClueMap from './CountryClueMap'
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
import { useAccount, useRecordGame } from '../auth'
import { useDailyPlayedElsewhere } from '../hooks/useDailyPlayedElsewhere'
import useDesktopAutofocus from '../hooks/useDesktopAutofocus'
import DailyPlayedElsewhere from '../components/DailyPlayedElsewhere'
import { getCountryName } from '../utils/getCountryName'
import { localeOf } from '../i18n/languages'
import { clueProgress } from '../utils/clueProgress'
import ClueProgressBadges from '../components/ClueProgressBadges'
import 'react-toastify/dist/ReactToastify.css'
import './CountryCluePage.css'

// The hook's labels are French: show the one of the tone instead, as the app does
const hintLabel = (t, metric, guess, hint) =>
  guess.isCorrect ? t('country_clue.hint.exact') : t(`country_clue.hint.${metric}_${hint.tone}`, hint.label)

function GuessRow({ guess, lang, progress }) {
  const { t } = useTranslation()
  const displayName =
    guess.isoA2 && lang
      ? (getCountryName(guess.isoA2, lang) ?? guess.value)
      : guess.value

  return (
    <article className={`country-clue-row${guess.isCorrect ? ' country-clue-row--correct' : ''}`}>
      <div className="country-clue-row-main">
        <strong>{displayName}</strong>
        <ClueProgressBadges progress={progress} lang={lang} />
      </div>

      <div className="country-clue-metric">
        <span className="country-clue-metric-label">{t('country_clue.metric_distance')}</span>
        <strong>{guess.distanceKm?.toLocaleString(localeOf(lang))} km</strong>
      </div>

      <div className="country-clue-metric">
        <span className="country-clue-metric-label">{t('country_clue.metric_direction')}</span>
        <strong>{guess.directionArrow} {t(`country_clue.directions.${guess.direction}`, guess.direction)}</strong>
      </div>

      <div className={`country-clue-metric country-clue-metric--${guess.hemisphereHint.tone}`}>
        <span className="country-clue-metric-label">{t('country_clue.metric_hemisphere')}</span>
        <strong>{guess.hemisphereHint.arrow} {hintLabel(t, 'hemisphere', guess, guess.hemisphereHint)}</strong>
      </div>

      <div className={`country-clue-metric country-clue-metric--${guess.areaHint.tone}`}>
        <span className="country-clue-metric-label">{t('country_clue.metric_area')}</span>
        <strong>{guess.areaHint.arrow} {hintLabel(t, 'area', guess, guess.areaHint)}</strong>
        <small>{guess.areaLabel}</small>
      </div>

      <div className={`country-clue-metric country-clue-metric--${guess.populationHint.tone}`}>
        <span className="country-clue-metric-label">{t('country_clue.metric_population')}</span>
        <strong>{guess.populationHint.arrow} {hintLabel(t, 'population', guess, guess.populationHint)}</strong>
        <small>{guess.populationLabel}</small>
      </div>
    </article>
  )
}

export default function CountryCluePage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const mode = resolveMode(location, 'daily')
  const {
    inputValue,
    setInputValue,
    guesses,
    isSolved,
    isLost,
    isComplete,
    answerName,
    answerCapital,
    currentCountryISO,
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
  const progressByGuess = clueProgress(guesses)
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.COUNTRY_CLUE,
    dailyKey,
    started: hasStarted || guesses.length > 0 || isComplete,
    enabled: mode === 'daily',
  })

  useRecordGame(
    isComplete && mode === 'daily'
      ? { gameType: GAME_TYPES.COUNTRY_CLUE, mode: 'daily', dailyKey, solved: isSolved, attempts: guesses.length, elapsedTime }
      : null
  )

  const inputRef = useRef(null)
  useDesktopAutofocus(inputRef, !isComplete && (mode !== 'daily' || hasStarted), `${answerName}-${guesses.length}`)

  const lang = i18n.language
  const translatedAnswerName =
    currentCountryISO
      ? (getCountryName(currentCountryISO, lang) ?? answerName)
      : answerName

  const title = mode === 'daily' ? t('country_clue.daily_title') : t('country_clue.infinite_title')
  const subtitle =
    mode === 'daily'
      ? t('country_clue.daily_subtitle')
      : t('country_clue.infinite_subtitle')
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

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={title} game={elsewhere.game}>
        {elsewhere.game && (
          <section className="daily-form">
            <div className={`country-clue-result country-clue-result--${elsewhere.game.solved === false ? 'lose' : 'win'}`}>
              {currentCountryISO && <img className="country-clue-flag" src={`/flags/${currentCountryISO.toLowerCase()}.png`} alt="" />}
              <h3>{translatedAnswerName}</h3>
              <p>{t('labels.capital')} <strong>{answerCapital || t('labels.unknown')}</strong>.</p>
            </div>
            <CountryClueMap guesses={[]} answerName={answerName} isLost focusAnswer />
          </section>
        )}
        <DailyLeaderboard gameType={GAME_TYPES.COUNTRY_CLUE} dailyKey={dailyKey} />
      </DailyPlayedElsewhere>
    )
  }

  return (
    <div className="country-clue-page">
      <NavBar />
      <main className="country-clue-main">
        {mode === 'daily' && (
          <ChallengeBanner
            gameType="COUNTRY_CLUE"
            dailyKey={dailyKey}
            result={isComplete ? { score: guesses.length, solved: isSolved } : null}
          />
        )}
        <section className="country-clue-hero">
          <div>
            <p className="country-clue-eyebrow">{t('labels.new_game')}</p>
            <h1>{title}</h1>
            <p className="country-clue-subtitle">{subtitle}</p>
          </div>
          <div className="country-clue-stat-strip">
            <div className="country-clue-stat">
              <span>{guesses.length}</span>
              <small>{t('labels.attempts')}</small>
            </div>
          </div>
        </section>

        <section className="country-clue-layout">
          <div className="country-clue-panel country-clue-panel--play">
            <div className="country-clue-intro-card">
              <h2>{t('country_clue.guess_title')}</h2>
              <p>
                {t('country_clue.intro_text')}
              </p>
            </div>

            <div className="country-clue-input-block">
              {mode === 'daily' && !hasStarted && !isComplete && (
                <button className="daily-start-btn" onClick={startGame}>
                  {t('buttons.start_timer')}
                </button>
              )}
              <label htmlFor="country-clue-input">{t('labels.your_guess')}</label>
              <div className="country-clue-input-overlay">
                <input
                  id="country-clue-input"
                  ref={inputRef}
                  className="country-clue-input"
                  type="text"
                  placeholder={t('placeholders.country_examples_clue')}
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
                {t('buttons.validate')}
              </button>
            </div>

            {isComplete && (
              <CountryClueMap guesses={guesses} answerName={answerName} isLost={isLost} />
            )}

            {isComplete && (
              <ShareScoreButton
                score={guesses.length}
                gameType="COUNTRY_CLUE"
                difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
                scoreLabel={t('share.score_attempts')}
                details={isSolved
                  ? t('share.details_found_attempts', { count: guesses.length })
                  : t('share.details_not_found_attempts', { count: guesses.length })}
                challenge={mode === 'daily' ? { route: '/country-clue', dailyKey, solved: isSolved } : null}
                nudge={mode === 'daily'}
              />
            )}

            <div className="country-clue-history">
              {guesses.length === 0 ? (
                <p className="country-clue-empty">{t('labels.no_attempts')}</p>
              ) : (
                guesses
                  .map((guess, index) => ({ guess, index, progress: progressByGuess[index] }))
                  .reverse()
                  .map(({ guess, index, progress }) => <GuessRow key={`${guess.value}-${index}`} guess={guess} lang={lang} progress={progress} />)
              )}
            </div>
          </div>

          <aside className="country-clue-panel country-clue-panel--side">
            <div className={`country-clue-result${isSolved ? ' country-clue-result--win' : isLost ? ' country-clue-result--lose' : ''}`}>
              {isSolved && (
                <>
                  {currentCountryISO && <img className="country-clue-flag" src={`/flags/${currentCountryISO.toLowerCase()}.png`} alt="" />}
                  <h3>{translatedAnswerName}</h3>
                  <p>{t('country_clue.correct')} {t('labels.capital')} <strong>{answerCapital || t('labels.unknown')}</strong>.</p>
                </>
              )}
              {isLost && (
                <>
                  {currentCountryISO && <img className="country-clue-flag" src={`/flags/${currentCountryISO.toLowerCase()}.png`} alt="" />}
                  <h3>{translatedAnswerName}</h3>
                  <p>{t('labels.capital')} <strong>{answerCapital || t('labels.unknown')}</strong>.</p>
                </>
              )}
              {!isComplete && (
                <>
                  <h3>{t('labels.how_to_read_hints')}</h3>
                  <p>{t('country_clue.hints_explanation')}</p>
                </>
              )}
            </div>

            {isComplete && mode === 'daily' && (
              <>
                {isSolved && (
                  <DailyForm
                    attempts={guesses.length}
                    elapsedTime={elapsedTime}
                    guesses={guesses.map((g) => g.value)}
                    gameType={GAME_TYPES.COUNTRY_CLUE}
                    dailyKey={dailyKey}
                  />
                )}
                <DailyLeaderboard gameType={GAME_TYPES.COUNTRY_CLUE} dailyKey={dailyKey} />
              </>
            )}

            <div className="country-clue-actions">
              <button className="country-clue-secondary" onClick={goHome}>
                {t('buttons.return_home')}
              </button>
              {!isComplete && (mode !== 'daily' || hasStarted) && (
                <button className="country-clue-secondary country-clue-secondary--warning" onClick={revealCountry}>
                  {t('buttons.reveal_country')}
                </button>
              )}
              {mode === 'infinite' && (
                <button className="country-clue-primary" onClick={startNextInfiniteRound}>
                  {t('buttons.new_country')}
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
