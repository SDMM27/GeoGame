import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import VoyageVoyageMap from '../components/VoyageVoyageMap'
import useVoyageVoyageState from '../hooks/useVoyageVoyageState'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import './VoyageVoyagePage.css'

export default function VoyageVoyagePage() {
  const location = useLocation()
  const [mode, setMode] = useState(location.state?.mode ?? 'infinite')
  const [input, setInput] = useState('')

  const {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    optimalLength,
    isGameOver,
    score,
    elapsedTime,
    submitGuess,
    resetGame,
  } = useVoyageVoyageState(mode)

  const handleSubmit = (e) => {
    e.preventDefault()
    submitGuess(input)
    setInput('')
  }

  const lastValidated = validatedChain[validatedChain.length - 1]
  const stepsUsed = validatedChain.length - 1

  return (
    <div className="voyage-page">
      <NavBar />

      {/* Header — pays départ & arrivée */}
      <div className="voyage-header">
        <div className="voyage-country voyage-start">
          {startCountry && (
            <>
              <img
                src={`/flags/${startCountry.properties.ISO_A2}.png`}
                alt={startCountry.properties.ADMIN}
              />
              <span>{startCountry.properties.ADMIN}</span>
              <small>Départ</small>
            </>
          )}
        </div>

        <div className="voyage-stats">
          <span>{stepsUsed} étape{stepsUsed > 1 ? 's' : ''}</span>
          <span>{wrongGuesses.length} erreur{wrongGuesses.length > 1 ? 's' : ''}</span>
        </div>

        <div className="voyage-country voyage-target">
          {targetCountry && (
            <>
              <img
                src={`/flags/${targetCountry.properties.ISO_A2}.png`}
                alt={targetCountry.properties.ADMIN}
              />
              <span>{targetCountry.properties.ADMIN}</span>
              <small>Arrivée</small>
            </>
          )}
        </div>
      </div>

      {/* Carte */}
      <div className="voyage-map-container">
        {startCountry && targetCountry && (
          <VoyageVoyageMap
            allCountries={countries}
            startCountry={startCountry}
            targetCountry={targetCountry}
            validatedChain={validatedChain}
            wrongGuesses={wrongGuesses}
          />
        )}
      </div>

      {/* Chaîne validée */}
      <div className="voyage-chain">
        {validatedChain.map((feature, i) => (
          <span key={feature.properties.ISO_A2} className="voyage-chain-item">
            {i > 0 && <span className="voyage-chain-sep">›</span>}
            <span className="voyage-chain-badge">
              <img
                src={`/flags/${feature.properties.ISO_A2}.png`}
                alt=""
              />
              {feature.properties.ADMIN}
            </span>
          </span>
        ))}
        {!isGameOver && (
          <>
            <span className="voyage-chain-sep">›</span>
            <span className="voyage-chain-empty">?</span>
          </>
        )}
      </div>

      {/* Input ou résultat */}
      {!isGameOver ? (
        <form className="voyage-input-row" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lastValidated
                ? `Pays voisin de ${lastValidated.properties.ADMIN}…`
                : 'Chargement…'
            }
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit">→</button>
        </form>
      ) : (
        <div className="voyage-result">
          <p>
            🎉 Arrivé en <strong>{stepsUsed}</strong> étape{stepsUsed > 1 ? 's' : ''}{' '}
            (optimal : {optimalLength}) !
          </p>
          <p>
            Score : <strong>{score?.toFixed(1)}</strong> · Temps :{' '}
            {formatTime(elapsedTime)} · Erreurs : {wrongGuesses.length}
          </p>
          <button onClick={resetGame}>Rejouer</button>
        </div>
      )}

      {/* Barre de statut */}
      <div className="voyage-status-bar">
        <span>⏱ {formatTime(elapsedTime)}</span>
        <div className="voyage-mode-toggle">
          <button
            className={mode === 'daily' ? 'active' : ''}
            onClick={() => setMode('daily')}
          >
            Quotidien
          </button>
          <button
            className={mode === 'infinite' ? 'active' : ''}
            onClick={() => setMode('infinite')}
          >
            Infini
          </button>
        </div>
      </div>
    </div>
  )
}
