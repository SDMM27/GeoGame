import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'
import RankingLeaderboard from './RankingLeaderboard'
import useRankingGameState from '../hooks/useRankingGameState'
import { GAME_TYPES } from '../utils/gameTypes'
import { firestore } from '../Firebase'
import './RankingGamePage.css'

const FLAG_URL = (iso2) =>
  iso2 ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png` : null

const CATEGORY_OPTIONS = [
  { key: null,         emoji: '🎲', label: 'Aléatoire' },
  { key: 'population', emoji: '👥', label: 'Population' },
  { key: 'area',       emoji: '🗺️', label: 'Superficie' },
  { key: 'gdp',        emoji: '💰', label: 'PIB' },
]

function CriterionBanner({ criterion }) {
  if (!criterion) return null
  return (
    <div className="ranking-criterion">
      <div className="ranking-criterion-label">Critère</div>
      <div className="ranking-criterion-name">{criterion.label}</div>
      <div className="ranking-criterion-hint">{criterion.consigne}</div>
    </div>
  )
}

export default function RankingGamePage() {
  const location = useLocation()
  const initialMode = location.state?.mode ?? 'daily'
  const [mode, setMode] = useState(initialMode)
  const [countryCount, setCountryCount] = useState(5)
  const [submitName, setSubmitName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const {
    criterion,
    countries,
    countryValues,
    reorderCountries,
    status,
    score,
    totalError,
    correctOrder,
    handleSubmit,
    startNextRound,
    startInfiniteRound,
    dailyKey,
    attemptNumber,
    positionFeedback,
    retryAttempt,
  } = useRankingGameState(mode, { countryCount })

  const rankingSavedKey = dailyKey ? `ranking-saved:${dailyKey}` : null
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(() =>
    rankingSavedKey ? !!localStorage.getItem(rankingSavedKey) : false
  )

  function onDragEnd(result) {
    if (!result.destination) return
    const newOrder = Array.from(countries)
    const [moved] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, moved)
    reorderCountries(newOrder)
  }

  async function submitToLeaderboard(e) {
    e.preventDefault()
    const name = submitName.trim()
    if (!name) {
      toast.error('Veuillez entrer un pseudo', { containerId: 'topRightToast' })
      return
    }
    setSubmitting(true)
    try {
      const ref = collection(firestore, 'daily_scores')
      const existing = await getDocs(
        query(
          ref,
          where('name', '==', name),
          where('gameType', '==', GAME_TYPES.RANKING),
          where('dailyKey', '==', dailyKey)
        )
      )

      if (!existing.empty) {
        const prev = existing.docs[0].data()
        const better =
          score > prev.score ||
          (score === prev.score && totalError < (prev.totalError ?? Infinity))
        if (better) {
          await deleteDoc(existing.docs[0].ref)
        } else {
          toast.info('Tu as déjà un meilleur score enregistré.', { containerId: 'topRightToast' })
          setSubmitting(false)
          return
        }
      }

      await addDoc(ref, {
        name,
        gameType: GAME_TYPES.RANKING,
        dailyKey,
        score,
        totalError,
        attemptsUsed: attemptNumber,
        playerOrder: countries.map((c) => c.properties.ADMIN),
      })

      if (rankingSavedKey) localStorage.setItem(rankingSavedKey, '1')
      setLeaderboardSubmitted(true)
      toast.success('Score enregistré !', { containerId: 'topRightToast' })
    } catch {
      toast.error('Erreur lors de la sauvegarde.', { containerId: 'topRightToast' })
    }
    setSubmitting(false)
  }

  const isSubmitted = status === 'submitted'

  const errorChips = isSubmitted
    ? correctOrder
        .map((country, correctIdx) => {
          const playerIdx = countries.findIndex(
            (c) => c.properties.ISO_A3 === country.properties.ISO_A3
          )
          return {
            iso: country.properties.ISO_A3,
            name: country.properties.ADMIN,
            error: Math.abs(playerIdx - correctIdx),
          }
        })
        .sort((a, b) => b.error - a.error)
    : []

  function chipClass(error) {
    if (error === 0) return 'ranking-error-chip--zero'
    if (error === 1) return 'ranking-error-chip--low'
    if (error <= 3) return 'ranking-error-chip--mid'
    return 'ranking-error-chip--high'
  }

  return (
    <div className="ranking-game-page">
      <NavBar />
      <div className="ranking-game-main">
        <h1 className="ranking-game-title">Country Ranking</h1>

        {/* Mode tabs */}
        <div className="ranking-mode-tabs">
          {['daily', 'infinite'].map((m) => (
            <button
              key={m}
              className={`ranking-mode-tab${mode === m ? ' ranking-mode-tab--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'daily' ? 'Journalier' : 'Infini'}
            </button>
          ))}
        </div>

        {/* Country count slider — infinite mode only, before choosing category */}
        {mode === 'infinite' && status === 'choosing-category' && (
          <div className="ranking-slider-wrap">
            <div className="ranking-slider-value">{countryCount} pays</div>
            <input
              type="range"
              min={3}
              max={20}
              value={countryCount}
              onChange={(e) => setCountryCount(Number(e.target.value))}
              className="ranking-slider"
            />
            <div className="ranking-slider-labels">
              <span className={`ranking-slider-label ranking-slider-label--easy${countryCount <= 5 ? ' ranking-slider-label--active' : ''}`}>
                Facile<br />3–5
              </span>
              <span className={`ranking-slider-label ranking-slider-label--medium${countryCount >= 6 && countryCount <= 12 ? ' ranking-slider-label--active' : ''}`}>
                Moyen<br />6–12
              </span>
              <span className={`ranking-slider-label ranking-slider-label--hard${countryCount >= 13 ? ' ranking-slider-label--active' : ''}`}>
                Difficile<br />13–20
              </span>
            </div>
          </div>
        )}

        {/* Category selection — infinite mode only */}
        {mode === 'infinite' && status === 'choosing-category' && (
          <div className="ranking-category-selection">
            <div className="ranking-category-title">Choisir une catégorie</div>
            {CATEGORY_OPTIONS.map(({ key, emoji, label }) => (
              <button
                key={key ?? '__random__'}
                className="ranking-category-btn"
                onClick={() => startInfiniteRound(key)}
              >
                <span className="ranking-category-emoji">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Criterion banner */}
        <CriterionBanner criterion={criterion} />

        {/* === PLAYING === */}
        {status === 'playing' && (
          <>
            <div className="ranking-drag-hint">Glisse pour réordonner</div>
            <div className="ranking-attempt-counter">
              Essai {attemptNumber} / 3
            </div>

            {!positionFeedback ? (
              <>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="ranking-countries">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {countries.map((country, index) => (
                          <Draggable
                            key={country.properties.ISO_A3}
                            draggableId={country.properties.ISO_A3}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                                className={`ranking-country-item${snapshot.isDragging ? ' ranking-country-item--dragging' : ''}`}
                              >
                                <span className="ranking-drag-handle">⠿</span>
                                <span className="ranking-country-index">{index + 1}</span>
                                {FLAG_URL(country.properties.ISO_A2) && (
                                  <img
                                    src={FLAG_URL(country.properties.ISO_A2)}
                                    alt=""
                                    className="ranking-country-flag"
                                    onError={(e) => { e.target.style.display = 'none' }}
                                  />
                                )}
                                <span className="ranking-country-name">{country.properties.ADMIN}</span>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                <button className="ranking-submit-btn" onClick={handleSubmit}>
                  ✓ Soumettre mon classement
                </button>
              </>
            ) : (
              <>
                <div>
                  {countries.map((country, index) => (
                    <div
                      key={country.properties.ISO_A3}
                      className={`ranking-country-item${positionFeedback[index] ? ' ranking-country-item--correct' : ' ranking-country-item--wrong'}`}
                    >
                      <span className="ranking-country-index">{index + 1}</span>
                      {FLAG_URL(country.properties.ISO_A2) && (
                        <img
                          src={FLAG_URL(country.properties.ISO_A2)}
                          alt=""
                          className="ranking-country-flag"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                      <span className="ranking-country-name">{country.properties.ADMIN}</span>
                    </div>
                  ))}
                </div>

                <button className="ranking-submit-btn" onClick={retryAttempt}>
                  ↺ Réessayer — Essai {attemptNumber + 1} / 3
                </button>
              </>
            )}
          </>
        )}

        {/* === SUBMITTED === */}
        {isSubmitted && (
          <>
            {/* Score */}
            <div className="ranking-score">
              <div className="ranking-score-value">
                {score} pt{score !== 1 ? 's' : ''}
              </div>
              <div className="ranking-score-sub">
                Erreur totale : {totalError} position{totalError !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Correct ranking revealed */}
            <div className="ranking-results-title">Classement correct</div>
            {correctOrder.map((country, index) => {
              const playerIdx = countries.findIndex(
                (c) => c.properties.ISO_A3 === country.properties.ISO_A3
              )
              const isCorrect = playerIdx === index
              const formattedVal = countryValues.get(country.properties.ISO_A3) ?? '—'

              return (
                <div
                  key={country.properties.ISO_A3}
                  className={`ranking-result-row${isCorrect ? ' ranking-result-row--correct' : ' ranking-result-row--wrong'}`}
                >
                  <span className={`ranking-result-index${isCorrect ? ' ranking-result-index--correct' : ' ranking-result-index--wrong'}`}>
                    {index + 1}
                  </span>
                  {FLAG_URL(country.properties.ISO_A2) && (
                    <img
                      src={FLAG_URL(country.properties.ISO_A2)}
                      alt=""
                      className="ranking-result-flag"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  <span className="ranking-result-country">{country.properties.ADMIN}</span>
                  <div className="ranking-result-meta">
                    <div className="ranking-result-value">{formattedVal}</div>
                    {isCorrect
                      ? <span className="ranking-result-status--correct">✓ correct</span>
                      : <span className="ranking-result-status--wrong">
                          mis #{playerIdx + 1} (écart de {Math.abs(playerIdx - index)})
                        </span>
                    }
                  </div>
                </div>
              )
            })}

            {/* Daily leaderboard submission */}
            {mode === 'daily' && !leaderboardSubmitted && (
              <form onSubmit={submitToLeaderboard} className="ranking-leaderboard-form">
                <input
                  className="ranking-leaderboard-input"
                  placeholder="Ton pseudo"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  maxLength={30}
                />
                <button className="ranking-leaderboard-submit" type="submit" disabled={submitting}>
                  {submitting ? '...' : '📤'}
                </button>
              </form>
            )}

            {mode === 'daily' && (
              <RankingLeaderboard
                dailyKey={dailyKey}
                playerName={leaderboardSubmitted ? submitName : null}
              />
            )}

            {mode === 'infinite' && (
              <button className="ranking-next-btn" onClick={startNextRound}>
                ▶ Round suivant
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
