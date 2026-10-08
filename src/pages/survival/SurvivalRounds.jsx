// The rounds of a survival run, one component per kind of game. Each one only shows the round and sends the
// answers to useSurvivalState; lives, score and the next round are handled by SurvivalGame.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet'
import countries from '../../data/countriesWithDifficulty_FR.json'
import { BORDER_GUESS_COUNTRIES } from '../../hooks/useBorderGuessState'
import { DARK_NOLABELS_TILE_URL } from '../../mapTiles'
import { getCountryStyle, getFocusCountry } from '../../utils/borderGuessMap'
import { GAME_TYPES } from '../../utils/gameTypes'
import { getCapitalName, getCountryName } from '../../utils/getCountryName'
import { normalize } from '../../utils/normalizeAnswer'
import { localizeQuestion } from '../../utils/quizQuestions'
import { matchesWhileTyping } from '../../utils/survival'
import { FitCountryBounds, GuessHistory } from '../BorderGuessPage'
import SmallCountryCircles from '../game/SmallCountryCircles'
import '../BorderGuessPage.css'
import '../QuizPage.css'

const countryLabel = (country, lang) => getCountryName(country.properties.ISO_A2, lang) || country.properties.ADMIN

/** What the right answer of a round reads like, in the player's language. */
export function roundAnswer(round, lang, t) {
  if (!round) return ''
  if (round.type === GAME_TYPES.QUIZ) return localizeQuestion(round.question, lang, t).answer
  if (round.type === GAME_TYPES.CAPITALS) {
    const p = round.country.properties
    return getCapitalName(p.ISO_A2, lang) || p.capital
  }
  return countryLabel(round.country, lang)
}

// ─── Placement: click the country on the map ──────────────────────────────

const MAP_STYLE = { fillColor: 'transparent', color: '#94a3b8', fillOpacity: 1, weight: 1 }
const MAP_HOVER = { fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 }
const MAP_WRONG = { fillColor: '#ff4d4d', color: '#fca5a5', weight: 2, fillOpacity: 0.45 }
const MAP_RIGHT = { fillColor: '#4ade80', color: '#86efac', weight: 2, fillOpacity: 0.6 }
const MAP_MISSED = { fillColor: '#fbbf24', color: '#fde68a', weight: 2, fillOpacity: 0.6 }

export function PlacementRound({ survival }) {
  const { i18n } = useTranslation()
  const { round, wrongPicks, outcome, clickCountry } = survival
  const [map, setMap] = useState(null)
  const geoJsonRef = useRef(null)
  const target = round.country.properties.ADMIN
  // SmallCountryCircles hides the tiny countries already played: none here, the wrong ones stay clickable
  const foundRef = useRef(new Set())
  const shownRef = useRef(new Set())
  const stateRef = useRef({})
  stateRef.current = { wrongPicks, outcome, target, clickCountry }

  const styleOf = (name) => {
    const { wrongPicks: wrong, outcome: done, target: answer } = stateRef.current
    if (done && name === answer) return done === 'correct' ? MAP_RIGHT : MAP_MISSED
    if (wrong.includes(name)) return MAP_WRONG
    return MAP_STYLE
  }

  useEffect(() => {
    geoJsonRef.current?.getLayers().forEach((layer) => layer.setStyle(styleOf(layer.feature.properties.ADMIN)))
  }, [wrongPicks, outcome, target]) // eslint-disable-line react-hooks/exhaustive-deps

  // A new country: back to the world view. A missed one: show where it was.
  useEffect(() => {
    if (map) map.setView([20, 0], 2.5, { animate: false })
  }, [map, target])

  useEffect(() => {
    if (!map || outcome !== 'failed') return
    const layer = geoJsonRef.current?.getLayers().find((l) => l.feature.properties.ADMIN === target)
    if (layer) map.flyToBounds(layer.getBounds(), { maxZoom: 6, duration: 0.8 })
  }, [map, outcome, target])

  return (
    <div className="survival-map">
      <div className="survival-target">{countryLabel(round.country, i18n.language)}</div>
      <MapContainer
        center={[20, 0]}
        zoom={2.5}
        zoomSnap={0.25}
        minZoom={2}
        scrollWheelZoom
        zoomControl={false}
        doubleClickZoom={false}
        attributionControl={false}
        style={{ position: 'absolute', inset: 0 }}
        whenReady={({ target: leafletMap }) => {
          setMap(leafletMap)
          leafletMap.getContainer().style.background = 'var(--bg-primary)'
          setTimeout(() => leafletMap.invalidateSize(), 100)
        }}
      >
        <TileLayer url={DARK_NOLABELS_TILE_URL} minZoom={2} maxZoom={20} />
        <GeoJSON
          ref={geoJsonRef}
          data={countries.features}
          style={(feature) => styleOf(feature.properties.ADMIN)}
          onEachFeature={(feature, layer) => {
            const name = feature.properties.ADMIN
            layer.on({
              click: () => stateRef.current.clickCountry(name),
              mouseover: () => { if (styleOf(name) === MAP_STYLE) layer.setStyle(MAP_HOVER) },
              mouseout: () => layer.setStyle(styleOf(name)),
            })
          }}
        />
        <SmallCountryCircles
          onCountryNameClick={(name) => stateRef.current.clickCountry(name)}
          foundCountriesRef={foundRef}
          shownCountriesRef={shownRef}
        />
      </MapContainer>
    </div>
  )
}

// ─── Flags / Capitals: type the answer ─────────────────────────────────────

function AnswerInput({ survival, placeholder, onSubmit, autoSubmit = null, suggestions = null }) {
  const { t } = useTranslation()
  const { isPlaying, roundIndex } = survival
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [roundIndex])

  const submit = (text = value) => {
    if (!text.trim()) return
    const result = onSubmit(text)
    if (result === 'wrong' || result === 'correct') setValue('')
  }

  useEffect(() => {
    if (autoSubmit && isPlaying && autoSubmit(value)) submit()
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    if (!suggestions) return []
    const query = normalize(value)
    if (!query) return []
    const matches = suggestions.filter((name) => normalize(name).includes(query)).slice(0, 8)
    return matches.includes(value.trim()) ? [] : matches
  }, [suggestions, value])

  return (
    <div className="survival-input-row">
      <div className="survival-input-wrap">
        <input
          ref={inputRef}
          className="survival-input"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          disabled={!isPlaying}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
        />
        {isPlaying && shown.length > 0 && (
          <div className="survival-suggestions">
            {shown.map((name) => (
              <button key={name} type="button" className="survival-suggestion" onClick={() => { setValue(name); inputRef.current?.focus() }}>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="survival-submit" onClick={() => submit()} disabled={!isPlaying || !value.trim()} aria-label={t('buttons.validate')}>
        →
      </button>
    </div>
  )
}

export function TypedRound({ survival, onSubmit }) {
  const { t, i18n } = useTranslation()
  const { round } = survival
  const p = round.country.properties
  const isCapital = round.type === GAME_TYPES.CAPITALS

  return (
    <div className="survival-typed">
      <img src={`/flags/${p.ISO_A2.toLowerCase()}.png`} alt="?" className="survival-flag" />
      {isCapital && <p className="survival-country-name">{countryLabel(round.country, i18n.language)}</p>}
      <AnswerInput
        survival={survival}
        placeholder={t(isCapital ? 'survival.capital_placeholder' : 'placeholders.country_name')}
        onSubmit={onSubmit}
        autoSubmit={(value) => matchesWhileTyping(round, value)}
      />
    </div>
  )
}

// ─── Border Guess: one guess from the silhouette ───────────────────────────

function useCountrySuggestions(pool) {
  const { i18n } = useTranslation()
  return useMemo(() => {
    const lang = i18n.language
    const names = new Set(pool.map((country) => countryLabel(country, lang)))
    return [...names].sort((a, b) => a.localeCompare(b, lang))
  }, [pool, i18n.language])
}

export function BorderRound({ survival, onSubmit }) {
  const { t, i18n } = useTranslation()
  const { round, guesses } = survival
  const suggestions = useCountrySuggestions(BORDER_GUESS_COUNTRIES)
  const focus = useMemo(() => getFocusCountry(round.country), [round.country])

  return (
    <div className="survival-guess">
      <div className="survival-silhouette">
        <MapContainer
          key={round.country.properties.ADMIN}
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
          <GeoJSON data={focus} style={() => getCountryStyle(round.country)} />
          <FitCountryBounds country={round.country} />
        </MapContainer>
      </div>
      <AnswerInput survival={survival} placeholder={t('placeholders.country_examples')} onSubmit={onSubmit} suggestions={suggestions} />
      <GuessHistory guesses={guesses} t={t} i18n={i18n} />
    </div>
  )
}

// ─── Quiz: one multiple-choice question ────────────────────────────────────

export function QuizRound({ survival }) {
  const { t, i18n } = useTranslation()
  const { round, outcome, wrongPicks, chooseAnswer, isPlaying } = survival
  const { question } = round
  const localized = useMemo(() => localizeQuestion(question, i18n.language, t), [question, i18n.language, t])

  // Keys 1-4 answer
  useEffect(() => {
    if (!isPlaying) return undefined
    const onKey = (event) => {
      const index = Number(event.key) - 1
      if (index >= 0 && index < localized.choices.length) chooseAnswer(localized.choices[index].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPlaying, localized, chooseAnswer])

  const choiceClass = (id) => {
    if (!outcome) return 'quiz-choice'
    if (id === question.correctId) return 'quiz-choice quiz-choice--correct'
    if (wrongPicks.includes(id)) return 'quiz-choice quiz-choice--wrong'
    return 'quiz-choice quiz-choice--dim'
  }

  return (
    <section className="quiz-card survival-quiz">
      <h2 className="quiz-question">{localized.prompt}</h2>
      <div className="quiz-choices">
        {localized.choices.map((choice, index) => (
          <button key={choice.id} className={choiceClass(choice.id)} onClick={() => chooseAnswer(choice.id)} disabled={!isPlaying}>
            <span className="quiz-choice-key">{index + 1}</span>
            {choice.label}
          </button>
        ))}
      </div>
      {outcome && localized.fact && <p className="survival-fact">{localized.fact}</p>}
    </section>
  )
}
