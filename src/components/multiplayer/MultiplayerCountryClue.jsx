// src/components/multiplayer/MultiplayerCountryClue.jsx
import React, { useEffect, useRef, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import useCountryClueState from '../../hooks/useCountryClueState'
import CountryClueMap from '../../pages/CountryClueMap'
import 'react-toastify/dist/ReactToastify.css'
import './MultiplayerCountryClue.css'

export default function MultiplayerCountryClue({ countries, showGlobe = true, onCountryFound, onGameFinished }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const startTimeRef = useRef(performance.now())
  const completedRef = useRef(false)

  const currentCountry = countries[roundIndex] ?? null
  const {
    inputValue, setInputValue,
    guesses, isSolved, isLost, isComplete,
    answerName, answerFlag, answerCapital,
    filteredCountrySuggestions, handleSubmit,
  } = useCountryClueState('daily', { overrideCountry: currentCountry })

  useEffect(() => {
    if (!isComplete || completedRef.current) return
    const roundAttempts = guesses.length
    const newTotal = totalAttempts + roundAttempts
    onCountryFound()

    if (roundIndex + 1 >= countries.length) {
      completedRef.current = true
      onGameFinished({ attempts: newTotal, elapsedTime: performance.now() - startTimeRef.current })
    } else {
      setTotalAttempts(newTotal)
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

      <div className="mp-cc-layout">
        <div className="mp-cc-play">
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
              <button className="mp-cc-submit" onClick={handleSubmit}>Proposer</button>
            </div>
          )}

          <div className="mp-cc-guess-list">
            {[...guesses].reverse().map((guess, i) => (
              <article key={i} className={`mp-cc-row ${guess.isCorrect ? 'mp-cc-row--correct' : ''}`}>
                <strong className="mp-cc-col-name">{guess.value}</strong>
                <span className="mp-cc-col">{guess.directionArrow} {guess.distanceKm?.toLocaleString('fr-FR')} km</span>
                <span className="mp-cc-col">{guess.hemisphereHint.arrow} {guess.hemisphereHint.label}</span>
                <span className="mp-cc-col">
                  {guess.areaHint.arrow} {guess.areaLabel}
                </span>
                <span className="mp-cc-col">
                  {guess.populationHint.arrow} {guess.populationLabel}
                </span>
              </article>
            ))}
          </div>
        </div>

        {showGlobe && (
          <div className="mp-cc-map">
            {currentCountry && (
              <CountryClueMap key={currentCountry.properties.ADMIN} targetCountry={currentCountry} guesses={guesses} />
            )}
          </div>
        )}
      </div>

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}
