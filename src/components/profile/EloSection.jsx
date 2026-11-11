// Elo ratings of the current season: duels, then each solo mode.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerElo } from '../../hooks/usePlayerElo'
import { formatSeason } from '../../utils/elo'
import { GAME_TYPES } from '../../utils/gameTypes'
import GameEmblem from '../GameEmblem'
import CollapsibleSection from '../CollapsibleSection'

const ELO_META = {
  duel: { emoji: '⚔️', titleKey: 'elo.duel', color: 'var(--game-placement)', ink: 'var(--game-placement-ink)' },
  [GAME_TYPES.PLACEMENT]: { titleKey: 'games.placement.title', color: 'var(--game-placement)', ink: 'var(--game-placement-ink)' },
  [GAME_TYPES.HARDCORE]: { titleKey: 'games.hardcore.title', color: 'var(--game-daily-challenge)', ink: 'var(--game-daily-challenge-ink)' },
  [GAME_TYPES.FLAGS]: { titleKey: 'games.flags.title', color: 'var(--game-flags)', ink: 'var(--game-flags-ink)' },
  [GAME_TYPES.MISSING_FLAG]: { titleKey: 'games.missing_flag.title', color: 'var(--game-border-guess)', ink: 'var(--game-border-guess-ink)' },
  [GAME_TYPES.CAPITALS]: { titleKey: 'games.capitals.title', color: 'var(--game-capitals)', ink: 'var(--game-capitals-ink)' },
  [GAME_TYPES.BORDER_GUESS]: { titleKey: 'games.border_guess.title', color: 'var(--game-border-guess)', ink: 'var(--game-border-guess-ink)' },
  [GAME_TYPES.SURVIVAL]: { titleKey: 'games.survival.title', color: 'var(--game-survival)', ink: 'var(--game-survival-ink)' },
}

export default function EloSection({ uid, scope }) {
  const { t } = useTranslation()
  const { loading, error, season, entries } = usePlayerElo(uid)
  if (loading || error) return null
  const played = entries.filter((entry) => entry.played)
  const summary = played.length > 0 ? (
    <>
      <strong>{Math.max(...played.map((entry) => entry.rating))}</strong>
      <span>{formatSeason(season, t)}</span>
    </>
  ) : t('elo.unplayed')
  return (
    <CollapsibleSection id={`${scope}.elo`} title={t('elo.profile_title')} summary={summary}>
      <ul className="profile-list">
        {entries.map((entry) => {
          const meta = ELO_META[entry.key]
          if (!meta) return null
          let detail = t('elo.unplayed')
          if (entry.played) {
            detail = entry.key === 'duel' ? t('elo.duel_detail', { games: entry.games, wins: entry.wins }) : t('elo.found_count', { count: entry.found })
          }
          return (
            <li key={entry.key} className="profile-game-row">
              {meta.emoji
                ? <span className="profile-game-icon" style={{ background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}>{meta.emoji}</span>
                : <GameEmblem game={entry.key} size={38} />}
              <div className="profile-game-main">
                <strong>{t(meta.titleKey)}</strong>
                <small>{detail}</small>
              </div>
              <strong className="profile-game-best" style={{ color: meta.ink }}>{entry.rating}</strong>
            </li>
          )
        })}
      </ul>
    </CollapsibleSection>
  )
}
