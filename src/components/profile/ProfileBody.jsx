// Player profile sections computed from the game history: stats, daily streak, achievements, history, per game.
import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayerProfile } from '../../hooks/usePlayerProfile'
import { TIER_COLORS } from '../../utils/achievements'
import { badgeSummary, readBadges } from '../../utils/badges'
import { decorationStyle } from '../../utils/decorations'
import { GAME_TYPES } from '../../utils/gameTypes'
import { describeBest, describeDetails, describeMode, describeResult, formatPlayedAt } from '../../utils/profileFormat'
import { dailyTypesOn, dayKey, formatPlayTime } from '../../utils/profileStats'
import BadgeStrip from './BadgeStrip'
import './ProfileBody.css'

export const GAME_META = {
  [GAME_TYPES.DAILY_CHALLENGE]: { emoji: '🎯', titleKey: 'games.daily_challenge.title', color: '#FF9F45' },
  [GAME_TYPES.PLACEMENT]: { emoji: '🌍', titleKey: 'games.placement.title', color: '#7AA2FF' },
  [GAME_TYPES.FLAGS]: { emoji: '🚩', titleKey: 'games.flags.title', color: '#FF7A6B' },
  [GAME_TYPES.CAPITALS]: { emoji: '🏛️', titleKey: 'games.capitals.title', color: '#F5B83D' },
  [GAME_TYPES.BORDER_GUESS]: { emoji: '🧭', titleKey: 'games.border_guess.title', color: '#C792FF' },
  [GAME_TYPES.COUNTRY_CLUE]: { emoji: '🔎', titleKey: 'games.country_clue.title', color: '#3DDC97' },
  [GAME_TYPES.VOYAGE_VOYAGE]: { emoji: '✈️', titleKey: 'games.voyage_voyage.title', color: '#5FD4F4' },
  [GAME_TYPES.RANKING]: { emoji: '🏆', titleKey: 'games.ranking.title', color: '#FF9EC7' },
  [GAME_TYPES.QUIZ]: { emoji: '🧠', titleKey: 'games.quiz.title', color: '#B4E05A' },
  [GAME_TYPES.SURVIVAL]: { emoji: '❤️', titleKey: 'games.survival.title', color: '#FF5C7A' },
}

const AVATAR_COLORS = ['#3DDC97', '#7AA2FF', '#FF7A6B', '#F5B83D', '#C792FF', '#5FD4F4', '#FF9EC7', '#B4E05A']

// `decoration` ({ frame, color } ids): draws the frame as a ring inside the avatar's box, so the size never changes.
export function Avatar({ username, size = 44, decoration }) {
  let hash = 0
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) | 0
  const frame = decorationStyle(decoration).frame
  const ring = frame && {
    boxSizing: 'border-box',
    border: `${frame.style === 'double' ? 5 : 3}px ${frame.style} ${frame.color}`,
    padding: 2,
    backgroundClip: 'content-box',
  }
  return (
    <span
      className="profile-avatar"
      style={{ width: size, height: size, fontSize: size * 0.45, background: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length], ...ring }}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  )
}

// One chip per daily challenge: colored when done, with a ✓ / ✗ badge.
// With `onSelect`, a done chip opens what the player did in that challenge.
export function DailyChips({ today, small = false, onSelect }) {
  const { t } = useTranslation()
  return (
    <div className={`profile-daily-chips${small ? ' profile-daily-chips--small' : ''}`}>
      {dailyTypesOn(dayKey()).map((type) => {
        const meta = GAME_META[type]
        const result = today[type]
        const props = {
          title: t(meta.titleKey),
          className: `profile-daily-chip${result ? ' done' : ''}${result && onSelect ? ' clickable' : ''}`,
          style: result ? { borderColor: meta.color, background: `${meta.color}26` } : undefined,
        }
        const content = (
          <>
            {meta.emoji}
            {result && <i className={result.solved === false ? 'failed' : ''}>{result.solved === false ? '✗' : '✓'}</i>}
          </>
        )
        return result && onSelect ? (
          <button key={type} type="button" {...props} onClick={() => onSelect(type)}>{content}</button>
        ) : (
          <span key={type} {...props}>{content}</span>
        )
      })}
    </div>
  )
}

function StatTiles({ stats }) {
  const { t } = useTranslation()
  const tiles = [
    ['🎮', stats.total, t('profile.games')],
    ['⏱️', formatPlayTime(stats.totalTime), t('profile.play_time')],
    ['🌍', stats.countriesFound, t('profile.countries')],
    ['📅', stats.daysPlayed, t('profile.days')],
  ]
  return (
    <div className="profile-tiles">
      {tiles.map(([emoji, value, label]) => (
        <div key={label} className="profile-tile">
          <span className="profile-tile-emoji">{emoji}</span>
          <strong>{value}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  )
}

function StreakCard({ stats }) {
  const { t } = useTranslation()
  const todayTypes = dailyTypesOn(dayKey())
  const doneToday = todayTypes.filter((type) => stats.todayDaily[type]).length
  const alive = stats.streak.current > 0
  const [selected, setSelected] = useState(null)
  return (
    <div className="profile-card profile-streak">
      <div className="profile-streak-main">
        <span className={`profile-flame${alive ? ' alive' : ''}`}>🔥</span>
        <div className="profile-streak-text">
          <small className="profile-label">{t('profile.streak_title')}</small>
          <strong className={alive ? 'alive' : ''}>{t('profile.days_count', { count: stats.streak.current })}</strong>
        </div>
        <div className="profile-streak-best">
          <small>{t('profile.streak_best')}</small>
          <strong>{stats.streak.best}</strong>
        </div>
      </div>
      <div className="profile-streak-today">
        <div className="profile-row-between">
          <small>{t('profile.today_title')}</small>
          <small>{t('profile.today_done', { done: doneToday, total: todayTypes.length })}</small>
        </div>
        <DailyChips today={stats.todayDaily} onSelect={setSelected} />
      </div>
      {selected && stats.todayDaily[selected] && (
        <GameDetail game={stats.todayDaily[selected]} meta={GAME_META[selected]} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function Achievements({ achievements }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const unlocked = achievements.filter((item) => item.unlocked).length
  const visible = expanded ? achievements : achievements.slice(0, 8)
  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <h2>
          {t('profile.achievements_title')}
          <BadgeStrip badges={readBadges({ badges: badgeSummary(achievements) })} />
        </h2>
        <span className="profile-muted">{t('profile.achievements_count', { unlocked, total: achievements.length })}</span>
      </div>
      <div className="profile-achievements">
        {visible.map((achievement) => (
          <div
            key={achievement.id}
            className={`profile-achievement${achievement.unlocked ? ' unlocked' : ''}`}
            style={{ '--tier': TIER_COLORS[achievement.tier] }}
          >
            <span className="profile-achievement-emoji">{achievement.emoji}</span>
            <strong>{t(`achievements.${achievement.id}.title`)}</strong>
            <small>{t(`achievements.${achievement.id}.desc`)}</small>
            <em className="profile-achievement-tier">{t(`achievements.tiers.${achievement.tier}`)}</em>
            {!achievement.unlocked && achievement.target > 1 && (
              <div className="profile-progress" title={`${achievement.progress}/${achievement.target}`}>
                <span style={{ width: `${(achievement.progress / achievement.target) * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      {achievements.length > 8 && (
        <button type="button" className="profile-link" onClick={() => setExpanded((value) => !value)}>
          {expanded ? t('profile.show_less') : t('profile.history_all')}
        </button>
      )}
    </section>
  )
}

function GameRow({ game }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const meta = GAME_META[game.gameType]
  if (!meta) return null
  return (
    <li>
      <button type="button" className="profile-game-row profile-game-row--button" onClick={() => setOpen(true)}>
        <span className="profile-game-icon" style={{ background: `${meta.color}1F` }}>{meta.emoji}</span>
        <div className="profile-game-main">
          <strong>{t(meta.titleKey)}</strong>
          <small>{describeMode(game, t)}</small>
        </div>
        <div className="profile-game-result">
          <strong className={game.solved === false ? 'failed' : ''}>{describeResult(game, t)}</strong>
          <small>{formatPlayedAt(game.playedAt, i18n.language)}</small>
        </div>
        <span className="profile-game-chevron" aria-hidden="true">›</span>
      </button>
      {open && <GameDetail game={game} meta={meta} onClose={() => setOpen(false)} />}
    </li>
  )
}

// Everything recorded for one game of the history, in a dialog.
function GameDetail({ game, meta, onClose }) {
  const { t, i18n } = useTranslation()
  const titleId = useId()

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="profile-detail-backdrop" onClick={onClose}>
      <div className="profile-detail" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <div className="profile-detail-header">
          <span className="profile-game-icon" style={{ background: `${meta.color}1F` }}>{meta.emoji}</span>
          <div className="profile-game-main">
            <strong id={titleId}>{t(meta.titleKey)}</strong>
            <small>{describeMode(game, t)}</small>
          </div>
          <button type="button" className="profile-detail-close" onClick={onClose} aria-label={t('profile.details.close')}>
            ✕
          </button>
        </div>
        <dl className="profile-detail-rows">
          {describeDetails(game, t, i18n.language).map((row) => (
            <div key={row.key}>
              <dt>{row.label}</dt>
              <dd className={row.failed ? 'failed' : ''}>{row.value}</dd>
            </div>
          ))}
        </dl>
        {game.mode === 'multi' && game.roomCode && (
          <Link to={`/multiplayer/room/${game.roomCode}`} className="profile-detail-action" style={{ borderColor: meta.color, color: meta.color }}>
            {t('profile.details.open_room')}
          </Link>
        )}
      </div>
    </div>,
    document.body
  )
}

function History({ games }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState(null)
  const types = [...new Set(games.map((game) => game.gameType))]
  const filtered = filter ? games.filter((game) => game.gameType === filter) : games
  const visible = expanded ? filtered : filtered.slice(0, 8)

  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <h2>{t(expanded ? 'profile.history_full_title' : 'profile.history_title')}</h2>
        {games.length > 8 && (
          <button type="button" className="profile-link" onClick={() => setExpanded((value) => !value)}>
            {expanded ? t('profile.show_less') : t('profile.history_all')}
          </button>
        )}
      </div>
      {expanded && types.length > 1 && (
        <div className="profile-filters">
          <button type="button" className={!filter ? 'active' : ''} onClick={() => setFilter(null)}>
            {t('profile.all_games')}
          </button>
          {types.map((type) => (
            <button key={type} type="button" className={filter === type ? 'active' : ''} onClick={() => setFilter(filter === type ? null : type)}>
              {GAME_META[type]?.emoji} {t(GAME_META[type]?.titleKey ?? type)}
            </button>
          ))}
        </div>
      )}
      {games.length === 0 ? (
        <p className="profile-muted">{t('profile.history_empty')}</p>
      ) : (
        <ul className="profile-list profile-history">
          {visible.map((game) => (
            <GameRow key={game.id} game={game} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ByGame({ stats }) {
  const { t } = useTranslation()
  const entries = Object.entries(stats.byGame).sort((a, b) => b[1].played - a[1].played)
  if (entries.length === 0) return null
  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <h2>{t('profile.by_game_title')}</h2>
      </div>
      <ul className="profile-list">
        {entries.map(([type, gameStats]) => {
          const meta = GAME_META[type]
          if (!meta) return null
          const best = describeBest(gameStats, t, type)
          return (
            <li key={type} className="profile-game-row">
              <span className="profile-game-icon" style={{ background: `${meta.color}1F` }}>{meta.emoji}</span>
              <div className="profile-game-main">
                <strong>{t(meta.titleKey)}</strong>
                <small>
                  {[
                    t('profile.games_count', { count: gameStats.played }),
                    gameStats.dailies > 0 ? t('profile.wins', { wins: gameStats.wins, dailies: gameStats.dailies }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </div>
              {best && <strong className="profile-game-best" style={{ color: meta.color }}>{best}</strong>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function ProfileBody({ uid, friendsCount, own = false }) {
  const { t } = useTranslation()
  const { loading, error, games, stats, achievements } = usePlayerProfile(uid, { friendsCount, own })

  if (loading) return <p className="profile-muted profile-center">…</p>
  if (error) return <p className="profile-muted">{t('profile.load_error')}</p>
  return <ProfileView games={games} stats={stats} achievements={achievements} />
}

// The sections themselves, from already loaded data.
export function ProfileView({ games, stats, achievements }) {
  return (
    <div className="profile-body">
      <StatTiles stats={stats} />
      <StreakCard stats={stats} />
      <Achievements achievements={achievements} />
      <History games={games} />
      <ByGame stats={stats} />
    </div>
  )
}

export function PlayerLink({ uid, children, className }) {
  return (
    <Link to={`/player/${uid}`} className={className}>
      {children}
    </Link>
  )
}
