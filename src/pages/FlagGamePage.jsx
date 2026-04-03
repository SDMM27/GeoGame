// src/pages/FlagGamePage.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as Flags from 'country-flag-icons/react/3x2'
import { ToastContainer } from 'react-toastify'
import useFlagGameState from '../hooks/useFlagGameState'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import PhaseIndicator from '../components/PhaseIndicator'
import Form from './form'
import AscensionForm from './AscensionForm'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'
import './FlagGamePage.css'

function FlagGameLayout({ difficulty, isTraining, isAscension, presetName, state }) {
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
  useEffect(() => {
    if (targetCountry && !revealedName) inputRef.current?.focus()
  }, [targetCountry, revealedName])

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0
  const isoA2 = targetCountry?.properties?.ISO_A2?.toUpperCase()
  const FlagComponent = isoA2 ? Flags[isoA2] : null
  const onKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

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
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">DRAPEAUX</span>
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

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry} disabled={!!revealedName}>👁 Voir</button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
      </div>

      <div className="flag-game-main">
        {FlagComponent
          ? <FlagComponent className="flag-display" title={revealedName ?? '?'} />
          : <div className="flag-placeholder" />
        }
        {revealedName && <div className="flag-revealed-name">{revealedName}</div>}
        <div className="flag-input-row">
          <input
            ref={inputRef}
            className="flag-input"
            type="text"
            placeholder="Tape le nom du pays..."
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

      {isGameOver && targetCountry && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {isAscension ? (
              <AscensionForm
                score={score} timer={timer} stats={stats} phaseStats={phaseStats}
                gameType={GAME_TYPES.FLAGS} presetName={presetName ?? null} isTraining={isTraining}
              />
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="FLAGS" />
            )}
            <div className="game-over-actions">
              <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
              <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}

function StandardFlagGame({ difficulty, isTraining }) {
  const state = useFlagGameState(difficulty, isTraining)
  return (
    <FlagGameLayout
      difficulty={difficulty}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
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

export default function FlagGamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionFlagGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardFlagGame difficulty={difficulty} isTraining={isTraining} />
}
