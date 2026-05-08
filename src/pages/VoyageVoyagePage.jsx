import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import NavBar from '../components/NavBar'
import VoyageVoyageMap from '../components/VoyageVoyageMap'
import ShareScoreButton from '../components/ShareScoreButton'
import useVoyageVoyageState from '../hooks/useVoyageVoyageState'
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
import countries from '../data/countriesWithDifficulty_FR.json'
import { normalize } from '../utils/normalizeAnswer'
import 'react-toastify/dist/ReactToastify.css'
import './VoyageVoyagePage.css'

const flagSrc = iso => `/flags/${iso.toLowerCase()}.png`

const ALL_FEATURES = countries.features

function getSuggestions(input) {
  if (input.length < 2) return []
  const norm = normalize(input)
  return ALL_FEATURES
    .filter(f =>
      normalize(f.properties.ADMIN).startsWith(norm) ||
      (f.properties.aliases ?? []).some(a => normalize(a).startsWith(norm))
    )
    .slice(0, 7)
}

export default function VoyageVoyagePage() {
  const location = useLocation()
  const [mode] = useState(location.state?.mode ?? 'infinite')
  const [showModal, setShowModal] = useState(false)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    guessHistory,
    chainHistory,
    optimalLength,
    optimalPath,
    unguessedOptimalPath,
    isGameOver,
    score,
    hintsUsed,
    revealedISOs,
    showInitials,
    useHint,
    submitGuess,
    resetGame,
    dailyKey,
  } = useVoyageVoyageState(mode)

  const hintFeatures = unguessedOptimalPath?.filter(f =>
    revealedISOs.has(f.properties.ISO_A2)
  ) ?? []

  const stepsUsed = validatedChain.length - 1

  const handleInputChange = (e) => {
    const value = e.target.value
    setInput(value)
    setSuggestions(getSuggestions(value))
    setActiveSuggestion(-1)
  }

  const selectSuggestion = (name) => {
    setInput(name)
    setSuggestions([])
    setActiveSuggestion(-1)
    inputRef.current?.focus()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    submitGuess(input)
    setInput('')
    setSuggestions([])
    setActiveSuggestion(-1)
  }

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeSuggestion].properties.ADMIN)
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setActiveSuggestion(-1)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (!suggestionsRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isGameOver) setShowModal(true)
  }, [isGameOver])

  const isPerfect = isGameOver && stepsUsed === optimalLength

  return (
    <div className="voyage-page">
      <NavBar />

      <div className="voyage-header">
        <div className="voyage-country voyage-start">
          {startCountry && (
            <>
              <img src={flagSrc(startCountry.properties.ISO_A2)} alt={startCountry.properties.ADMIN} />
              <span>{startCountry.properties.ADMIN}</span>
              <small>Départ</small>
            </>
          )}
        </div>

        <div className="voyage-stats">
          <span>{stepsUsed} étape{stepsUsed > 1 ? 's' : ''} · optimal : {optimalLength}</span>
          <span>{wrongGuesses.length} erreur{wrongGuesses.length > 1 ? 's' : ''}</span>
          {mode === 'infinite' && !isGameOver && (
            <button
              className="voyage-regen-btn"
              onClick={() => {
                if (window.confirm('Abandonner ce chemin et en générer un nouveau ?')) resetGame()
              }}
            >
              ↺ Nouveau chemin
            </button>
          )}
          {isGameOver && !showModal && (
            <button className="voyage-regen-btn voyage-regen-btn--results" onClick={() => setShowModal(true)}>
              Voir les résultats
            </button>
          )}
        </div>

        <div className="voyage-country voyage-target">
          {targetCountry && (
            <>
              <img src={flagSrc(targetCountry.properties.ISO_A2)} alt={targetCountry.properties.ADMIN} />
              <span>{targetCountry.properties.ADMIN}</span>
              <small>Arrivée</small>
            </>
          )}
        </div>
      </div>

      <div className="voyage-map-container">
        {startCountry && targetCountry && (
          <VoyageVoyageMap
            startCountry={startCountry}
            targetCountry={targetCountry}
            guessHistory={guessHistory}
            hintFeatures={hintFeatures}
            interactive={isGameOver}
          />
        )}
      </div>

      {/* Chaîne avec couleurs Travle */}
      <div className="voyage-chain">
        {chainHistory
          .map((g, i) => (
            <span key={g.feature.properties.ISO_A2} className="voyage-chain-item">
              {i > 0 && <span className="voyage-chain-sep">›</span>}
              <span className={`voyage-chain-badge voyage-chain-badge--${g.color}`}>
                <img src={flagSrc(g.feature.properties.ISO_A2)} alt="" />
                {g.feature.properties.ADMIN}
              </span>
            </span>
          ))
        }
        {!isGameOver && (
          <>
            <span className="voyage-chain-sep">›</span>
            {showInitials && unguessedOptimalPath.length > 0
              ? unguessedOptimalPath.map((f, i) => (
                  <span key={f.properties.ISO_A2} className="voyage-chain-item">
                    {i > 0 && <span className="voyage-chain-sep">›</span>}
                    <span className="voyage-chain-badge voyage-chain-badge--hint-initial">
                      {f.properties.ADMIN.charAt(0).toUpperCase()}
                    </span>
                  </span>
                ))
              : <span className="voyage-chain-empty">?</span>
            }
          </>
        )}

        {/* Erreurs inline */}
        {wrongGuesses.length > 0 && (
          <span className="voyage-chain-wrongs">
            {wrongGuesses.map(f => (
              <span key={f.properties.ISO_A2} className="voyage-chain-badge voyage-chain-badge--red">
                <img src={flagSrc(f.properties.ISO_A2)} alt="" />
                {f.properties.ADMIN}
              </span>
            ))}
          </span>
        )}
      </div>

      {!isGameOver ? (
        <div className="voyage-input-wrapper">
          <div className="voyage-hints-bar">
            <span className="voyage-hints-label">Indices :</span>
            <button
              className={`voyage-hint-btn ${hintsUsed.includes('next') ? 'used' : ''}`}
              disabled={hintsUsed.includes('next') || unguessedOptimalPath.length === 0}
              onClick={() => useHint('next')}
            >
              <span className="voyage-hint-icon">👁</span> Prochain pays
            </button>
            <button
              className={`voyage-hint-btn ${hintsUsed.includes('all') ? 'used' : ''}`}
              disabled={hintsUsed.includes('all') || !hintsUsed.includes('next') || unguessedOptimalPath.length === 0}
              onClick={() => useHint('all')}
            >
              <span className="voyage-hint-icon">🗺</span> Tous les pays
            </button>
            <button
              className={`voyage-hint-btn ${hintsUsed.includes('initials') ? 'used' : ''}`}
              disabled={hintsUsed.includes('initials') || !hintsUsed.includes('all')}
              onClick={() => useHint('initials')}
            >
              <span className="voyage-hint-icon">🔤</span> Initiales
            </button>
          </div>
          <form className="voyage-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Entrez un pays sur le chemin…"
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />
            <button type="submit">→</button>
          </form>

          {suggestions.length > 0 && (
            <ul className="voyage-suggestions" ref={suggestionsRef}>
              {suggestions.map((feature, i) => (
                <li
                  key={feature.properties.ISO_A2}
                  className={i === activeSuggestion ? 'active' : ''}
                  onMouseDown={() => {
                    submitGuess(feature.properties.ADMIN)
                    setInput('')
                    setSuggestions([])
                    setActiveSuggestion(-1)
                    inputRef.current?.focus()
                  }}
                >
                  <img src={flagSrc(feature.properties.ISO_A2)} alt="" />
                  {feature.properties.ADMIN}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {isGameOver && showModal && (
        <div className="voyage-modal-overlay">
          <div className="voyage-modal">
            <button className="voyage-modal-close" onClick={() => setShowModal(false)}>✕</button>

            {isPerfect
              ? <p className="voyage-result-perfect">Parfait ! Chemin optimal trouvé</p>
              : <p className="voyage-modal-title">Arrivé en <strong>{stepsUsed}</strong> étape{stepsUsed > 1 ? 's' : ''} (optimal : {optimalLength})</p>
            }
            <p className="voyage-modal-sub">Score : <strong>{score?.toFixed(1)}</strong> · Erreurs : {wrongGuesses.length}</p>

            {!isPerfect && optimalPath.length > 0 && (
              <div className="voyage-optimal">
                <span className="voyage-optimal-label">Chemin optimal :</span>
                <div className="voyage-optimal-chain">
                  {optimalPath.map((f, i) => {
                    const iso = f.properties.ISO_A2
                    const guessed = validatedChain.some(v => v.properties.ISO_A2 === iso)
                    return (
                      <span key={iso} className="voyage-chain-item">
                        {i > 0 && <span className="voyage-chain-sep">›</span>}
                        <span className={`voyage-chain-badge ${guessed ? 'voyage-chain-badge--green' : 'voyage-chain-badge--missed'}`}>
                          <img src={flagSrc(iso)} alt="" />
                          {f.properties.ADMIN}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <ShareScoreButton
              score={score ?? 0}
              gameType="VOYAGE_VOYAGE"
              difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
              scoreLabel="PTS"
            />

            {mode === 'daily' && (
              <>
                <DailyForm
                  attempts={stepsUsed}
                  elapsedTime={wrongGuesses.length}
                  guesses={validatedChain.map(f => f.properties.ADMIN)}
                  gameType={GAME_TYPES.VOYAGE_VOYAGE}
                  dailyKey={dailyKey}
                  statText={`${stepsUsed} étape${stepsUsed > 1 ? 's' : ''} · ${wrongGuesses.length} erreur${wrongGuesses.length > 1 ? 's' : ''} · ${hintsUsed.length} indice${hintsUsed.length > 1 ? 's' : ''}`}
                  hints={hintsUsed.length}
                />
                <DailyLeaderboard
                  gameType={GAME_TYPES.VOYAGE_VOYAGE}
                  dailyKey={dailyKey}
                  columnLabels={{ attempts: 'Étapes', secondary: 'Erreurs' }}
                  secondaryFormatter={n => `${n} erreur${n > 1 ? 's' : ''}`}
                />
              </>
            )}

            <button className="voyage-modal-new-game" onClick={resetGame}>↺ Nouvelle partie</button>
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1800} theme="dark" hideProgressBar />
    </div>
  )
}
