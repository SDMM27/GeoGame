// Elo ratings of the current season: duels, then each solo mode.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerElo } from '../../hooks/usePlayerElo'
import { formatSeason } from '../../utils/elo'
import { GAME_TYPES } from '../../utils/gameTypes'

const ELO_META = {
  duel: { emoji: '⚔️', titleKey: 'elo.duel', color: '#7AA2FF' },
  [GAME_TYPES.PLACEMENT]: { emoji: '🌍', titleKey: 'games.placement.title', color: '#7AA2FF' },
  [GAME_TYPES.FLAGS]: { emoji: '🚩', titleKey: 'games.flags.title', color: '#FF7A6B' },
  [GAME_TYPES.MISSING_FLAG]: { emoji: '🧩', titleKey: 'games.missing_flag.title', color: '#C792FF' },
  [GAME_TYPES.CAPITALS]: { emoji: '🏛️', titleKey: 'games.capitals.title', color: '#F5B83D' },
  [GAME_TYPES.BORDER_GUESS]: { emoji: '🧭', titleKey: 'games.border_guess.title', color: '#C792FF' },
  [GAME_TYPES.SURVIVAL]: { emoji: '❤️', titleKey: 'games.survival.title', color: '#FF5C7A' },
}

export default function EloSection({ uid }) {
  const { t } = useTranslation()
  const { loading, error, season, entries } = usePlayerElo(uid)
  if (loading || error) return null
  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <h2>{t('elo.profile_title')}</h2>
        <span className="profile-muted">{formatSeason(season, t)}</span>
      </div>
      <ul className="profile-list">
        {entries.map((entry) => {
          const meta = ELO_META[entry.key]
          let detail = t('elo.unplayed')
          if (entry.played) {
            detail = entry.key === 'duel' ? t('elo.duel_detail', { games: entry.games, wins: entry.wins }) : t('elo.found_count', { count: entry.found })
          }
          return (
            <li key={entry.key} className="profile-game-row">
              <span className="profile-game-icon" style={{ background: `${meta.color}1F` }}>{meta.emoji}</span>
              <div className="profile-game-main">
                <strong>{t(meta.titleKey)}</strong>
                <small>{detail}</small>
              </div>
              <strong className="profile-game-best" style={{ color: meta.color }}>{entry.rating}</strong>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
