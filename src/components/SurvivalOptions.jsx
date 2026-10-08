// Survival settings: the games of the rounds and the number of lives.
// Used by the home page card and by the multiplayer room editor.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SURVIVAL_LIVES, SURVIVAL_ROUND_TYPES } from '../utils/survivalConfig'
import './SurvivalOptions.css'

export const SURVIVAL_ROUND_ICONS = {
  PLACEMENT: '🌍',
  FLAGS: '🚩',
  CAPITALS: '🏛️',
  BORDER_GUESS: '🧭',
  COUNTRY_CLUE: '🔎',
  QUIZ: '🧠',
}

// `onChange` is a state setter: it gets an updater of { modes, lives }.
export default function SurvivalOptions({ modes, lives, onChange }) {
  const { t } = useTranslation()
  const toggle = (type) => onChange((previous) => ({
    ...previous,
    modes: SURVIVAL_ROUND_TYPES.filter((m) => (m === type) !== previous.modes.includes(m)),
  }))

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
            onClick={() => onChange((previous) => ({ ...previous, lives: count }))}
          >
            {count} ❤️
          </button>
        ))}
      </div>
    </div>
  )
}
