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
  { key: 'density',    emoji: '📍', label: 'Densité' },
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
  const [difficulty, setDifficulty] = useState('Facile')
  const [submitName, setSubmitName] = useState('')
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)
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
  } = useRankingGameState(mode, { difficulty })

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
        if (score > prev.score) {
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
      })

      setLeaderboardSubmitted(true)
      toast.success('Score enregistré !', { containerId: 'topRightToast' })
    } catch {
      toast.error('Erreur lors de la sauvegarde.', { containerId: 'topRightToast' })
    }
    setSubmitting(false)
  }

  const isSubmitted = status === 'submitted'

  return (
    <div className="ranking-game-page">
      <NavBar />
      <div className="ranking-game-main">
        <h1 className="ranking-game-title">Classement</h1>

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

        {/* Difficulty selector — infinite mode only, before submission */}
        {mode === 'infinite' && !isSubmitted && (
          <div className="ranking-difficulty-row">
            {['Facile', 'Moyen', 'Difficile'].map((d) => (
              <button
                key={d}
                className={`ranking-difficulty-btn${difficulty === d ? ' ranking-difficulty-btn--active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
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

            <button
              className="ranking-submit-btn"
              onClick={handleSubmit}
            >
              ✓ Soumettre mon classement
            </button>
          </>
        )}

        {/* === SUBMITTED === */}
        {isSubmitted && (
          <>
            {/* Criterion reminder */}
            <CriterionBanner criterion={criterion} />

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
                      : <span className="ranking-result-status--wrong">✗ tu avais mis #{playerIdx + 1}</span>
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
              <RankingLeaderboard dailyKey={dailyKey} />
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
