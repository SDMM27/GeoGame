// Survival settings: the games of the rounds, the lives, the time per round and how fast the difficulty rises.
// Used by the home page card and by the multiplayer room editor.
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_SURVIVAL_LIVES,
  DEFAULT_SURVIVAL_RAMP,
  DEFAULT_SURVIVAL_TIMER,
  SURVIVAL_LIVES,
  SURVIVAL_RAMPS,
  SURVIVAL_RAMP_MAX,
  SURVIVAL_RAMP_NAMES,
  SURVIVAL_RAMP_TIERS,
  SURVIVAL_ROUND_TYPES,
  SURVIVAL_TIMERS,
  matchSurvivalRamp,
} from '../utils/survivalConfig'
import { DIFFICULTY_COLORS } from '../pages/quiz/constants'
import './SurvivalOptions.css'

export const SURVIVAL_ROUND_ICONS = {
  PLACEMENT: '🌍',
  FLAGS: '🚩',
  CAPITALS: '🏛️',
  BORDER_GUESS: '🧭',
  QUIZ: '🧠',
}

export const SURVIVAL_RAMP_ICONS = { express: '⚡', normal: '🎯', gentle: '🌱', hardcore: '💀', custom: '🛠️' }

/** Settings of a new run: every game, the default lives, timer and ramp. */
export const defaultSurvivalOptions = () => ({
  modes: SURVIVAL_ROUND_TYPES,
  lives: DEFAULT_SURVIVAL_LIVES,
  timer: DEFAULT_SURVIVAL_TIMER,
  ramp: { ...SURVIVAL_RAMPS[DEFAULT_SURVIVAL_RAMP] },
  customRamp: false,
})

/** "30 s", or "Sans" without a time limit */
export const timerLabel = (timer, t) => (timer > 0 ? t('survival.timer_seconds', { count: timer }) : t('survival.timer_none'))

/** "⚡ Express", or "🛠️ Personnalisée" for steps that match no preset */
export function rampLabel(steps, t) {
  const name = matchSurvivalRamp(steps) ?? 'custom'
  return `${SURVIVAL_RAMP_ICONS[name]} ${t(`survival.ramp.${name}`)}`
}

// `options`: { modes, lives, timer, ramp, customRamp }. `onChange` is a state setter: it gets an updater of it.
export default function SurvivalOptions({ options, onChange }) {
  const { t } = useTranslation()
  const { modes, lives, timer, ramp, customRamp } = options
  const set = (patch) => onChange((previous) => ({ ...previous, ...patch }))
  const toggle = (type) => onChange((previous) => ({
    ...previous,
    modes: SURVIVAL_ROUND_TYPES.filter((m) => (m === type) !== previous.modes.includes(m)),
  }))
  const step = (tier, delta) => onChange((previous) => ({
    ...previous,
    ramp: { ...previous.ramp, [tier]: Math.min(SURVIVAL_RAMP_MAX, Math.max(0, previous.ramp[tier] + delta)) },
  }))
  const activeRamp = customRamp ? 'custom' : matchSurvivalRamp(ramp) ?? 'custom'

  return (
    <div className="survival-options">
      <span className="survival-options-label">{t('survival.choose_games')}</span>
      <div className="survival-options-games">
        {SURVIVAL_ROUND_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`survival-option${modes.includes(type) ? ' survival-option--active' : ''}`}
            aria-pressed={modes.includes(type)}
            onClick={() => toggle(type)}
          >
            <span aria-hidden="true">{SURVIVAL_ROUND_ICONS[type]}</span>
            {t(`survival.round_type.${type}`)}
          </button>
        ))}
      </div>
      {modes.length === 0 && <p className="survival-options-warning">{t('survival.pick_one_game')}</p>}

      <span className="survival-options-label">{t('survival.choose_lives')}</span>
      <div className="survival-options-lives">
        {SURVIVAL_LIVES.map((count) => (
          <button
            key={count}
            type="button"
            className={`survival-option survival-option--lives${lives === count ? ' survival-option--active' : ''}`}
            aria-pressed={lives === count}
            onClick={() => set({ lives: count })}
          >
            {count} ❤️
          </button>
        ))}
      </div>

      <span className="survival-options-label">{t('survival.choose_timer')}</span>
      <div className="survival-options-lives">
        {SURVIVAL_TIMERS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            className={`survival-option survival-option--lives${timer === seconds ? ' survival-option--active' : ''}`}
            aria-pressed={timer === seconds}
            onClick={() => set({ timer: seconds })}
          >
            {timerLabel(seconds, t)}
          </button>
        ))}
      </div>

      <span className="survival-options-label">{t('survival.choose_ramp')}</span>
      <div className="survival-options-games">
        {[...SURVIVAL_RAMP_NAMES, 'custom'].map((name) => (
          <button
            key={name}
            type="button"
            className={`survival-option${activeRamp === name ? ' survival-option--active' : ''}`}
            aria-pressed={activeRamp === name}
            onClick={() => set(name === 'custom' ? { customRamp: true } : { ramp: { ...SURVIVAL_RAMPS[name] }, customRamp: false })}
          >
            <span aria-hidden="true">{SURVIVAL_RAMP_ICONS[name]}</span>
            {t(`survival.ramp.${name}`)}
          </button>
        ))}
      </div>
      {activeRamp === 'custom' ? (
        <div className="survival-ramp-steps">
          {SURVIVAL_RAMP_TIERS.map((tier) => (
            <div key={tier} className="survival-ramp-step">
              <span style={{ color: DIFFICULTY_COLORS[tier] }}>{t(`difficulties.${tier}`)}</span>
              <div className="survival-stepper">
                <button type="button" aria-label="−" onClick={() => step(tier, -1)} disabled={ramp[tier] <= 0}>−</button>
                <strong>{ramp[tier]}</strong>
                <button type="button" aria-label="+" onClick={() => step(tier, 1)} disabled={ramp[tier] >= SURVIVAL_RAMP_MAX}>+</button>
              </div>
            </div>
          ))}
          <p className="survival-options-hint">{t('survival.ramp_custom_hint')}</p>
        </div>
      ) : (
        <p className="survival-options-hint">
          {t('survival.ramp_summary', { facile: ramp.Facile, moyen: ramp.Moyen, difficile: ramp.Difficile })}
        </p>
      )}
    </div>
  )
}
