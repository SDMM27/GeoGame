import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../../utils/formatTime'
import { GAME_TYPES } from '../../../utils/gameTypes'
import {
  overallStandings,
  progressForGame,
  rankRoomResults,
  resultsForGame,
  roomGames,
  roomScoringMode,
} from '../../../utils/multiplayerRoom'

const MEDALS = ['🥇', '🥈', '🥉']

function resultLine(game, result, t) {
  const time = formatTime(result.elapsedTime ?? 0).slice(0, 5)
  if (game.type === GAME_TYPES.SURVIVAL) return `${t('survival.rounds_count', { count: result.weightedScore ?? 0 })} · ${time}`
  if (roomScoringMode(game) === 'solved') {
    return `${result.countriesSolved}/${result.total} · ${t('mp_room.errors', { count: result.attempts })} · ${time}`
  }
  return `${Math.round(result.weightedScore)} ${t('units.pts')} · ${time}`
}

// A player still in the game: countries found, or rounds cleared and lives left (survival).
function liveLine(game, entry, t) {
  if (game.type === GAME_TYPES.SURVIVAL) {
    return `${t('mp_room.playing')} · ${t('survival.rounds_count', { count: entry.found ?? 0 })} · ${entry.lives ?? game.lives} ❤️`
  }
  return `${t('mp_room.playing')} · ${entry.found ?? 0}/${entry.total ?? '?'}`
}

/** Standings of game `index`: results, then the players still playing it or who did not play it yet. */
export function Standings({ room, progress, results, playerId, index }) {
  const { t } = useTranslation()
  const game = roomGames(room)[index]
  const ranked = rankRoomResults(game, resultsForGame(results, index))
  const live = progressForGame(progress, index)
  const finishedIds = new Set(ranked.map((result) => result.playerId))
  const others = Object.entries(room.players).filter(([id]) => !finishedIds.has(id))

  return (
    <ul className="mpr-list">
      {ranked.map((result, i) => (
        <li
          key={result.playerId}
          className={`mpr-row${i < 3 ? ' mpr-row--top' : ''}${result.playerId === playerId ? ' mpr-row--me' : ''}`}
        >
          <span className="mpr-rank">{MEDALS[result.rank - 1] ?? result.rank}</span>
          <span className="mpr-name">
            {result.pseudo}
            {result.playerId === playerId && ` (${t('mp_room.you')})`}
          </span>
          <span className="mpr-score">{resultLine(game, result, t)}</span>
        </li>
      ))}
      {others.map(([id, player]) => (
        <li key={id} className="mpr-row mpr-row--waiting">
          <span className="mpr-rank">{live[id] ? '⏳' : '·'}</span>
          <span className="mpr-name">
            {player.pseudo}
            {id === playerId && ` (${t('mp_room.you')})`}
          </span>
          <span className="mpr-score">
            {live[id] ? liveLine(game, live[id], t) : t('mp_room.not_played')}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Points over every game. */
function OverallStandings({ room, results, playerId }) {
  const { t } = useTranslation()
  const total = roomGames(room).length
  return (
    <ul className="mpr-list">
      {overallStandings(room, results).map((entry, i) => (
        <li
          key={entry.playerId}
          className={`mpr-row${i < 3 ? ' mpr-row--top' : ''}${entry.playerId === playerId ? ' mpr-row--me' : ''}`}
        >
          <span className="mpr-rank">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
          <span className="mpr-name">
            {entry.pseudo}
            {entry.playerId === playerId && ` (${t('mp_room.you')})`}
          </span>
          <span className="mpr-score">
            {t('mp_room.points', { count: entry.points })} · {entry.played}/{total}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Overall standings and each game's, one tab each. */
export function StandingsCard({ room, progress, results, playerId, defaultTab }) {
  const { t } = useTranslation()
  const games = roomGames(room)
  const [tab, setTab] = useState(defaultTab)
  const shown = games.length === 1 ? 0 : tab

  return (
    <div className="mpr-card">
      <h3>{t('mp_room.standings')}</h3>
      {games.length > 1 && (
        <div className="mpr-tabs">
          <button type="button" className={shown === 'overall' ? 'active' : ''} onClick={() => setTab('overall')}>
            {t('mp_room.overall')}
          </button>
          {games.map((_, i) => (
            <button key={i} type="button" className={shown === i ? 'active' : ''} onClick={() => setTab(i)}>
              {t('mp_room.game_n', { n: i + 1 })}
            </button>
          ))}
        </div>
      )}
      {shown === 'overall' ? (
        <OverallStandings room={room} results={results} playerId={playerId} />
      ) : (
        <Standings room={room} progress={progress} results={results} playerId={playerId} index={shown} />
      )}
      {Object.keys(room.players).length === 0 && <p className="mpr-muted">{t('mp_room.no_players')}</p>}
    </div>
  )
}
