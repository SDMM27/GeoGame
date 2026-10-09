// A survival run: lives, rounds of the chosen games, then the end screen.
// Solo (SurvivalPage) or in a multiplayer room (`room`: { onProgress(state), onFinished(result, { stay }), onExit() }).
// Live rooms: a player out of lives keeps watching the others (Spectator) until they leave or the game ends.
// `sync` (live rooms): { startAt, entries, playerId }, everyone plays the same round at the same time (useSurvivalSync);
// the last player left wins once done with the round where the others ran out of lives.
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import useSurvivalState from '../../hooks/useSurvivalState'
import useSurvivalSync from '../../hooks/useSurvivalSync'
import { useRecordGame } from '../../auth'
import { formatTime } from '../../utils/formatTime'
import { GAME_TYPES } from '../../utils/gameTypes'
import { matchSurvivalRamp, survivalModesKey } from '../../utils/survivalConfig'
import { SURVIVAL_ROUND_ICONS } from '../../components/SurvivalOptions'
import { DIFFICULTY_COLORS } from '../quiz/constants'
import SurvivalForm from './SurvivalForm'
import { BorderRound, PlacementRound, QuizRound, TypedRound, roundAnswer } from './SurvivalRounds'
import { othersStillIn, spectatorRows } from '../../utils/survivalSync'
import { localizeQuestion } from '../../utils/quizQuestions'
import 'react-toastify/dist/ReactToastify.css'
import './Survival.css'

const NO_ENTRIES = []

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

// Out of lives in a live room: the round the others are playing, who is still in, and the answer once they all answered
function Spectator({ round, roundIndex, rows, waiting, maxLives, onExit }) {
  const { t, i18n } = useTranslation()
  const revealed = waiting.total > 0 && waiting.done === waiting.total
  const iso = round?.country?.properties?.ISO_A2
  const showsFlag = iso && (round.type === GAME_TYPES.FLAGS || round.type === GAME_TYPES.CAPITALS)
  return (
    <div className="survival-spectator">
      <p className="survival-spectator-title">👀 {t('survival.spectating')}</p>
      {round && (
        <div className="survival-spectator-round">
          <span className="survival-hud-label">
            {t('survival.round', { n: roundIndex + 1 })} · {SURVIVAL_ROUND_ICONS[round.type]} {t(`survival.prompt.${round.type}`)}
          </span>
          {showsFlag && <img src={`/flags/${iso.toLowerCase()}.png`} alt="" className="survival-flag survival-flag--small" />}
          {round.type === GAME_TYPES.QUIZ && <strong>{localizeQuestion(round.question, i18n.language, t).prompt}</strong>}
          <span className={revealed ? 'survival-spectator-answer' : 'survival-muted'}>
            {revealed ? t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) }) : t('survival.waiting_players', waiting)}
          </span>
        </div>
      )}
      <ul className="survival-spectator-list">
        {rows.map((row) => (
          <li key={row.id} className={row.out ? 'survival-spectator-row survival-spectator-row--out' : 'survival-spectator-row'}>
            <span className="survival-spectator-name">{row.pseudo}</span>
            {row.out ? (
              <span>💀 {t('survival.out_round', { n: row.outRound + 1 })}</span>
            ) : (
              <>
                <span>{maxLives > 5 ? `❤️ × ${row.lives}` : '❤️'.repeat(row.lives)}</span>
                <span className="survival-spectator-status">{row.answered ? '✓' : '…'}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <button className="survival-btn" onClick={onExit}>{t('survival.back_to_room')}</button>
    </div>
  )
}

export default function SurvivalGame({
  modes,
  lives,
  timer = 0,
  ramp = null,
  seed,
  snapshot = null,
  snapshotKey = null,
  room = null,
  sync = null,
  onRestart,
  onHome,
}) {
  const { t, i18n } = useTranslation()
  const synced = Boolean(sync)
  const shared = useSurvivalSync({ enabled: synced, startAt: sync?.startAt ?? 0, timer, entries: sync?.entries ?? NO_ENTRIES, playerId: sync?.playerId })
  const survival = useSurvivalState({
    modes,
    lives,
    timer,
    ramp,
    seed,
    snapshot,
    snapshotKey,
    extraSnapshot: { synced },
    autoAdvance: !synced,
    deadline: shared.deadline,
  })
  const { round, roundIndex, totalRounds, score, errors, outcome, timedOut, isOver, isWon, elapsedMs, timeLeftMs, submitText, giveUp, next, goTo, win } = survival
  const modesKey = survivalModesKey(modes)
  // Only the preset ramps are ranked
  const rampName = matchSurvivalRamp(ramp)

  // Live room: everyone moves on together
  useEffect(() => {
    if (synced && shared.round > roundIndex) goTo(shared.round)
  }, [synced, shared.round, roundIndex, goTo])

  // Live room: everyone else is out of lives, the game ends once this round is answered
  const lastRound = shared.lastSurvivorRound
  const lastStanding = synced && lastRound != null
  useEffect(() => {
    if (lastStanding && (roundIndex > lastRound || (roundIndex === lastRound && outcome))) win()
  }, [lastStanding, lastRound, roundIndex, outcome, win])

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

  // Multiplayer: rounds cleared and lives left, plus the round being played in a live room
  const onProgress = room?.onProgress
  const roundDone = Boolean(outcome)
  const inSharedRound = synced && roundIndex === shared.round
  useEffect(() => {
    if (!onProgress || (synced && !inSharedRound)) return
    onProgress({
      score,
      lives: survival.lives,
      ...(synced && { round: roundIndex, roundAt: shared.startAt, roundDone }),
    })
  }, [onProgress, synced, inSharedRound, score, survival.lives, roundIndex, shared.startAt, roundDone])

  const onFinished = room?.onFinished
  useEffect(() => {
    // Live room: the result goes in, and the player stays to watch the others (or see the end) until they leave
    if (isOver) onFinished?.({ score, errors, elapsedTime: elapsedMs, total: totalRounds }, { stay: synced && Boolean(room?.onExit) })
  }, [isOver]) // eslint-disable-line react-hooks/exhaustive-deps
  const spectating = synced && isOver && !isWon && othersStillIn(sync.entries, sync.playerId)

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
      case GAME_TYPES.QUIZ: return <QuizRound key={roundIndex} survival={roundSurvival} />
      default: return null
    }
  }

  const secondsLeft = timeLeftMs == null ? null : Math.ceil(timeLeftMs / 1000)

  return (
    <div className={`survival-game${round?.type === GAME_TYPES.PLACEMENT ? ' survival-game--map' : ''}`}>
      <header className="survival-hud">
        <Hearts lives={survival.lives} maxLives={lives} />
        <div className="survival-hud-round">
          <span className="survival-hud-label">
            {t('survival.round', { n: roundIndex + 1 })}
            {round && (
              <span className="survival-hud-difficulty" style={{ color: DIFFICULTY_COLORS[round.difficulty] }}>
                {' · '}{t(`difficulties.${round.difficulty}`)}
              </span>
            )}
          </span>
          {round && (
            <strong>{SURVIVAL_ROUND_ICONS[round.type]} {t(`survival.prompt.${round.type}`)}</strong>
          )}
        </div>
        <div className="survival-hud-stats">
          <span><strong>{score}</strong> {t('survival.rounds_short')}</span>
          {secondsLeft != null && !outcome && !isOver ? (
            <span className={`survival-countdown${secondsLeft <= 5 ? ' survival-countdown--low' : ''}`}>⏱ {secondsLeft} s</span>
          ) : (
            <span>{formatTime(elapsedMs)}</span>
          )}
        </div>
      </header>

      <main className="survival-round">{renderRound()}</main>

      <footer className="survival-footer">
        {outcome ? (
          <div className={`survival-outcome survival-outcome--${outcome}`}>
            <span>
              {outcome === 'correct'
                ? t('survival.correct')
                : `${timedOut ? `${t('survival.time_up')} ` : ''}${t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) })}`}
            </span>
            {!isOver && (synced ? (
              <span className="survival-waiting">
                {t('survival.waiting_players', { done: shared.waiting.done, total: shared.waiting.total })}
              </span>
            ) : (
              <button className="survival-btn" onClick={next}>{t('survival.next')}</button>
            ))}
          </div>
        ) : (
          <>
            {!room && <button className="survival-btn survival-btn--ghost" onClick={onHome}>{t('buttons.home')}</button>}
            <button className="survival-btn survival-btn--danger" onClick={giveUp} disabled={isOver}>{t('survival.give_up')}</button>
          </>
        )}
      </footer>

      {spectating && (
        <div className="game-over-overlay">
          <div className="game-over-content survival-over">
            <h2>{t('survival.game_over')}</h2>
            <Spectator
              round={survival.rounds[shared.round] ?? null}
              roundIndex={shared.round}
              rows={spectatorRows(sync.entries, sync.names, shared.round)}
              waiting={shared.waiting}
              maxLives={lives}
              onExit={room.onExit}
            />
          </div>
        </div>
      )}

      {isOver && !spectating && (
        <div className="game-over-overlay">
          <div className="game-over-content survival-over">
            <h2>{isWon ? t(lastStanding ? 'survival.last_standing' : 'survival.victory') : t('survival.game_over')}</h2>
            {!isWon && round && <p className="survival-muted">{t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) })}</p>}
            <div className="survival-over-stats">
              <div><strong>{score}</strong><small>{t('survival.rounds_survived')}</small></div>
              <div><strong>{formatTime(elapsedMs)}</strong><small>{t('survival.time')}</small></div>
              <div><strong>{lives} ❤️</strong><small>{t('survival.lives_at_start')}</small></div>
            </div>
            {room ? (
              synced && room.onExit ? (
                <button className="survival-btn" onClick={room.onExit}>{t('survival.back_to_room')}</button>
              ) : (
                <p className="survival-muted">{t('game_over.waiting_players')}</p>
              )
            ) : (
              <>
                {rampName ? (
                  <SurvivalForm score={score} elapsedTime={elapsedMs} modes={modesKey} lives={lives} timer={timer} ramp={rampName} />
                ) : (
                  <p className="survival-muted">{t('survival.ramp_custom_hint')}</p>
                )}
                <div className="game-over-actions">
                  <button className="hud-btn hud-btn--restart" onClick={onRestart}>{t('buttons.restart')}</button>
                  <button className="hud-btn hud-btn--home" onClick={onHome}>{t('buttons.home')}</button>
                </div>
                <Link
                  className="survival-link"
                  to={`/scores?game=${GAME_TYPES.SURVIVAL}&lives=${lives}&timer=${timer}&ramp=${rampName ?? ''}&modes=${modesKey}`}
                >
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
