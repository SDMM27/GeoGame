// src/pages/CountryOfDayPage.jsx
// The Country of the Day: one country a day, the same for everyone, found in 4 steps (borders, flag, capital, place on
// the map) then read in its info sheet. Mode (multiple choice or typed) → 4 steps → result, sheet, leaderboard.
// The game itself is hooks/useCountryOfDayState.js, shared with the app.
import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GeoJSON, MapContainer } from 'react-leaflet'
import NavBar from '../components/NavBar'
import ShareScoreButton from '../components/ShareScoreButton'
import DailyPlayedElsewhere from '../components/DailyPlayedElsewhere'
import PlacementMap from '../components/countryOfDay/PlacementMap'
import CountryFactsSheet from '../components/countryOfDay/CountryFactsSheet'
import CountryOfDayForm from '../components/countryOfDay/CountryOfDayForm'
import CountryOfDayLeaderboard from '../components/countryOfDay/CountryOfDayLeaderboard'
import useCountryOfDayState from '../hooks/useCountryOfDayState'
import useDesktopAutofocus from '../hooks/useDesktopAutofocus'
import { useDailyPlayedElsewhere } from '../hooks/useDailyPlayedElsewhere'
import { useAccount, useRecordGame } from '../auth'
import { GAME_TYPES } from '../utils/gameTypes'
import { COUNTRY_OF_DAY_MAX_SCORE, COUNTRY_OF_DAY_STEPS, countryOfDayShareLine, stepPoints } from '../utils/countryOfDay'
import { countryDisplayName, getCountryInfo } from '../utils/countryInfo'
import { getCapitalName } from '../utils/getCountryName'
import { getCountryStyle, getFocusCountry } from '../utils/borderGuessMap'
import { formatTime } from '../utils/formatTime'
import { FitCountryBounds, GuessHistory } from './BorderGuessPage'
import 'leaflet/dist/leaflet.css'
import './QuizPage.css'
import './CountryOfDayPage.css'

const flagSrc = (country) => `/flags/${country.properties.ISO_A2.toLowerCase()}.png`

// The silhouette of the country, no names
function Silhouette({ country }) {
  const displayCountry = useMemo(() => getFocusCountry(country), [country])
  return (
    <div className="cod-silhouette">
      <MapContainer
        key={country.properties.ADMIN}
        className="cod-silhouette__map"
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
        <GeoJSON data={displayCountry} style={() => getCountryStyle(country)} />
        <FitCountryBounds country={country} />
      </MapContainer>
    </div>
  )
}

// A typed answer (the country, the capital): 'unknown' (a name that isn't a country) uses no try
function TypedAnswer({ placeholder, onSubmit, disabled }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [notice, setNotice] = useState(null)
  const inputRef = useRef(null)
  useDesktopAutofocus(inputRef, !disabled, 'typed')

  const submit = () => {
    if (!value.trim() || disabled) return
    const outcome = onSubmit(value)
    if (outcome === 'unknown') setNotice('unknown_country')
    else if (outcome === 'ignored') setNotice('already_tried')
    else setNotice(null)
    if (outcome !== 'unknown') setValue('')
    inputRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className="quiz-free">
      <input
        ref={inputRef}
        className="quiz-input"
        type="text"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        onChange={(event) => { setValue(event.target.value); setNotice(null) }}
        onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
      />
      {notice && <p className="cod-notice" role="status">{t(`country_of_day.${notice}`)}</p>}
      <div className="quiz-free-actions">
        <button className="quiz-btn quiz-btn--primary" onClick={submit} disabled={disabled || !value.trim()}>{t('country_of_day.submit')}</button>
      </div>
    </div>
  )
}

// Buttons of a step: the wrong ones are crossed out, the right one shows once the step is over
function ChoiceButtons({ choices, labelOf, wrong, game }) {
  const { resolved, answer } = game
  const right = game.country.properties.ADMIN
  return (
    <div className="quiz-choices">
      {choices.map((choice) => {
        const admin = choice.properties.ADMIN
        const isWrong = wrong.includes(admin)
        const state = resolved && admin === right ? ' quiz-choice--correct' : isWrong ? ' quiz-choice--wrong' : resolved ? ' quiz-choice--dim' : ''
        return (
          <button key={admin} className={`quiz-choice${state}`} disabled={resolved || isWrong} onClick={() => answer(admin)}>
            {labelOf(choice)}
          </button>
        )
      })}
    </div>
  )
}

function FlagChoices({ game }) {
  const { choices, wrong, resolved, answer, country } = game
  const right = country.properties.ADMIN
  return (
    <div className={`cod-flags cod-flags--${choices.length}`}>
      {choices.map((choice) => {
        const admin = choice.properties.ADMIN
        const isWrong = wrong.includes(admin)
        const state = resolved && admin === right ? ' cod-flag--correct' : isWrong ? ' cod-flag--wrong' : resolved ? ' cod-flag--dim' : ''
        return (
          <button key={admin} className={`cod-flag${state}`} disabled={resolved || isWrong} onClick={() => answer(admin)}>
            <img src={flagSrc(choice)} alt="" draggable="false" />
          </button>
        )
      })}
    </div>
  )
}

function StepBody({ game, lang }) {
  const { t } = useTranslation()
  const { step, choices, wrong, resolved, found, answer, country } = game
  const countryLabel = (feature) => countryDisplayName(feature, lang)
  const capitalLabel = (feature) => getCapitalName(feature.properties.ISO_A2, lang) || feature.properties.capital

  if (step === 'borders') {
    return (
      <>
        <Silhouette country={country} />
        {choices
          ? <ChoiceButtons choices={choices} labelOf={countryLabel} wrong={wrong} game={game} />
          : (
            <>
              {!resolved && <TypedAnswer placeholder={t('country_of_day.placeholder_country')} onSubmit={answer} />}
              {wrong.length > 0 && <GuessHistory guesses={wrong.map((guess) => (typeof guess === 'string' ? { value: guess } : guess))} t={t} i18n={{ language: lang }} />}
            </>
          )}
      </>
    )
  }
  if (step === 'flag') {
    return <FlagChoices game={game} />
  }
  if (step === 'capital') {
    return choices
      ? <ChoiceButtons choices={choices} labelOf={capitalLabel} wrong={wrong} game={game} />
      : (
        <>
          {!resolved && <TypedAnswer placeholder={t('country_of_day.placeholder_capital')} onSubmit={answer} />}
          {wrong.length > 0 && (
            <div className="cod-wrong-list">
              {wrong.map((text) => <span key={text} className="cod-wrong-chip">{text}</span>)}
            </div>
          )}
        </>
      )
  }
  return (
    <>
      {!resolved && <p className="quiz-muted cod-hint">{t('country_of_day.placement_hint')}</p>}
      <PlacementMap answer={country} wrong={wrong} resolved={resolved} found={found} onPick={answer} />
    </>
  )
}

function Playing({ game }) {
  const { t, i18n } = useTranslation()
  const { step, stepIndex, mode, resolved, found, triesLeft, steps, country, next } = game
  const lang = i18n.language
  const last = stepIndex === COUNTRY_OF_DAY_STEPS.length - 1
  const answerLabel =
    step === 'capital'
      ? getCapitalName(country.properties.ISO_A2, lang) || country.properties.capital
      : countryDisplayName(country, lang)

  return (
    <div className="quiz-page">
      <NavBar />
      <main className="quiz-main">
        <section className="quiz-card cod-card">
          <div className="quiz-badge-row">
            <span className="quiz-badge">{t('country_of_day.step', { n: stepIndex + 1, total: COUNTRY_OF_DAY_STEPS.length })}</span>
            <span className="cod-dots" aria-hidden="true">
              {COUNTRY_OF_DAY_STEPS.map((id, i) => (
                <span
                  key={id}
                  className={`cod-dot${steps[i] ? ' cod-dot--found' : i < stepIndex || (i === stepIndex && resolved) ? ' cod-dot--missed' : ''}${i === stepIndex ? ' cod-dot--current' : ''}`}
                />
              ))}
            </span>
            {!resolved && <span className="quiz-points">{t('country_of_day.tries_left', { count: triesLeft })}</span>}
          </div>
          <h1 className="quiz-question">{t(`country_of_day.step_${step}`)}</h1>

          <StepBody key={step} game={game} lang={lang} />

          {resolved && (
            <div className={`quiz-feedback quiz-feedback--${found ? 'correct' : 'wrong'}`} role="status">
              <strong>{found ? t('country_of_day.right') : t('country_of_day.missed', { answer: answerLabel })}</strong>
              {found && <p>{t('country_of_day.points', { count: stepPoints(steps[stepIndex], mode) })}</p>}
            </div>
          )}
          {resolved && (
            <div className="quiz-actions">
              <button className="quiz-btn quiz-btn--primary" onClick={next}>{t(last ? 'country_of_day.see_sheet' : 'country_of_day.next')}</button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function ModeChoice({ game }) {
  const { t } = useTranslation()
  return (
    <section className="quiz-card">
      <p className="quiz-daily-rules">{t('country_of_day.intro')}</p>
      <h2 className="quiz-card-title">{t('country_of_day.mode_title')}</h2>
      <div className="quiz-mode-tabs cod-modes">
        {['choice', 'free'].map((mode) => (
          <button key={mode} className="quiz-mode-tab cod-mode" onClick={() => game.chooseMode(mode)}>
            <strong>{t(`country_of_day.mode_${mode}`)}</strong>
            <small>{t(`country_of_day.mode_${mode}_desc`)}</small>
          </button>
        ))}
      </div>
      <p className="quiz-muted cod-locked">{t('country_of_day.mode_locked')}</p>
    </section>
  )
}

export default function CountryOfDayPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const game = useCountryOfDayState()
  const { dailyKey, phase, mode, steps, score, attempts, errors, solved, elapsedTime, country } = game
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.COUNTRY_OF_DAY,
    dailyKey,
    started: phase === 'playing' || phase === 'done',
  })
  const done = phase === 'done'
  const time = elapsedTime ?? 0

  useRecordGame(
    done
      ? {
        gameType: GAME_TYPES.COUNTRY_OF_DAY,
        mode: 'daily',
        dailyKey,
        score,
        attempts,
        errors,
        solved,
        elapsedTime: Math.round(time),
      }
      : null
  )

  const info = useMemo(() => (done && country ? getCountryInfo(country, i18n.language) : null), [done, country, i18n.language])
  const grid = done ? countryOfDayShareLine(steps) : ''
  const modeLabel = mode ? t(`country_of_day.mode_${mode}`) : ''

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={t('games.country_of_day.title')} game={elsewhere.game}>
        <CountryOfDayLeaderboard dailyKey={dailyKey} />
      </DailyPlayedElsewhere>
    )
  }

  if (phase === 'playing') return <Playing game={game} />

  return (
    <div className="quiz-page">
      <NavBar />
      <main className="quiz-main">
        <header className="quiz-header">
          <h1>{t('games.country_of_day.title')}</h1>
        </header>

        {phase === 'loading' && <p className="quiz-muted">{t('messages.loading')}</p>}
        {phase === 'mode' && <ModeChoice game={game} />}

        {done && (
          <>
            <section className="quiz-card cod-result">
              <div className="cod-score">
                <strong>{score}</strong>
                <span>/{COUNTRY_OF_DAY_MAX_SCORE[mode]}</span>
              </div>
              <p className="cod-result__label">{t('country_of_day.score', { score, max: COUNTRY_OF_DAY_MAX_SCORE[mode] })}</p>
              <p className="cod-result__label">{t('country_of_day.mode_played', { mode: modeLabel })} · <strong>{formatTime(time)}</strong></p>
              <p className="cod-share-line">{grid}</p>
            </section>

            {info && <CountryFactsSheet info={info} />}

            <ShareScoreButton
              score={score}
              gameType={GAME_TYPES.COUNTRY_OF_DAY}
              difficulty="Daily"
              scoreLabel={t('units.pts').toUpperCase()}
              scoreText={`${score}/${COUNTRY_OF_DAY_MAX_SCORE[mode]}`}
              details={modeLabel}
              grid={grid}
            />
            <CountryOfDayForm mode={mode} steps={steps} score={score} elapsedTime={time} dailyKey={dailyKey} />
            <CountryOfDayLeaderboard dailyKey={dailyKey} />
            <p className="quiz-muted cod-come-back">{t('country_of_day.come_back')}</p>
          </>
        )}

        <div className="quiz-actions">
          <button className="quiz-btn" onClick={() => navigate('/')}>{t('buttons.return_home')}</button>
        </div>
      </main>
    </div>
  )
}
