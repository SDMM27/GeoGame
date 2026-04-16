// src/pages/CapitalsGamePage.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as Flags from 'country-flag-icons/react/3x2'
import { ToastContainer } from 'react-toastify'
import useCapitalsGameState from '../hooks/useCapitalsGameState'
import { snapshotKey, loadSnapshot } from '../utils/multiplayerSnapshot'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import { checkAnswer } from '../utils/normalizeAnswer'
import PhaseIndicator from '../components/PhaseIndicator'
import Form from './form'
import AscensionForm from './AscensionForm'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'
import './FlagGamePage.css'
import './CapitalsGamePage.css'

function CapitalsGameLayout({ difficulty, isTraining, isAscension, presetName, state, onGameFinished = null, continent }) {
  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    inputValue, setInputValue, handleSubmit,
    revealedName,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = state

  const inputRef = useRef(null)
  const [isInputFocused, setIsInputFocused] = useState(false)

  // Focus input à chaque nouveau pays
  useEffect(() => {
    if (targetCountry && !revealedName) {
      inputRef.current?.focus()
    }
  }, [targetCountry, revealedName])

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0

  const isoA2 = targetCountry?.properties?.ISO_A2?.toUpperCase()
  const FlagComponent = isoA2 ? Flags[isoA2] : null

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }
  const shouldAutoSubmit = Boolean(
    inputValue.trim() &&
    targetCountry &&
    !revealedName &&
    !isGameOver &&
    checkAnswer(inputValue, targetCountry.properties.capital, targetCountry.properties.capitalAliases ?? [])
  )

  useEffect(() => {
    if (shouldAutoSubmit) handleSubmit()
  }, [shouldAutoSubmit, handleSubmit])

  return (
    <div className={`capitals-game-page${isInputFocused ? ' capitals-game-page--input-active' : ''}`}>
      {isAscension && (
        <PhaseIndicator
          currentPhase={currentPhase}
          phaseCountRemaining={phaseCountRemaining}
          totalPhaseCount={totalPhaseCount}
        />
      )}
      {/* HUD — structure identique à FlagGamePage */}
      <div className={`hud-container${isAscension ? ' hud-container--with-phase' : ''}`}>
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{score}</span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">CAPITALES</span>
              <span className="hud-target-name">?</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} pays</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
            <span className="hud-stat-label">✗ PASSÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">◎ RESTANTS</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry} disabled={!!revealedName}>
          👁 Voir
        </button>
        {!onGameFinished && <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>}
      </div>

      {/* Contenu principal */}
      <div className="capitals-game-main">
        {/* Indice 1 : Drapeau */}
        {FlagComponent
          ? <FlagComponent className="flag-display" title={targetCountry?.properties?.ADMIN ?? '?'} />
          : <div className="flag-placeholder" />
        }

        {/* Indice 2 : Nom du pays */}
        <div className="capitals-country-name">
          <span className="capitals-country-label">Pays</span>
          <span className="capitals-country-value">
            {targetCountry?.properties?.ADMIN ?? ''}
          </span>
        </div>

        {/* Révélation de la capitale */}
        {revealedName && (
          <div className="flag-revealed-name">{revealedName}</div>
        )}

        {/* Saisie */}
        <div className="flag-input-row">
          <input
            ref={inputRef}
            className="flag-input"
            type="text"
            placeholder="Tape la capitale..."
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
            <span aria-label="Valider">→</span>
          </button>
        </div>
      </div>

      {/* Overlay fin de partie — targetCountry guard évite un flash pendant restartGame */}
      {isGameOver && targetCountry && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {onGameFinished ? (
              <div className="mp-game-waiting">
                <p style={{ color: '#4ade80', fontSize: '1.5rem' }}>✓ Terminé !</p>
                <p style={{ color: '#94a3b8' }}>En attente des autres joueurs...</p>
              </div>
            ) : isAscension ? (
              <AscensionForm
                score={score}
                timer={timer}
                stats={stats}
                phaseStats={phaseStats}
                gameType={GAME_TYPES.CAPITALS}
                presetName={presetName ?? null}
                isTraining={isTraining}
              />
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="CAPITALS" continent={continent} />
            )}
            {!onGameFinished && (
              <div className="game-over-actions">
                <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
                <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer
        enableMultiContainer
        containerId="centerToast"
        position="bottom-center"
        autoClose={3000}
        theme="dark"
        hideProgressBar
      />
      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />
    </div>
  )
}

function StandardCapitalsGame({ difficulty, isTraining, continent }) {
  const state = useCapitalsGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <CapitalsGameLayout
      difficulty={difficulty ?? continent}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
      continent={continent}
    />
  )
}

function AscensionCapitalsGame({ phases, isTraining, presetName }) {
  const state = useAscensionState(GAME_TYPES.CAPITALS, phases, isTraining, true)
  return (
    <CapitalsGameLayout
      difficulty={null}
      isTraining={isTraining}
      isAscension
      presetName={presetName}
      state={state}
    />
  )
}

export function MultiplayerCapitalsGame({ gameConfig, overrideCountries, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  if (gameConfig.mode === 'ascension') {
    return (
      <MultiplayerAscensionCapitalsGame
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
    <MultiplayerStandardCapitalsGame
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

function MultiplayerStandardCapitalsGame({ gameConfig, overrideCountries, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useCapitalsGameState(gameConfig.difficulty, false, overrideCountries, mpSnapshot, mpSnapKey)
  const prevFoundRef = useRef(mpSnapshot?.found ?? 0)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score
  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) { onCountryFound(); prevFoundRef.current = state.stats.found }
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
  return <CapitalsGameLayout difficulty={gameConfig.difficulty} isTraining={false} isAscension={false} presetName={null} state={state} onGameFinished={onGameFinished} />
}

function MultiplayerAscensionCapitalsGame({ gameConfig, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useAscensionState(GAME_TYPES.CAPITALS, gameConfig.phases, false, true, overridesByDifficulty, mpSnapshot, mpSnapKey)
  const prevFoundRef = useRef(mpSnapshot?.found ?? 0)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score
  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) { onCountryFound(); prevFoundRef.current = state.stats.found }
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
  return <CapitalsGameLayout difficulty={null} isTraining={false} isAscension presetName={gameConfig.presetName ?? null} state={state} onGameFinished={onGameFinished} />
}

export default function CapitalsGamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionCapitalsGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardCapitalsGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
}
