// src/components/PhaseIndicator.jsx
import React from 'react'
import './PhaseIndicator.css'

const DIFFICULTY_COLORS = {
  Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24', Impossible: '#f97316',
}

/**
 * Shows current phase name, remaining countries, and a progress bar.
 * Displayed during an Ascension game above the HUD.
 */
export default function PhaseIndicator({ currentPhase, phaseCountRemaining, totalPhaseCount }) {
  if (!currentPhase) return null
  const done = totalPhaseCount - phaseCountRemaining
  const pct = totalPhaseCount > 0 ? (done / totalPhaseCount) * 100 : 0
  const color = DIFFICULTY_COLORS[currentPhase] ?? '#e2e8f0'

  return (
    <div className="phase-indicator">
      <div className="phase-indicator-row">
        <span className="phase-indicator-label" style={{ color }}>Phase : {currentPhase}</span>
        <span className="phase-indicator-count">{phaseCountRemaining} restants</span>
      </div>
      <div
          className="phase-indicator-track"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression phase ${currentPhase}`}
        >
        <div className="phase-indicator-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
