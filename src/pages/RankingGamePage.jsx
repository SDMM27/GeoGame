import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import NavBar from '../components/NavBar'
import RankingLeaderboard from './RankingLeaderboard'
import ShareScoreButton from '../components/ShareScoreButton'
import ChallengeBanner from '../components/ChallengeBanner'
import { resolveMode } from '../utils/challenge'
import useRankingGameState, { describePlayedOrders } from '../hooks/useRankingGameState'
import { GAME_TYPES } from '../utils/gameTypes'
import { useAccount, useRecordGame } from '../auth'
import { useDailyPlayedElsewhere } from '../hooks/useDailyPlayedElsewhere'
import { DailyPlayedElsewhereCard } from '../components/DailyPlayedElsewhere'
import { useScoreSave } from '../hooks/useScoreSave'
import { saveRankingScore } from '../utils/saveScore'
import LeaderboardSave from '../components/LeaderboardSave'
import { getCountryName } from '../utils/getCountryName'
import './RankingGamePage.css'

const FLAG_URL = (iso2) =>
  iso2 ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png` : null

function CriterionBanner({ criterion, stageIndex, stageCount, t }) {
  if (!criterion) return null
  return (
    <div className="ranking-criterion">
      <div className="ranking-criterion-label">
        {t('labels.criterion')}
        {stageCount > 1 && ` ${stageIndex + 1} / ${stageCount}`}
      </div>
      <div className="ranking-criterion-name">{criterion.label}</div>
      <div className="ranking-criterion-hint">{criterion.consigne}</div>
    </div>
  )
}

// The right order of one stage, with the player's positions and the values.
function CorrectRanking({ stage, title, t, language }) {
  return (
    <>
      <div className="ranking-results-title">{title}</div>
      {stage.correctOrder.map((country, index) => {
        const playerIdx = stage.playerOrder.findIndex(
          (c) => c.properties.ISO_A3 === country.properties.ISO_A3
        )
        const isCorrect = playerIdx === index
        const formattedVal = stage.values.get(country.properties.ISO_A3) ?? '—'

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
            <span className="ranking-result-country">{getCountryName(country.properties.ISO_A2, language) || country.properties.ADMIN}</span>
            <div className="ranking-result-meta">
              <div className="ranking-result-value">{formattedVal}</div>
              {isCorrect
                ? <span className="ranking-result-status--correct">✓ correct</span>
                : <span className="ranking-result-status--wrong">
                    {t('ranking.placed_at')}{playerIdx + 1} ({t('ranking.difference_of')} {Math.abs(playerIdx - index)})
                  </span>
              }
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function RankingGamePage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const initialMode = resolveMode(location, 'daily')
  const [mode, setMode] = useState(initialMode)
  const [countryCount, setCountryCount] = useState(5)

  const CATEGORY_OPTIONS = [
    { key: null,         emoji: '🎲', label: t('ranking.random') },
    { key: 'population', emoji: '👥', label: t('ranking.population') },
    { key: 'area',       emoji: '🗺️', label: t('ranking.area') },
    { key: 'gdp',        emoji: '💰', label: t('ranking.gdp') },
  ]

  const {
    criterion,
    countries,
    reorderCountries,
    status,
    score,
    totalError,
    attemptsUsed,
    maxScore,
    stageScore,
    stageResults,
    stageIndex,
    stageCount,
    nextStage,
    handleSubmit,
    startNextRound,
    startInfiniteRound,
    dailyKey,
    attemptNumber,
    maxAttempts,
    positionFeedback,
    retryAttempt,
  } = useRankingGameState(mode, { countryCount })
  const accountState = useAccount()
  const elsewhere = useDailyPlayedElsewhere(accountState, {
    gameType: GAME_TYPES.RANKING,
    dailyKey,
    started: status === 'submitted' || attemptNumber > 1 || positionFeedback != null,
    enabled: mode === 'daily',
  })
  const playedElsewhere = elsewhere.checking || elsewhere.game != null

  function onDragEnd(result) {
    if (!result.destination) return
    const newOrder = Array.from(countries)
    const [moved] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, moved)
    reorderCountries(newOrder)
  }

  const isSubmitted = status === 'submitted'

  const rankingSavedKey = dailyKey ? `ranking-saved:${dailyKey}` : null
  const saver = useScoreSave(
    accountState,
    async (player) => {
      const result = await saveRankingScore({
        ...player,
        dailyKey,
        score,
        totalError,
        attemptsUsed,
        playerOrder: describePlayedOrders(stageResults, (key) => t(`ranking.${key}`)),
      })
      if (rankingSavedKey && (result.status === 'saved' || result.status === 'updated')) {
        localStorage.setItem(rankingSavedKey, '1')
      }
      return result
    },
    { enabled: isSubmitted && mode === 'daily' && !!dailyKey, alreadySaved: rankingSavedKey ? !!localStorage.getItem(rankingSavedKey) : false }
  )

  useRecordGame(
    isSubmitted && mode === 'daily' && dailyKey
      ? { gameType: GAME_TYPES.RANKING, mode: 'daily', dailyKey, score, solved: score > 0, attempts: attemptsUsed, totalError }
      : null
  )

  return (
    <div className="ranking-game-page">
      <NavBar />
      <div className="ranking-game-main">
        <h1 className="ranking-game-title">{t('ranking.title')}</h1>

        {/* Mode tabs */}
        <div className="ranking-mode-tabs">
          {['daily', 'infinite'].map((m) => (
            <button
              key={m}
              className={`ranking-mode-tab${mode === m ? ' ranking-mode-tab--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'daily' ? t('modes.daily') : t('modes.infinite')}
            </button>
          ))}
        </div>

        {mode === 'daily' && (
          <ChallengeBanner
            gameType="RANKING"
            dailyKey={dailyKey}
            result={isSubmitted ? { score, solved: true } : null}
          />
        )}

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
                {t('difficulties.easy_range')}
              </span>
              <span className={`ranking-slider-label ranking-slider-label--medium${countryCount >= 6 && countryCount <= 12 ? ' ranking-slider-label--active' : ''}`}>
                {t('difficulties.medium_range')}
              </span>
              <span className={`ranking-slider-label ranking-slider-label--hard${countryCount >= 13 ? ' ranking-slider-label--active' : ''}`}>
                {t('difficulties.hard_range')}
              </span>
            </div>
          </div>
        )}

        {/* Category selection — infinite mode only */}
        {mode === 'infinite' && status === 'choosing-category' && (
          <div className="ranking-category-selection">
            <div className="ranking-category-title">{t('ranking.choose_category')}</div>
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
        {!(isSubmitted && stageCount > 1) && (
          <CriterionBanner criterion={criterion} stageIndex={stageIndex} stageCount={stageCount} t={t} />
        )}

        {/* === PLAYING === */}
        {playedElsewhere && (
          <DailyPlayedElsewhereCard game={elsewhere.game}>
            <RankingLeaderboard dailyKey={dailyKey} />
          </DailyPlayedElsewhereCard>
        )}

        {status === 'playing' && !playedElsewhere && (
          <>
            <div className="ranking-drag-hint">{t('ranking.drag_hint')}</div>
            <div className="ranking-attempt-counter">
              Essai {attemptNumber} / {maxAttempts}
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
                                <span className="ranking-country-name">{getCountryName(country.properties.ISO_A2, i18n.language) || country.properties.ADMIN}</span>
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
                  {t('buttons.submit_ranking')}
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
                      <span className="ranking-country-name">{getCountryName(country.properties.ISO_A2, i18n.language) || country.properties.ADMIN}</span>
                    </div>
                  ))}
                </div>

                <button className="ranking-submit-btn" onClick={retryAttempt}>
                  ↺ Réessayer — Essai {attemptNumber + 1} / {maxAttempts}
                </button>
              </>
            )}
          </>
        )}

        {/* === STAGE DONE (daily, before the next criterion) === */}
        {status === 'stage-done' && stageResults.length > 0 && (
          <>
            <div className="ranking-score">
              <div className="ranking-score-value">
                +{stageScore} pt{stageScore !== 1 ? 's' : ''}
              </div>
              <div className="ranking-score-sub">
                {t('ranking.stage_progress', { done: stageResults.length, count: stageCount })}
              </div>
            </div>
            <CorrectRanking
              stage={stageResults[stageResults.length - 1]}
              title={t('ranking.correct_ranking')}
              t={t}
              language={i18n.language}
            />
            <button className="ranking-submit-btn" onClick={nextStage}>
              {t('ranking.next_criterion')}
            </button>
          </>
        )}

        {/* === SUBMITTED === */}
        {isSubmitted && (
          <>
            {/* Score */}
            <div className="ranking-score">
              <div className="ranking-score-value">
                {score} / {maxScore} pts
              </div>
              <div className="ranking-score-sub">
                {t('ranking.total_error')} {totalError} position{totalError !== 1 ? 's' : ''}
              </div>
            </div>
            {stageResults.length > 1 && (
              <div className="ranking-stage-summary">
                {stageResults.map((stage) => (
                  <div key={stage.criterion.key} className="ranking-stage-summary-row">
                    <span className="ranking-stage-summary-name">{t(`ranking.${stage.criterion.key}`)}</span>
                    <span className="ranking-stage-summary-detail">
                      {stage.score > 0
                        ? t('ranking.found_at_attempt', { attempt: stage.attempts })
                        : t('ranking.not_found', { count: stage.totalError })}
                    </span>
                    <span className="ranking-stage-summary-points">{stage.score} pt{stage.score !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
            <ShareScoreButton
              score={score}
              gameType="RANKING"
              difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
              details={t('share.details_ranking_error', { count: totalError })}
              challenge={mode === 'daily' ? { route: '/ranking', dailyKey } : null}
            />

            {/* Correct rankings revealed */}
            {stageResults.map((stage) => (
              <CorrectRanking
                key={stage.criterion.key}
                stage={stage}
                title={stageResults.length > 1
                  ? `${t('ranking.correct_ranking')} · ${t(`ranking.${stage.criterion.key}`)}`
                  : t('ranking.correct_ranking')}
                t={t}
                language={i18n.language}
              />
            ))}

            {/* Daily leaderboard submission */}
            {mode === 'daily' && (
              <LeaderboardSave
                saver={saver}
                variant="ranking"
                maxLength={30}
                existingText={(existing) =>
                  `${existing.score} ${t('units.pts')} · ${existing.totalError} ${t('units.position', { count: existing.totalError })}`
                }
                blockedLabel={t('ranking.better_score_exists')}
                blockedHint={t('form.use_different_name_daily')}
              />
            )}

            {mode === 'daily' && (
              <RankingLeaderboard dailyKey={dailyKey} />
            )}

            {mode === 'infinite' && (
              <button className="ranking-next-btn" onClick={startNextRound}>
                {t('buttons.next_round')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
