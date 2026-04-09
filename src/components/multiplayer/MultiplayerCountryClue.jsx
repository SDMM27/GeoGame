// src/components/multiplayer/MultiplayerCountryClue.jsx
import React, { useEffect, useRef, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import useCountryClueState from '../../hooks/useCountryClueState'
import CountryClueMap from '../../pages/CountryClueMap'
import { getGuessGamePoints } from '../../utils/scoringRules'
import 'react-toastify/dist/ReactToastify.css'
import './MultiplayerCountryClue.css'

export default function MultiplayerCountryClue({ countries, showGlobe = true, onCountryFound, onGameFinished }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [totalSolved, setTotalSolved] = useState(0)
  const [totalWeightedScore, setTotalWeightedScore] = useState(0)
  const [totalPerfects, setTotalPerfects] = useState(0)
  const [totalStumbles, setTotalStumbles] = useState(0)
  const [totalFailures, setTotalFailures] = useState(0)
  const startTimeRef = useRef(performance.now())
  const completedRef = useRef(false)

  const currentCountry = countries[roundIndex] ?? null
  const {
    inputValue, setInputValue,
    guesses, isSolved, isLost, isComplete,
    answerName, answerFlag, answerCapital,
    filteredCountrySuggestions, handleSubmit, revealCountry,
  } = useCountryClueState('daily', { overrideCountry: currentCountry })

  useEffect(() => {
    if (!isComplete || completedRef.current) return

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
      setTimeout(() => setRoundIndex(i => i + 1), 1500)
    }
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  const trimmedInput = inputValue.trim()
  const showSuggestions = !isComplete &&
    filteredCountrySuggestions.length > 0 &&
    !filteredCountrySuggestions.some(n => n === trimmedInput)

  return (
    <div className="mp-country-clue">
      <div className="mp-cc-header">
        <span className="mp-cc-round">Manche {roundIndex + 1} / {countries.length}</span>
        <span className="mp-cc-attempts">{guesses.length} tentative{guesses.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="mp-cc-body">
        {/* Colonne gauche : saisie */}
        <aside className="mp-cc-controls">
          {isComplete ? (
            <div className="mp-cc-result">
              <p className={isSolved ? 'mp-cc-solved' : 'mp-cc-lost'}>
                {answerFlag} {isSolved ? `✓ ${answerName}` : `✗ C'était : ${answerName}`}
              </p>
              {answerCapital && <p className="mp-cc-capital">Capitale : {answerCapital}</p>}
              {roundIndex + 1 < countries.length && (
                <p className="mp-cc-next">Manche suivante dans un instant...</p>
              )}
            </div>
          ) : (
            <div className="mp-cc-input-block">
              <label className="mp-cc-label">Devine le pays mystère</label>
              <div className="mp-cc-input-overlay">
                <input
                  className="mp-cc-input"
                  placeholder="Ex : Canada, Japon..."
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
                <button className="mp-cc-submit" onClick={handleSubmit}>Proposer</button>
                <button className="mp-cc-reveal" onClick={revealCountry}>Révéler</button>
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
              <p className="mp-cc-empty">Aucune tentative pour l'instant.</p>
            ) : (
              [...guesses].reverse().map((guess, i) => (
                <article key={i} className={`mp-cc-row ${guess.isCorrect ? 'mp-cc-row--correct' : ''}`}>
                  <strong className="mp-cc-col-name">{guess.value}</strong>
                  <span className="mp-cc-col mp-cc-col--neutral">
                    {guess.directionArrow} {guess.distanceKm?.toLocaleString('fr-FR')} km
                  </span>
                  <span className={`mp-cc-col mp-cc-col--${guess.hemisphereHint.tone}`}>
                    {guess.hemisphereHint.arrow} {guess.hemisphereHint.label}
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
