// Player profile sections computed from the game history: stats, daily streak, achievements, history, per game.
import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDecoration } from '../../hooks/useDecoration'
import { useBadges } from '../../hooks/useBadges'
import { usePlayerProfile } from '../../hooks/usePlayerProfile'
import { TIER_COLORS } from '../../utils/achievements'
import { badgeSummary, readBadges } from '../../utils/badges'
import { UNCROPPED_FLAGS, decorationStyle, flagImagePath } from '../../utils/decorations'
import { GAME_TYPES } from '../../utils/gameTypes'
import { getCountryName } from '../../utils/getCountryName'
import GameEmblem from '../GameEmblem'
import { describeBest, describeDetails, describeMode, describeResult, formatPlayedAt } from '../../utils/profileFormat'
import { dailyTypesOn, dayKey, formatPlayTime } from '../../utils/profileStats'
import CollapsibleSection from '../CollapsibleSection'
import BadgeStrip from './BadgeStrip'
import EloSection from './EloSection'
import RecordsSection from './RecordsSection'
import './ProfileBody.css'

export const GAME_META = {
  [GAME_TYPES.DAILY_CHALLENGE]: { titleKey: 'games.daily_challenge.title', color: 'var(--game-daily-challenge)', ink: 'var(--game-daily-challenge-ink)' },
  [GAME_TYPES.COUNTRY_OF_DAY]: { titleKey: 'games.country_of_day.title', color: 'var(--game-country-of-day)', ink: 'var(--game-country-of-day-ink)' },
  [GAME_TYPES.PLACEMENT]: { titleKey: 'games.placement.title', color: 'var(--game-placement)', ink: 'var(--game-placement-ink)' },
  [GAME_TYPES.FLAGS]: { titleKey: 'games.flags.title', color: 'var(--game-flags)', ink: 'var(--game-flags-ink)' },
  [GAME_TYPES.MISSING_FLAG]: { titleKey: 'games.missing_flag.title', color: 'var(--game-border-guess)', ink: 'var(--game-border-guess-ink)' },
  [GAME_TYPES.CAPITALS]: { titleKey: 'games.capitals.title', color: 'var(--game-capitals)', ink: 'var(--game-capitals-ink)' },
  [GAME_TYPES.BORDER_GUESS]: { titleKey: 'games.border_guess.title', color: 'var(--game-border-guess)', ink: 'var(--game-border-guess-ink)' },
  [GAME_TYPES.COUNTRY_CLUE]: { titleKey: 'games.country_clue.title', color: 'var(--game-country-clue)', ink: 'var(--game-country-clue-ink)' },
  [GAME_TYPES.VOYAGE_VOYAGE]: { titleKey: 'games.voyage_voyage.title', color: 'var(--game-voyage-voyage)', ink: 'var(--game-voyage-voyage-ink)' },
  [GAME_TYPES.RANKING]: { titleKey: 'games.ranking.title', color: 'var(--game-ranking)', ink: 'var(--game-ranking-ink)' },
  [GAME_TYPES.QUIZ]: { titleKey: 'games.quiz.title', color: 'var(--game-quiz)', ink: 'var(--game-quiz-ink)' },
  [GAME_TYPES.SURVIVAL]: { titleKey: 'games.survival.title', color: 'var(--game-survival)', ink: 'var(--game-survival-ink)' },
}

const AVATAR_COLORS = ['country-clue', 'placement', 'flags', 'capitals', 'border-guess', 'voyage-voyage', 'ranking', 'quiz'].map((id) => `var(--game-${id})`)

// The flag worn as a profile picture: fills the circle, or shows whole on a neutral background when it can't be cropped.
// Goes back to the initial when the image fails to load.
function AvatarFlag({ iso, fallback }) {
  const { t, i18n } = useTranslation()
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [iso])
  if (failed) return fallback
  const country = getCountryName(iso, i18n.language) ?? iso
  return (
    <img
      className={`profile-avatar__flag${UNCROPPED_FLAGS.has(iso) ? ' profile-avatar__flag--whole' : ''}`}
      src={flagImagePath(iso)}
      alt=""
      title={t('decorations.flag_alt', { country })}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

// `decoration` ({ frame, color, flag }): draws the frame as a ring inside the avatar's box, so the size never changes.
// With a flag, the flag replaces the initial.
export function Avatar({ username, size = 44, decoration }) {
  let hash = 0
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) | 0
  const { frame, flag } = decorationStyle(decoration)
  const ring = frame && {
    boxSizing: 'border-box',
    border: `${frame.style === 'double' ? 5 : 3}px ${frame.style} ${frame.color}`,
    padding: 2,
    backgroundClip: 'content-box',
  }
  const initial = username.charAt(0).toUpperCase()
  return (
    <span
      className={`profile-avatar${flag ? ' profile-avatar--flag' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.45, background: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length], ...ring }}
    >
      {flag ? <AvatarFlag iso={flag} fallback={initial} /> : initial}
    </span>
  )
}

// Avatar of an account whose decoration (frame, flag) is not at hand: reads it (cached per account, see useDecoration).
export function UserAvatar({ uid, ...props }) {
  return <Avatar {...props} decoration={useDecoration(uid)} />
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
          style: result ? { borderColor: meta.color, background: `color-mix(in srgb, ${meta.color} 15%, transparent)` } : undefined,
        }
        const content = (
          <>
            <GameEmblem game={type} variant="glyph" size={20} />
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

function Achievements({ achievements, scope, uid }) {
  const { t } = useTranslation()
  const wins = useBadges([uid])[uid]?.wins ?? 0
  const [expanded, setExpanded] = useState(false)
  const unlocked = achievements.filter((item) => item.unlocked).length
  const visible = expanded ? achievements : achievements.slice(0, 8)
  const summary = (
    <>
      <span>{t('profile.achievements_count', { unlocked, total: achievements.length })}</span>
      <BadgeStrip badges={{ ...readBadges({ badges: badgeSummary(achievements) }), wins }} />
    </>
  )
  return (
    <CollapsibleSection id={`${scope}.achievements`} title={t('profile.achievements_title')} summary={summary} defaultOpen={scope === 'player'}>
      {wins > 0 && <p className="profile-muted">🏆 {t('league.champion_wins', { count: wins })}</p>}
      <div className="profile-achievements">
        {visible.map((achievement, index) => (
          <div
            key={achievement.id}
            className={`profile-achievement${achievement.unlocked ? ' unlocked' : ''}`}
            style={{ '--tier': TIER_COLORS[achievement.tier], '--sd-stamp-rotate': `${[-7, 5, -3, 8][index % 4]}deg`, '--i': index % 8 }}
          >
            <span className={`profile-achievement-emoji${achievement.unlocked ? ' sd-stamp' : ''}`}>{achievement.emoji}</span>
            <strong>{t(`achievements.${achievement.id}.title`)}</strong>
            <small>{t(`achievements.${achievement.id}.desc`)}</small>
            <em className="profile-achievement-tier gg-mono">{t(`achievements.tiers.${achievement.tier}`)}</em>
            {!achievement.unlocked && achievement.target > 1 && (
              <>
                <div className="profile-progress" title={`${achievement.progress}/${achievement.target}`}>
                  <span style={{ width: `${(achievement.progress / achievement.target) * 100}%` }} />
                </div>
                <span className="profile-progress-count">{Math.min(achievement.progress, achievement.target)} / {achievement.target}</span>
              </>
            )}
          </div>
        ))}
      </div>
      {achievements.length > 8 && (
        <button type="button" className="profile-link" onClick={() => setExpanded((value) => !value)}>
          {expanded ? t('profile.show_less') : t('profile.history_all')}
        </button>
      )}
    </CollapsibleSection>
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
        <GameEmblem game={game.gameType} size={38} />
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
          <GameEmblem game={game.gameType} size={38} />
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
          <Link to={`/multiplayer/room/${game.roomCode}`} className="profile-detail-action" style={{ borderColor: meta.color, color: meta.ink }}>
            {t('profile.details.open_room')}
          </Link>
        )}
      </div>
    </div>,
    document.body
  )
}

function History({ games, scope }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState(null)
  const types = [...new Set(games.map((game) => game.gameType))]
  const filtered = filter ? games.filter((game) => game.gameType === filter) : games
  const visible = expanded ? filtered : filtered.slice(0, 8)

  return (
    <CollapsibleSection
      id={`${scope}.history`}
      title={t(expanded ? 'profile.history_full_title' : 'profile.history_title')}
      summary={games.length > 0 ? describeResult(games[0], t) : null}
    >
      {games.length > 8 && (
        <button type="button" className="profile-link" onClick={() => setExpanded((value) => !value)}>
          {expanded ? t('profile.show_less') : t('profile.history_all')}
        </button>
      )}
      {expanded && types.length > 1 && (
        <div className="profile-filters">
          <button type="button" className={!filter ? 'active' : ''} onClick={() => setFilter(null)}>
            {t('profile.all_games')}
          </button>
          {types.map((type) => (
            <button key={type} type="button" className={filter === type ? 'active' : ''} onClick={() => setFilter(filter === type ? null : type)}>
              <GameEmblem game={type} variant="glyph" size={16} /> {t(GAME_META[type]?.titleKey ?? type)}
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
    </CollapsibleSection>
  )
}

function ByGame({ stats, scope }) {
  const { t } = useTranslation()
  const entries = Object.entries(stats.byGame).sort((a, b) => b[1].played - a[1].played)
  if (entries.length === 0) return null
  const top = GAME_META[entries[0][0]]
  const summary = top && `${t(top.titleKey)} · ${t('profile.games_count', { count: entries[0][1].played })}`
  return (
    <CollapsibleSection id={`${scope}.by_game`} title={t('profile.by_game_title')} summary={summary}>
      <ul className="profile-list">
        {entries.map(([type, gameStats]) => {
          const meta = GAME_META[type]
          if (!meta) return null
          const best = describeBest(gameStats, t, type)
          return (
            <li key={type} className="profile-game-row">
              <GameEmblem game={type} size={38} />
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
              {best && <strong className="profile-game-best" style={{ color: meta.ink }}>{best}</strong>}
            </li>
          )
        })}
      </ul>
    </CollapsibleSection>
  )
}

// `header` (identity page and what goes with it) and `aside` (e.g. the account settings) are placed by the layout:
// wide screens put `header`, stats, streak, achievements and history on the left, `friends`, `collection` and `aside` on the right.
export default function ProfileBody({ uid, friendsCount, own = false, friends, collection, header, aside }) {
  const { t } = useTranslation()
  const { loading, error, games, stats, achievements } = usePlayerProfile(uid, { friendsCount, own })

  if (loading || error) {
    return (
      <div className="profile-body">
        <div className="profile-zone profile-zone--head">
          {header}
          {loading ? <p className="profile-muted profile-center">…</p> : <p className="profile-muted">{t('profile.load_error')}</p>}
        </div>
        {!loading && (
          <div className="profile-zone profile-zone--side">
            {friends}
            {collection}
            {aside}
          </div>
        )}
      </div>
    )
  }
  return <ProfileView games={games} stats={stats} achievements={achievements} uid={uid} own={own} friends={friends} collection={collection} header={header} aside={aside} />
}

// The sections themselves, from already loaded data (the Elo ratings load on their own, for `uid`).
// `friends` and `collection` (nodes) are shown, in that order, right after the streak. `own` picks which sections start folded.
export function ProfileView({ games, stats, achievements, uid, own = false, friends, collection, header, aside }) {
  const scope = own ? 'own' : 'player'
  return (
    <div className="profile-body">
      <div className="profile-zone profile-zone--head">
        {header}
        <StatTiles stats={stats} />
        <StreakCard stats={stats} />
      </div>
      <div className="profile-zone profile-zone--side">
        {friends}
        {collection}
        {aside}
      </div>
      <div className="profile-zone profile-zone--rest">
        {uid && <RecordsSection uid={uid} scope={scope} />}
        <Achievements achievements={achievements} scope={scope} uid={uid} />
        {uid && <EloSection uid={uid} scope={scope} />}
        <History games={games} scope={scope} />
        <ByGame stats={stats} scope={scope} />
      </div>
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
