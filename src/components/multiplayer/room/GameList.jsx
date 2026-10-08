import React from 'react'
import { useTranslation } from 'react-i18next'
import { currentGameIndex, roomGames } from '../../../utils/multiplayerRoom'
import { gameLabel } from '../RoomConfig'

export default function GameList({ room, results, playerId }) {
  const { t } = useTranslation()
  const games = roomGames(room)
  const current = currentGameIndex(room)
  const played = new Set(results.filter((result) => result.playerId === playerId).map((result) => result.gameIndex ?? 0))
  return (
    <ol className="mpr-games">
      {games.map((game, i) => {
        const isCurrent = room.mode === 'live' && room.status === 'playing' && i === current
        return (
          <li key={i} className={`${isCurrent ? 'mpr-games--current' : ''}${played.has(i) ? ' mpr-games--done' : ''}`}>
            <span className="mpr-games-n">{played.has(i) ? '✓' : i + 1}</span>
            <span>{gameLabel(game, t)}</span>
          </li>
        )
      })}
    </ol>
  )
}
