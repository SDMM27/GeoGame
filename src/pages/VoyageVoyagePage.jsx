import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastContainer } from 'react-toastify'
import NavBar from '../components/NavBar'
import VoyageVoyageMap from '../components/VoyageVoyageMap'
import ShareScoreButton from '../components/ShareScoreButton'
import ChallengeBanner from '../components/ChallengeBanner'
import { resolveMode } from '../utils/challenge'
import useVoyageVoyageState from '../hooks/useVoyageVoyageState'
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
import { useRecordGame } from '../auth'
import countries from '../data/countriesWithDifficulty_FR.json'
import { normalize } from '../utils/normalizeAnswer'
import { getCountryName } from '../utils/getCountryName'
import 'react-toastify/dist/ReactToastify.css'
import './VoyageVoyagePage.css'

const flagSrc = iso => `/flags/${iso.toLowerCase()}.png`

// Territoires sans code ISO (Somaliland, Kosovo…) exclus : pas de drapeau ni de frontières
const ALL_FEATURES = countries.features.filter(f => f.properties.ISO_A2)

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
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [mode] = useState(() => resolveMode(location, 'infinite'))
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

  useRecordGame(
    isGameOver && mode === 'daily' && score != null
      ? {
          gameType: GAME_TYPES.VOYAGE_VOYAGE,
          mode: 'daily',
          dailyKey,
          score,
          solved: true,
          attempts: stepsUsed,
          optimal: optimalLength,
          errors: wrongGuesses.length,
          hints: hintsUsed.length,
        }
      : null
  )

  return (
    <div className="voyage-page">
      <NavBar />

      {mode === 'daily' && (
        <ChallengeBanner
          gameType="VOYAGE_VOYAGE"
          dailyKey={dailyKey}
          result={isGameOver && score != null ? { score, solved: true } : null}
        />
      )}

      <div className="voyage-header">
        <div className="voyage-country voyage-start">
          {startCountry && (
            <>
              <img src={flagSrc(startCountry.properties.ISO_A2)} alt={getCountryName(startCountry.properties.ISO_A2, i18n.language) || startCountry.properties.ADMIN} />
              <span>{getCountryName(startCountry.properties.ISO_A2, i18n.language) || startCountry.properties.ADMIN}</span>
              <small>{t('labels.start')}</small>
            </>
          )}
        </div>

        <div className="voyage-stats">
          <span>{stepsUsed} {stepsUsed === 1 ? t('units.step_one') : t('units.step_other')} · {t('labels.optimal')} {optimalLength}</span>
          <span>{wrongGuesses.length} {wrongGuesses.length === 1 ? t('units.error_one') : t('units.error_other')}</span>
          {mode === 'infinite' && !isGameOver && (
            <button
              className="voyage-regen-btn"
              onClick={() => {
                if (window.confirm(t('voyage_voyage.confirm_new_path'))) resetGame()
              }}
            >
              {t('buttons.new_path')}
            </button>
          )}
          {isGameOver && !showModal && (
            <button className="voyage-regen-btn voyage-regen-btn--results" onClick={() => setShowModal(true)}>
              {t('buttons.see_results')}
            </button>
          )}
        </div>

        <div className="voyage-country voyage-target">
          {targetCountry && (
            <>
              <img src={flagSrc(targetCountry.properties.ISO_A2)} alt={getCountryName(targetCountry.properties.ISO_A2, i18n.language) || targetCountry.properties.ADMIN} />
              <span>{getCountryName(targetCountry.properties.ISO_A2, i18n.language) || targetCountry.properties.ADMIN}</span>
              <small>{t('labels.arrival')}</small>
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
                {getCountryName(g.feature.properties.ISO_A2, i18n.language) || g.feature.properties.ADMIN}
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
                {getCountryName(f.properties.ISO_A2, i18n.language) || f.properties.ADMIN}
              </span>
            ))}
          </span>
        )}
      </div>

      {!isGameOver ? (
        <div className="voyage-input-wrapper">
          <div className="voyage-hints-bar">
            <span className="voyage-hints-label">{t('labels.hints')}</span>
            <button
              className={`voyage-hint-btn ${hintsUsed.includes('next') ? 'used' : ''}`}
              disabled={hintsUsed.includes('next') || unguessedOptimalPath.length === 0}
              onClick={() => useHint('next')}
            >
              {t('buttons.next_country_hint')}
            </button>
            <button
              className={`voyage-hint-btn ${hintsUsed.includes('all') ? 'used' : ''}`}
              disabled={hintsUsed.includes('all') || !hintsUsed.includes('next') || unguessedOptimalPath.length === 0}
              onClick={() => useHint('all')}
            >
              {t('buttons.all_countries_hint')}
            </button>
            <button
              className={`voyage-hint-btn ${hintsUsed.includes('initials') ? 'used' : ''}`}
              disabled={hintsUsed.includes('initials') || !hintsUsed.includes('all')}
              onClick={() => useHint('initials')}
            >
              {t('buttons.initials_hint')}
            </button>
          </div>
          <form className="voyage-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholders.enter_country_on_path')}
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
                  {getCountryName(feature.properties.ISO_A2, i18n.language) || feature.properties.ADMIN}
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
              ? <p className="voyage-result-perfect">{t('voyage_voyage.perfect_path')}</p>
              : <p className="voyage-modal-title">{t('voyage_voyage.arrived_in')} <strong>{stepsUsed}</strong> {stepsUsed === 1 ? t('units.step_one') : t('units.step_other')} ({t('labels.optimal')} {optimalLength})</p>
            }
            <p className="voyage-modal-sub">{t('labels.score')} <strong>{score?.toFixed(1)}</strong> · {wrongGuesses.length === 1 ? t('units.error_one') : t('units.error_other')} : {wrongGuesses.length}</p>

            {!isPerfect && optimalPath.length > 0 && (
              <div className="voyage-optimal">
                <span className="voyage-optimal-label">{t('labels.optimal_path')}</span>
                <div className="voyage-optimal-chain">
                  {optimalPath.map((f, i) => {
                    const iso = f.properties.ISO_A2
                    const guessed = validatedChain.some(v => v.properties.ISO_A2 === iso)
                    return (
                      <span key={iso} className="voyage-chain-item">
                        {i > 0 && <span className="voyage-chain-sep">›</span>}
                        <span className={`voyage-chain-badge ${guessed ? 'voyage-chain-badge--green' : 'voyage-chain-badge--missed'}`}>
                          <img src={flagSrc(iso)} alt="" />
                          {getCountryName(f.properties.ISO_A2, i18n.language) || f.properties.ADMIN}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {mode === 'daily' && (
              <ChallengeBanner
                gameType="VOYAGE_VOYAGE"
                dailyKey={dailyKey}
                result={score != null ? { score, solved: true } : null}
              />
            )}

            <ShareScoreButton
              score={score ?? 0}
              gameType="VOYAGE_VOYAGE"
              difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
              scoreLabel="PTS"
              details={t('share.details_voyage', { steps: stepsUsed, optimal: optimalLength })}
              challenge={mode === 'daily' ? { route: '/voyage-voyage', dailyKey } : null}
            />

            {mode === 'daily' && (
              <>
                <DailyForm
                  attempts={stepsUsed}
                  elapsedTime={wrongGuesses.length}
                  guesses={validatedChain.map(f => f.properties.ADMIN)}
                  gameType={GAME_TYPES.VOYAGE_VOYAGE}
                  dailyKey={dailyKey}
                  statText={`${stepsUsed} ${stepsUsed === 1 ? t('units.step_one') : t('units.step_other')} · ${wrongGuesses.length} ${wrongGuesses.length === 1 ? t('units.error_one') : t('units.error_other')} · ${hintsUsed.length} indice${hintsUsed.length > 1 ? 's' : ''}`}
                  hints={hintsUsed.length}
                />
                <DailyLeaderboard
                  gameType={GAME_TYPES.VOYAGE_VOYAGE}
                  dailyKey={dailyKey}
                  columnLabels={{ attempts: 'Étapes', secondary: 'Erreurs' }}
                  secondaryFormatter={n => `${n} ${n === 1 ? t('units.error_one') : t('units.error_other')}`}
                />
              </>
            )}

            <button className="voyage-modal-new-game" onClick={resetGame}>{t('buttons.new_game')}</button>
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1800} theme="dark" hideProgressBar />
    </div>
  )
}
