// src/components/multiplayer/MultiplayerCountryClue.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToastContainer } from 'react-toastify'
import useCountryClueState from '../../hooks/useCountryClueState'
import CountryClueMap from '../../pages/CountryClueMap'
import { getGuessGamePoints } from '../../utils/scoringRules'
import { clueProgress } from '../../utils/clueProgress'
import ClueProgressBadges from '../ClueProgressBadges'
import { loadSnapshot, saveSnapshot } from '../../utils/multiplayerSnapshot'
import { getCapitalName, getCountryName } from '../../utils/getCountryName'
import { localeOf } from '../../i18n/languages'
import 'react-toastify/dist/ReactToastify.css'
import './MultiplayerCountryClue.css'

export default function MultiplayerCountryClue({ countries, showGlobe = true, onCountryFound, onGameFinished, snapshotKey, room }) {
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
    guesses, isSolved, isLost, isComplete,
    answerName, answerFlag, answerCapital,
    filteredCountrySuggestions, handleSubmit, revealCountry,
  } = useCountryClueState('daily', { overrideCountry: currentCountry, initialGuesses: snap?.currentGuesses ?? null })
  const progressByGuess = clueProgress(guesses)
  const { t, i18n } = useTranslation()
  const answerIso = currentCountry?.properties?.ISO_A2
  const localizedAnswer = getCountryName(answerIso, i18n.language) || answerName
  const localizedCapital = getCapitalName(answerIso, i18n.language) || answerCapital

  const guessesRef = useRef(snap?.currentGuesses ?? [])
  guessesRef.current = guesses

  const handleReveal = () => {
    revealCountry()
    const acc = accRef.current
    const wrongGuesses = guessesRef.current.filter(g => !g.isCorrect).length
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

    const wrongGuesses = guesses.filter(g => !g.isCorrect).length
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
          elapsedMs: performance.now() - startTimeRef.current,
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

  return (
    <div className="mp-country-clue">
      <div className="mp-cc-header">
        <span className="mp-cc-round">{t('mp_room.round_n', { n: roundIndex + 1, total: countries.length })}</span>
        <span className="mp-cc-attempts">{t('quiz.attempts_count', { count: guesses.length })}</span>
      </div>

      <div className="mp-cc-body">
        {/* Colonne gauche : saisie */}
        <aside className="mp-cc-controls">
          {isComplete ? (
            <div className="mp-cc-result">
              <p className={isSolved ? 'mp-cc-solved' : 'mp-cc-lost'}>
                {answerFlag} {isSolved ? `✓ ${localizedAnswer}` : `✗ ${t('survival.answer_was', { answer: localizedAnswer })}`}
              </p>
              {answerCapital && <p className="mp-cc-capital">{t('labels.capital')} {localizedCapital}</p>}
              {roundIndex + 1 < countries.length && (
                <p className="mp-cc-next">{t('mp_room.next_round_soon')}</p>
              )}
            </div>
          ) : (
            <div className="mp-cc-input-block">
              <label className="mp-cc-label">{t('country_clue.guess_title')}</label>
              <div className="mp-cc-input-overlay">
                <input
                  className="mp-cc-input"
                  placeholder={t('placeholders.country_examples_clue')}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  autoFocus
                />
                {showSuggestions && (
                  <div className="mp-cc-suggestions">
                    {filteredCountrySuggestions.map(name => (
                      <button key={name} type="button" onClick={() => setInputValue(name)}>{name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mp-cc-actions">
                <button className="mp-cc-submit" onClick={handleSubmit}>{t('buttons.validate')}</button>
                <button className="mp-cc-reveal" onClick={handleReveal}>{t('buttons.reveal')}</button>
              </div>
            </div>
          )}
        </aside>

        {/* Colonne droite : globe + indices */}
        <div className="mp-cc-right">
          {showGlobe && currentCountry && (
            <div className="mp-cc-map">
              <CountryClueMap key={currentCountry.properties.ADMIN} targetCountry={currentCountry} guesses={guesses} />
            </div>
          )}

          <div className="mp-cc-guess-list">
            {guesses.length === 0 ? (
              <p className="mp-cc-empty">{t('labels.no_attempts')}</p>
            ) : (
              guesses.map((guess, i) => ({ guess, i, progress: progressByGuess[i] })).reverse().map(({ guess, i, progress }) => (
                <article key={i} className={`mp-cc-row ${guess.isCorrect ? 'mp-cc-row--correct' : ''}`}>
                  <strong className="mp-cc-col-name">{guess.value} <ClueProgressBadges progress={progress} /></strong>
                  <span className="mp-cc-col mp-cc-col--neutral">
                    {guess.directionArrow} {guess.distanceKm?.toLocaleString(localeOf(i18n.language))} km
                  </span>
                  <span className={`mp-cc-col mp-cc-col--${guess.hemisphereHint.tone}`}>
                    {guess.hemisphereHint.arrow} {guess.isCorrect ? t('country_clue.hint.exact') : t(`country_clue.hint.hemisphere_${guess.hemisphereHint.tone}`, guess.hemisphereHint.label)}
                  </span>
                  <span className={`mp-cc-col mp-cc-col--${guess.areaHint.tone}`}>
                    {guess.areaHint.arrow} {guess.areaLabel}
                  </span>
                  <span className={`mp-cc-col mp-cc-col--${guess.populationHint.tone}`}>
                    {guess.populationHint.arrow} {guess.populationLabel}
                  </span>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}
