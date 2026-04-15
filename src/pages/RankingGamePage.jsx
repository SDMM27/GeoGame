import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'
import DailyLeaderboard from './DailyLeaderboard'
import useRankingGameState from '../hooks/useRankingGameState'
import { GAME_TYPES } from '../utils/gameTypes'
import { formatTime } from '../utils/formatTime'
import { firestore } from '../Firebase'

const FLAG_URL = (iso2) =>
  iso2 ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png` : null

function CriterionBanner({ criterion }) {
  if (!criterion) return null
  return (
    <div
      style={{
        background: '#1a2a3a',
        borderLeft: '3px solid #4a8aff',
        borderRadius: 4,
        padding: '10px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
        Critère
      </div>
      <div style={{ fontSize: 16, fontWeight: 'bold' }}>{criterion.label}</div>
      <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{criterion.consigne}</div>
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
    elapsedTime,
    isTimerRunning,
    startTimer,
    handleSubmit,
    startNextRound,
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
        if (score > prev.score || (score === prev.score && elapsedTime < prev.elapsedTime)) {
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
        elapsedTime,
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
    <>
      <NavBar />
      <div className="container py-4" style={{ maxWidth: 600 }}>
        <h1 className="game-title">Classement</h1>

        {/* Mode tabs */}
        <div className="game-mode-tabs mb-3">
          {['daily', 'infinite'].map((m) => (
            <button
              key={m}
              className={`game-mode-tab${mode === m ? ' game-mode-tab--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'daily' ? 'Journalier' : 'Infini'}
            </button>
          ))}
        </div>

        {/* Difficulty selector — infinite mode only, before submission */}
        {mode === 'infinite' && !isSubmitted && (
          <div className="d-flex gap-2 mb-3">
            {['Facile', 'Moyen', 'Difficile'].map((d) => (
              <button
                key={d}
                className={`btn btn-sm${difficulty === d ? ' btn-primary' : ' btn-outline-secondary'}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Timer */}
        {status !== 'idle' && (
          <div className="text-end mb-2 fw-bold" style={{ color: '#f0c040' }}>
            ⏱ {formatTime(elapsedTime)}
          </div>
        )}

        {/* Criterion banner */}
        <CriterionBanner criterion={criterion} />

        {/* === PLAYING === */}
        {status === 'playing' && (
          <>
            {!isTimerRunning && (
              <button className="btn btn-outline-light w-100 mb-3" onClick={startTimer}>
                ▶ Démarrer le chrono
              </button>
            )}

            <div className="text-muted small mb-2">Glisse pour réordonner</div>

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
                            style={{
                              ...provided.draggableProps.style,
                              background: snapshot.isDragging ? '#1a3a2e' : '#1e1e3e',
                              border: snapshot.isDragging
                                ? '2px solid #3a8a5e'
                                : '1px solid #3a3a6e',
                              borderRadius: 8,
                              padding: '10px 14px',
                              marginBottom: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              cursor: 'grab',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{ color: '#555', fontSize: 18 }}>⠿</span>
                            <span
                              style={{
                                background: '#2a2a4e',
                                color: '#aaa',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 'bold',
                                flexShrink: 0,
                              }}
                            >
                              {index + 1}
                            </span>
                            {FLAG_URL(country.properties.ISO_A2) && (
                              <img
                                src={FLAG_URL(country.properties.ISO_A2)}
                                alt=""
                                style={{ width: 28, height: 'auto', borderRadius: 2 }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            )}
                            <span style={{ fontWeight: 500 }}>{country.properties.ADMIN}</span>
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
              className="btn btn-primary w-100 mt-3"
              onClick={handleSubmit}
              disabled={!isTimerRunning}
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
            <div className="text-center my-3">
              <div className="display-4 fw-bold" style={{ color: '#f0c040' }}>
                {score} pt{score !== 1 ? 's' : ''}
              </div>
              <div className="text-muted">
                Erreur totale : {totalError} position{totalError !== 1 ? 's' : ''}
              </div>
              <div className="text-muted small">{formatTime(elapsedTime)}</div>
            </div>

            {/* Correct ranking revealed */}
            <h5 className="mb-2">Classement correct</h5>
            {correctOrder.map((country, index) => {
              const playerIdx = countries.findIndex(
                (c) => c.properties.ISO_A3 === country.properties.ISO_A3
              )
              const isCorrect = playerIdx === index
              const formattedVal = countryValues.get(country.properties.ISO_A3) ?? '—'

              return (
                <div
                  key={country.properties.ISO_A3}
                  style={{
                    background: isCorrect ? '#1e3a1e' : '#1e1e3e',
                    border: `1px solid ${isCorrect ? '#3a7a3a' : '#8a3a3a'}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    marginBottom: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      background: isCorrect ? '#3a7a3a' : '#3a3a6e',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  {FLAG_URL(country.properties.ISO_A2) && (
                    <img
                      src={FLAG_URL(country.properties.ISO_A2)}
                      alt=""
                      style={{ width: 24, height: 'auto', borderRadius: 2 }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  )}
                  <span style={{ flexGrow: 1 }}>{country.properties.ADMIN}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#5fa', fontSize: 12, fontWeight: 'bold' }}>
                      {formattedVal}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isCorrect ? '#3a7a3a' : '#e06060',
                      }}
                    >
                      {isCorrect ? '✓ correct' : `✗ tu avais mis #${playerIdx + 1}`}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Daily leaderboard submission */}
            {mode === 'daily' && !leaderboardSubmitted && (
              <form onSubmit={submitToLeaderboard} className="mt-3 d-flex gap-2">
                <input
                  className="form-control"
                  placeholder="Ton pseudo"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  maxLength={30}
                />
                <button className="btn btn-outline-primary" type="submit" disabled={submitting}>
                  {submitting ? '...' : '📤'}
                </button>
              </form>
            )}

            {mode === 'daily' && (
              <DailyLeaderboard gameType={GAME_TYPES.RANKING} dailyKey={dailyKey} />
            )}

            {mode === 'infinite' && (
              <button className="btn btn-outline-primary w-100 mt-3" onClick={startNextRound}>
                ▶ Round suivant
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
