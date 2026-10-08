// A survival run: lives, rounds of the chosen games, then the end screen.
// Solo (SurvivalPage) or in a multiplayer room (`room`: { onProgress({ score, lives }), onFinished(result) }).
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import useSurvivalState from '../../hooks/useSurvivalState'
import { useRecordGame } from '../../auth'
import { formatTime } from '../../utils/formatTime'
import { GAME_TYPES } from '../../utils/gameTypes'
import { survivalModesKey } from '../../utils/survivalConfig'
import { SURVIVAL_ROUND_ICONS } from '../../components/SurvivalOptions'
import SurvivalForm from './SurvivalForm'
import { BorderRound, ClueRound, PlacementRound, QuizRound, TypedRound, roundAnswer } from './SurvivalRounds'
import 'react-toastify/dist/ReactToastify.css'
import './Survival.css'

function Hearts({ lives, maxLives }) {
  // Many lives: a counter rather than a row of hearts
  if (maxLives > 5) return <span className="survival-hearts">❤️ × {lives}</span>
  return (
    <span className="survival-hearts" aria-label={`${lives} / ${maxLives}`}>
      {Array.from({ length: maxLives }, (_, index) => (
        <span key={index} className={index < lives ? 'survival-heart' : 'survival-heart survival-heart--lost'}>
          {index < lives ? '❤️' : '🖤'}
        </span>
      ))}
    </span>
  )
}

export default function SurvivalGame({ modes, lives, seed, snapshot = null, snapshotKey = null, room = null, onRestart, onHome }) {
  const { t, i18n } = useTranslation()
  const survival = useSurvivalState({ modes, lives, seed, snapshot, snapshotKey })
  const { round, roundIndex, totalRounds, score, errors, outcome, isOver, isWon, elapsedMs, submitText, giveUp, next } = survival
  const modesKey = survivalModesKey(modes)

  // Feedback of a typed answer or a click (a life lost, a name not recognised...)
  const notify = useCallback((result) => {
    if (result === 'wrong') toast.error(t('survival.life_lost'), { containerId: 'survivalToast' })
    else if (result === 'unknown') toast.info(t('survival.not_a_country'), { containerId: 'survivalToast' })
    else if (result === 'repeat') toast.info(t('toasts.already_proposed'), { containerId: 'survivalToast' })
    return result
  }, [t])
  const onSubmit = useCallback((text) => notify(submitText(text)), [notify, submitText])
  const roundSurvival = {
    ...survival,
    clickCountry: (name) => notify(survival.clickCountry(name)),
    chooseAnswer: (id) => notify(survival.chooseAnswer(id)),
  }

  // Multiplayer: every round cleared or life lost, then the result
  const onProgress = room?.onProgress
  useEffect(() => {
    onProgress?.({ score, lives: survival.lives })
  }, [onProgress, score, survival.lives])

  const onFinished = room?.onFinished
  useEffect(() => {
    if (isOver) onFinished?.({ score, errors, elapsedTime: elapsedMs, total: totalRounds })
  }, [isOver]) // eslint-disable-line react-hooks/exhaustive-deps

  useRecordGame(
    isOver && !room
      ? { gameType: GAME_TYPES.SURVIVAL, mode: 'survival', score, total: totalRounds, errors, lives, elapsedTime: elapsedMs, difficulty: modesKey }
      : null
  )

  const renderRound = () => {
    if (!round) return null
    switch (round.type) {
      case GAME_TYPES.PLACEMENT: return <PlacementRound survival={roundSurvival} />
      case GAME_TYPES.FLAGS:
      case GAME_TYPES.CAPITALS: return <TypedRound key={roundIndex} survival={survival} onSubmit={onSubmit} />
      case GAME_TYPES.BORDER_GUESS: return <BorderRound key={roundIndex} survival={survival} onSubmit={onSubmit} />
      case GAME_TYPES.COUNTRY_CLUE: return <ClueRound key={roundIndex} survival={survival} onSubmit={onSubmit} />
      case GAME_TYPES.QUIZ: return <QuizRound key={roundIndex} survival={roundSurvival} />
      default: return null
    }
  }

  return (
    <div className={`survival-game${round?.type === GAME_TYPES.PLACEMENT ? ' survival-game--map' : ''}`}>
      <header className="survival-hud">
        <Hearts lives={survival.lives} maxLives={lives} />
        <div className="survival-hud-round">
          <span className="survival-hud-label">{t('survival.round', { n: roundIndex + 1 })}</span>
          {round && (
            <strong>{SURVIVAL_ROUND_ICONS[round.type]} {t(`survival.prompt.${round.type}`)}</strong>
          )}
        </div>
        <div className="survival-hud-stats">
          <span><strong>{score}</strong> {t('survival.rounds_short')}</span>
          <span>{formatTime(elapsedMs)}</span>
        </div>
      </header>

      <main className="survival-round">{renderRound()}</main>

      <footer className="survival-footer">
        {outcome ? (
          <div className={`survival-outcome survival-outcome--${outcome}`}>
            <span>
              {outcome === 'correct'
                ? t('survival.correct')
                : t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) })}
            </span>
            {!isOver && <button className="survival-btn" onClick={next}>{t('survival.next')}</button>}
          </div>
        ) : (
          <>
            {!room && <button className="survival-btn survival-btn--ghost" onClick={onHome}>{t('buttons.home')}</button>}
            <button className="survival-btn survival-btn--danger" onClick={giveUp} disabled={isOver}>{t('survival.give_up')}</button>
          </>
        )}
      </footer>

      {isOver && (
        <div className="game-over-overlay">
          <div className="game-over-content survival-over">
            <h2>{isWon ? t('survival.victory') : t('survival.game_over')}</h2>
            {!isWon && round && <p className="survival-muted">{t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) })}</p>}
            <div className="survival-over-stats">
              <div><strong>{score}</strong><small>{t('survival.rounds_survived')}</small></div>
              <div><strong>{formatTime(elapsedMs)}</strong><small>{t('survival.time')}</small></div>
              <div><strong>{lives} ❤️</strong><small>{t('survival.lives_at_start')}</small></div>
            </div>
            {room ? (
              <p className="survival-muted">{t('game_over.waiting_players')}</p>
            ) : (
              <>
                <SurvivalForm score={score} elapsedTime={elapsedMs} modes={modesKey} lives={lives} />
                <div className="game-over-actions">
                  <button className="hud-btn hud-btn--restart" onClick={onRestart}>{t('buttons.restart')}</button>
                  <button className="hud-btn hud-btn--home" onClick={onHome}>{t('buttons.home')}</button>
                </div>
                <Link className="survival-link" to={`/scores?game=${GAME_TYPES.SURVIVAL}&lives=${lives}&modes=${modesKey}`}>
                  {t('survival.see_leaderboard')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="survivalToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}
