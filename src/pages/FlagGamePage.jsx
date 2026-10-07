// src/pages/FlagGamePage.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastContainer } from 'react-toastify'
import useFlagGameState from '../hooks/useFlagGameState'
import { snapshotKey, loadSnapshot } from '../utils/multiplayerSnapshot'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import { setupGameRecord } from '../utils/gameHistory'
import { useRecordGame } from '../auth'
import { matchKnownAnswer } from '../utils/answerLexicon'
import { getCountryName, getAllCountryNames } from '../utils/getCountryName'
import PhaseIndicator from '../components/PhaseIndicator'
import Form from './form'
import AscensionForm from './AscensionForm'
import ShareScoreButton from '../components/ShareScoreButton'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'
import './FlagGamePage.css'

function FlagGameLayout({ difficulty, isTraining, isAscension, presetName, state, onGameFinished = null, continent }) {
  const { t, i18n } = useTranslation()
  const {
    targetCountry, targetCountryISO, score, timer, stats,
    isGameOver, displayTimer,
    inputValue, setInputValue, handleSubmit,
    revealedName,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = state

  // Multiplayer games (onGameFinished) belong to their room, not to the history.
  useRecordGame(
    isGameOver && !onGameFinished
      ? setupGameRecord({ gameType: GAME_TYPES.FLAGS, isTraining, isAscension, presetName, difficulty, continent, score, stats, timer })
      : null
  )

  const inputRef = useRef(null)
  const [isInputFocused, setIsInputFocused] = useState(false)
  useEffect(() => {
    if (targetCountry && !revealedName) inputRef.current?.focus()
  }, [targetCountry, revealedName])

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0
  const isoA2 = targetCountry?.properties?.ISO_A2?.toLowerCase()
  const onKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }
  const shouldAutoSubmit = Boolean(
    inputValue.trim() &&
    targetCountry &&
    !revealedName &&
    !isGameOver &&
    matchKnownAnswer(
      inputValue,
      getAllCountryNames(targetCountry.properties.ISO_A2, targetCountry.properties.ADMIN, targetCountry.properties.aliases ?? []),
      { whileTyping: true }
    )
  )

  useEffect(() => {
    if (shouldAutoSubmit) handleSubmit()
  }, [shouldAutoSubmit, handleSubmit])

  return (
    <div className={`flag-game-page${isInputFocused ? ' flag-game-page--input-active' : ''}`}>
      {isAscension && (
        <PhaseIndicator
          currentPhase={currentPhase}
          phaseCountRemaining={phaseCountRemaining}
          totalPhaseCount={totalPhaseCount}
        />
      )}

      <div className={`hud-container${isAscension ? ' hud-container--with-phase' : ''}`}>
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{score}</span>
              <span className="hud-label">{t('game_hud.score')}</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">{t('game_hud.flags')}</span>
              <span className="hud-target-name">?</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">{t('game_hud.time')}</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} {t('game_hud.countries')}</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">{t('game_hud.found')}</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
            <span className="hud-stat-label">{t('game_hud.skipped')}</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">{t('game_hud.remaining')}</span>
          </div>
        </div>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>{t('buttons.home')}</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry} disabled={!!revealedName}>{t('buttons.see')}</button>
        {!onGameFinished && <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>}
      </div>

      <div className="flag-game-main">
        {isoA2
          ? <img src={`/flags/${isoA2}.png`} alt={revealedName ? (getCountryName(targetCountryISO, i18n.language) || targetCountry?.properties?.ADMIN) : '?'} className="flag-display" />
          : <div className="flag-placeholder" />
        }
        {revealedName && <div className="flag-revealed-name">{getCountryName(targetCountryISO, i18n.language) || targetCountry?.properties?.ADMIN}</div>}
        <div className="flag-input-row">
          <input
            ref={inputRef}
            className="flag-input"
            type="text"
            placeholder={t('placeholders.country_name')}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              setIsInputFocused(true)
              window.setTimeout(() => inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
            }}
            onBlur={() => setIsInputFocused(false)}
            disabled={!!revealedName || isGameOver}
          />
          <button
            className="flag-submit-btn"
            onClick={handleSubmit}
            disabled={!!revealedName || isGameOver || !inputValue.trim()}
          >
            <span aria-label={t('buttons.validate')}>→</span>
          </button>
        </div>
      </div>

      {isGameOver && targetCountry && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {onGameFinished ? (
              <div className="mp-game-waiting">
                <p style={{ color: '#4ade80', fontSize: '1.5rem' }}>{t('game_over.completed')}</p>
                <p style={{ color: '#94a3b8' }}>{t('game_over.waiting_players')}</p>
              </div>
            ) : isAscension ? (
              <AscensionForm
                score={score} timer={timer} stats={stats} phaseStats={phaseStats}
                gameType={GAME_TYPES.FLAGS} presetName={presetName ?? null} isTraining={isTraining}
              />
            ) : (
              <>
                <ShareScoreButton
                  score={score}
                  gameType="FLAGS"
                  difficulty={difficulty}
                  details={t('share.details_flags_timer', { found: stats.found, total: stats.total, time: timer ? `${Math.floor(timer/60000)}m${String(Math.floor((timer%60000)/1000)).padStart(2,'0')}s` : '' })}
                />
                <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="FLAGS" continent={continent} />
              </>
            )}
            {!onGameFinished && (
              <div className="game-over-actions">
                <button className="hud-btn hud-btn--restart" onClick={restartGame}>{t('buttons.restart')}</button>
                <button className="hud-btn hud-btn--home" onClick={goHome}>{t('buttons.home')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}

function StandardFlagGame({ difficulty, isTraining, continent }) {
  const state = useFlagGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <FlagGameLayout
      difficulty={difficulty ?? continent}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
      continent={continent}
    />
  )
}

function AscensionFlagGame({ phases, isTraining, presetName }) {
  const state = useAscensionState(GAME_TYPES.FLAGS, phases, isTraining, true)
  return (
    <FlagGameLayout
      difficulty={null}
      isTraining={isTraining}
      isAscension
      presetName={presetName}
      state={state}
    />
  )
}

export function MultiplayerFlagsGame({ gameConfig, overrideCountries, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  if (gameConfig.mode === 'ascension') {
    return (
      <MultiplayerAscensionFlagsGame
        gameConfig={gameConfig}
        overridesByDifficulty={overridesByDifficulty}
        onCountryFound={onCountryFound}
        onGameFinished={onGameFinished}
        roomId={roomId}
        playerId={playerId}
        gameIndex={gameIndex}
      />
    )
  }
  return (
    <MultiplayerStandardFlagsGame
      gameConfig={gameConfig}
      overrideCountries={overrideCountries}
      onCountryFound={onCountryFound}
      onGameFinished={onGameFinished}
      roomId={roomId}
      playerId={playerId}
      gameIndex={gameIndex}
    />
  )
}

function MultiplayerStandardFlagsGame({ gameConfig, overrideCountries, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useFlagGameState(gameConfig.difficulty, false, overrideCountries, mpSnapshot, mpSnapKey)
  const prevFoundRef = useRef(mpSnapshot?.found ?? 0)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    const perfects = state.stats.foundFirstTry ?? 0
    onGameFinished({
      attempts: totalErrorsRef.current,
      elapsedTime: state.timer,
      countriesSolved: state.stats.found,
      weightedScore: scoreRef.current,
      perfects,
      stumbles: state.stats.found - perfects,
      failures: state.stats.skipped,
    })
  }, [state.isGameOver, onGameFinished, state.stats.found, state.stats.skipped, state.timer])

  return (
    <FlagGameLayout
      difficulty={gameConfig.difficulty}
      isTraining={false}
      isAscension={false}
      presetName={null}
      state={state}
      onGameFinished={onGameFinished}
    />
  )
}

function MultiplayerAscensionFlagsGame({ gameConfig, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useAscensionState(GAME_TYPES.FLAGS, gameConfig.phases, false, true, overridesByDifficulty, mpSnapshot, mpSnapKey)
  const prevFoundRef = useRef(mpSnapshot?.found ?? 0)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    const perfects = state.stats.foundFirstTry ?? 0
    onGameFinished({
      attempts: totalErrorsRef.current,
      elapsedTime: state.timer,
      countriesSolved: state.stats.found,
      weightedScore: scoreRef.current,
      perfects,
      stumbles: state.stats.found - perfects,
      failures: state.stats.skipped,
    })
  }, [state.isGameOver, onGameFinished, state.stats.found, state.stats.skipped, state.timer])

  return (
    <FlagGameLayout
      difficulty={null}
      isTraining={false}
      isAscension
      presetName={gameConfig.presetName ?? null}
      state={state}
      onGameFinished={onGameFinished}
    />
  )
}

export default function FlagGamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionFlagGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardFlagGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
}
