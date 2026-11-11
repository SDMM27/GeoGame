// A row of games to filter a leaderboard by, each with its emblem (replaces a <select> of game names). `games`:
// [{ id, labelKey }]; `allValue` adds a « all games » choice.
import React from 'react'
import { useTranslation } from 'react-i18next'
import GameEmblem from './GameEmblem'
import './GamePicker.css'

export default function GamePicker({ games, value, onChange, allValue = null }) {
  const { t } = useTranslation()
  return (
    <div className="game-picker" role="group" aria-label={t('labels.game')}>
      {games.map((game) => (
        <button
          key={game.id}
          type="button"
          className={`game-picker-option${value === game.id ? ' game-picker-option--active' : ''}`}
          aria-pressed={value === game.id}
          onClick={() => onChange(game.id)}
        >
          <GameEmblem game={game.id} size={28} />
          {t(game.labelKey)}
        </button>
      ))}
      {allValue && (
        <button
          type="button"
          className={`game-picker-option${value === allValue ? ' game-picker-option--active' : ''}`}
          aria-pressed={value === allValue}
          onClick={() => onChange(allValue)}
        >
          <svg className="game-picker-all" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M4 12h16M12 4c2.5 2.3 3.5 5 3.5 8s-1 5.7-3.5 8M12 4c-2.5 2.3-3.5 5-3.5 8s1 5.7 3.5 8" />
          </svg>
          {t('options.all_games')}
        </button>
      )}
    </div>
  )
}
