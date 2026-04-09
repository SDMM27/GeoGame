// src/components/multiplayer/MultiplayerBorderGuess.jsx
import React, { useEffect, useRef, useState } from 'react'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import { ToastContainer } from 'react-toastify'
import useBorderGuessState from '../../hooks/useBorderGuessState'
import { getCountryStyle, getFocusCountry, getViewportSettings } from '../../utils/borderGuessMap'
import { getGuessGamePoints } from '../../utils/scoringRules'
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

export default function MultiplayerBorderGuess({ countries, onCountryFound, onGameFinished }) {
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
    guesses, isSolved, isLost, isComplete, answerName,
    filteredCountrySuggestions, handleSubmit, revealCountry,
  } = useBorderGuessState('daily', { overrideCountry: currentCountry })

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

  const displayCountry = currentCountry ? getFocusCountry(currentCountry) : null

  return (
    <div className="mp-border-guess">
      <div className="mp-border-guess-header">
        <span className="mp-border-guess-round">Manche {roundIndex + 1} / {countries.length}</span>
        <span className="mp-border-guess-attempts">{guesses.length} tentative{guesses.length !== 1 ? 's' : ''}</span>
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
                {isSolved ? `✓ ${answerName}` : `✗ C'était : ${answerName}`}
              </p>
              {roundIndex + 1 < countries.length && (
                <p className="mp-bg-next">Manche suivante dans un instant...</p>
              )}
            </div>
          ) : (
            <div className="mp-border-guess-input-wrap">
              <div className="mp-border-guess-input-overlay">
                <input
                  className="mp-border-guess-input"
                  placeholder="Nom du pays..."
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
                <button className="mp-border-guess-submit" onClick={handleSubmit}>Proposer</button>
                <button className="mp-border-guess-reveal" onClick={revealCountry}>Révéler</button>
              </div>
            </div>
          )}

          <div className="mp-border-guess-history">
            {[...guesses].reverse().map((guess, i) => (
              <div key={i} className={`mp-bg-chip ${guess.isCorrect ? 'mp-bg-chip--correct' : 'mp-bg-chip--wrong'}`}>
                <span>{guess.value}</span>
                {!guess.isCorrect && guess.distanceKm != null && (
                  <small>{guess.directionArrow} {guess.distanceKm.toLocaleString('fr-FR')} km</small>
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
