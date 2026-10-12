// src/components/multiplayer/MultiplayerBorderGuess.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import { ToastContainer } from 'react-toastify'
import useBorderGuessState, { ROOM_MAX_ATTEMPTS, roomRoundErrors } from '../../hooks/useBorderGuessState'
import { getCountryStyle, getFocusCountry, getViewportSettings } from '../../utils/borderGuessMap'
import { getGuessGamePoints } from '../../utils/scoringRules'
import { loadSnapshot, saveSnapshot } from '../../utils/multiplayerSnapshot'
import { getCountryName } from '../../utils/getCountryName'
import { localeOf } from '../../i18n/languages'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './MultiplayerBorderGuess.css'

function FitCountryBounds({ country }) {
  const map = useMap()
  useEffect(() => {
    if (!country) return
    const { bounds, zoom, padding } = getViewportSettings(country)
    if (bounds.isValid()) map.fitBounds(bounds, { padding, maxZoom: zoom, animate: false })
  }, [country, map])
  return null
}

export default function MultiplayerBorderGuess({ countries, onCountryFound, onGameFinished, snapshotKey, room }) {
  const [snap] = useState(() => snapshotKey ? loadSnapshot(snapshotKey) : null)
  const startTime = room.startAt?.seconds ? room.startAt.seconds * 1000 : Date.now()
  const startTimeRef = useRef(performance.now() - (snap?.elapsedMs ?? 0))
  const completedRef = useRef(false)
  const roundTransitionRef = useRef(false)

  const [roundIndex, setRoundIndex] = useState(snap?.roundIndex ?? 0)
  const [totalAttempts, setTotalAttempts] = useState(snap?.totalAttempts ?? 0)
  const [totalSolved, setTotalSolved] = useState(snap?.totalSolved ?? 0)
  const [totalWeightedScore, setTotalWeightedScore] = useState(snap?.totalWeightedScore ?? 0)
  const [totalPerfects, setTotalPerfects] = useState(snap?.totalPerfects ?? 0)
  const [totalStumbles, setTotalStumbles] = useState(snap?.totalStumbles ?? 0)
  const [totalFailures, setTotalFailures] = useState(snap?.totalFailures ?? 0)

  // Refs always reflect latest state for use in intervals
  const accRef = useRef({
    roundIndex: snap?.roundIndex ?? 0,
    totalAttempts: snap?.totalAttempts ?? 0,
    totalSolved: snap?.totalSolved ?? 0,
    totalWeightedScore: snap?.totalWeightedScore ?? 0,
    totalPerfects: snap?.totalPerfects ?? 0,
    totalStumbles: snap?.totalStumbles ?? 0,
    totalFailures: snap?.totalFailures ?? 0,
  })
  accRef.current = { roundIndex, totalAttempts, totalSolved, totalWeightedScore, totalPerfects, totalStumbles, totalFailures }

  const currentCountry = countries[roundIndex] ?? null
  const {
    inputValue, setInputValue,
    guesses, isSolved, isLost, isComplete, answerName,
    filteredCountrySuggestions, handleSubmit, revealCountry,
  } = useBorderGuessState('daily', {
    overrideCountry: currentCountry,
    initialGuesses: snap?.currentGuesses ?? null,
    maxAttempts: ROOM_MAX_ATTEMPTS,
  })
  const { t, i18n } = useTranslation()
  const localizedAnswer = getCountryName(currentCountry?.properties?.ISO_A2, i18n.language) || answerName

  const guessesRef = useRef(snap?.currentGuesses ?? [])
  guessesRef.current = guesses

  const handleReveal = () => {
    revealCountry()
    const acc = accRef.current
    const wrongGuesses = roomRoundErrors(guessesRef.current, false)
    const newTotal = acc.totalAttempts + wrongGuesses
    const newFailures = acc.totalFailures + 1

    if (acc.roundIndex + 1 >= countries.length) {
      saveSnapshot(snapshotKey, {
        savedAt: Date.now(),
        completed: true,
        attempts: newTotal,
        elapsedTime: performance.now() - startTimeRef.current,
        totalSolved: acc.totalSolved,
        totalWeightedScore: acc.totalWeightedScore,
        totalPerfects: acc.totalPerfects,
        totalStumbles: acc.totalStumbles,
        totalFailures: newFailures,
      })
    } else {
      saveSnapshot(snapshotKey, {
        savedAt: Date.now(),
        elapsedMs: performance.now() - startTimeRef.current,
        roundIndex: acc.roundIndex + 1,
        totalAttempts: newTotal,
        totalSolved: acc.totalSolved,
        totalWeightedScore: acc.totalWeightedScore,
        totalPerfects: acc.totalPerfects,
        totalStumbles: acc.totalStumbles,
        totalFailures: newFailures,
        currentGuesses: [],
      })
    }
  }

  useEffect(() => {
    if (!isComplete || completedRef.current) return

    roundTransitionRef.current = true

    const wrongGuesses = roomRoundErrors(guesses, isSolved)
    const newTotal = totalAttempts + wrongGuesses
    const newSolved = isSolved ? totalSolved + 1 : totalSolved
    const roundScore = isSolved ? getGuessGamePoints(wrongGuesses) : 0
    const newWeightedScore = totalWeightedScore + roundScore
    const isPerfect = isSolved && wrongGuesses === 0
    const newPerfects = totalPerfects + (isPerfect ? 1 : 0)
    const newStumbles = totalStumbles + (isSolved && !isPerfect ? 1 : 0)
    const newFailures = totalFailures + (isSolved ? 0 : 1)

    if (isSolved) onCountryFound()

    if (roundIndex + 1 >= countries.length) {
      completedRef.current = true
      onGameFinished({
        attempts: newTotal,
        elapsedTime: performance.now() - startTimeRef.current,
        countriesSolved: newSolved,
        weightedScore: newWeightedScore,
        perfects: newPerfects,
        stumbles: newStumbles,
        failures: newFailures,
      })
    } else {
      setTotalAttempts(newTotal)
      setTotalSolved(newSolved)
      setTotalWeightedScore(newWeightedScore)
      setTotalPerfects(newPerfects)
      setTotalStumbles(newStumbles)
      setTotalFailures(newFailures)
      if (snapshotKey) {
        saveSnapshot(snapshotKey, {
          savedAt: Date.now(),
          elapsedMs: Date.now() - startTime,
          roundIndex: roundIndex + 1,
          totalAttempts: newTotal,
          totalSolved: newSolved,
          totalWeightedScore: newWeightedScore,
          totalPerfects: newPerfects,
          totalStumbles: newStumbles,
          totalFailures: newFailures,
          currentGuesses: [],
        })
      }
      setTimeout(() => {
        roundTransitionRef.current = false
        setRoundIndex(i => i + 1)
      }, 1500)
    }
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save every 5s with current partial guesses
  useEffect(() => {
    if (!snapshotKey) return
    const id = setInterval(() => {
      if (roundTransitionRef.current) return
      const acc = accRef.current
      saveSnapshot(snapshotKey, {
        savedAt: Date.now(),
        elapsedMs: performance.now() - startTimeRef.current,
        roundIndex: acc.roundIndex,
        totalAttempts: acc.totalAttempts,
        totalSolved: acc.totalSolved,
        totalWeightedScore: acc.totalWeightedScore,
        totalPerfects: acc.totalPerfects,
        totalStumbles: acc.totalStumbles,
        totalFailures: acc.totalFailures,
        currentGuesses: guessesRef.current,
      })
    }, 5000)
    return () => clearInterval(id)
  }, [snapshotKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const trimmedInput = inputValue.trim()
  const showSuggestions = !isComplete &&
    filteredCountrySuggestions.length > 0 &&
    !filteredCountrySuggestions.some(n => n === trimmedInput)

  const displayCountry = currentCountry ? getFocusCountry(currentCountry) : null

  return (
    <div className="mp-border-guess">
      <div className="mp-border-guess-header">
        <span className="mp-border-guess-round">{t('mp_room.round_n', { n: roundIndex + 1, total: countries.length })}</span>
        <span className="mp-border-guess-attempts">{guesses.length} / {t('quiz.attempts_count', { count: ROOM_MAX_ATTEMPTS })}</span>
      </div>

      <div className="mp-border-guess-layout">
        <div className="mp-border-guess-map-frame">
          {currentCountry && (
            <MapContainer
              key={currentCountry.properties.ADMIN}
              className="mp-border-guess-map"
              center={[20, 0]} zoom={2}
              zoomControl={false} attributionControl={false}
              dragging={false} doubleClickZoom={false}
              scrollWheelZoom={false} boxZoom={false} keyboard={false} touchZoom={false}
            >
              <GeoJSON data={displayCountry} style={() => getCountryStyle(currentCountry)} />
              <FitCountryBounds country={currentCountry} />
            </MapContainer>
          )}
        </div>

        <div className="mp-border-guess-side">
          {isComplete ? (
            <div className="mp-border-guess-result">
              <p className={isSolved ? 'mp-bg-solved' : 'mp-bg-lost'}>
                {isSolved ? `✓ ${localizedAnswer}` : `✗ ${t('survival.answer_was', { answer: localizedAnswer })}`}
              </p>
              {roundIndex + 1 < countries.length && (
                <p className="mp-bg-next">{t('mp_room.next_round_soon')}</p>
              )}
            </div>
          ) : (
            <div className="mp-border-guess-input-wrap">
              <div className="mp-border-guess-input-overlay">
                <input
                  className="mp-border-guess-input"
                  placeholder={t('placeholders.country_name')}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  autoFocus
                />
                {showSuggestions && (
                  <div className="mp-border-guess-suggestions">
                    {filteredCountrySuggestions.map(name => (
                      <button key={name} type="button" onClick={() => setInputValue(name)}>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mp-border-guess-actions">
                <button className="mp-border-guess-submit" onClick={handleSubmit}>{t('buttons.validate')}</button>
                <button className="mp-border-guess-reveal" onClick={handleReveal}>{t('buttons.reveal')}</button>
              </div>
            </div>
          )}

          <div className="mp-border-guess-history">
            {[...guesses].reverse().map((guess, i) => (
              <div key={i} className={`mp-bg-chip ${guess.isCorrect ? 'mp-bg-chip--correct' : 'mp-bg-chip--wrong'}`}>
                <span>{guess.value}</span>
                {!guess.isCorrect && guess.distanceKm != null && (
                  <small>{guess.directionArrow} {guess.distanceKm.toLocaleString(localeOf(i18n.language))} km</small>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}
