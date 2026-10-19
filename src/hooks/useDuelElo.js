// src/hooks/useDuelElo.js
// Reports the finished games of a two-player room to the Elo endpoint (api/elo), which alone writes the ratings.
// Shared by the website and the app. Both players call it, the server is idempotent.
import { useEffect } from 'react'
import { reportDuel } from '../utils/eloReport'
import { resultsForGame, roomGames } from '../utils/multiplayerRoom'

/**
 * The games of the room to rate as a duel: exactly two players, both signed in (`uid`), the local player being one
 * of them, and a result from each for the game. `results`: the room's gameResults as an array.
 */
export function duelGamesToRate(room, results, playerId) {
  const players = Object.entries(room?.players ?? {})
  if (players.length !== 2 || !room.players[playerId]?.uid || !players.every(([, player]) => player.uid)) return []
  return roomGames(room).flatMap((_, index) => {
    const played = new Set(resultsForGame(results, index).map((result) => result.playerId))
    return players.every(([id]) => played.has(id)) ? [index] : []
  })
}

export default function useDuelElo(room, results, playerId) {
  const code = room?.id
  const rated = duelGamesToRate(room, results, playerId).join(',')
  useEffect(() => {
    if (!code || !rated) return
    rated.split(',').forEach((index) => reportDuel(code, Number(index)))
  }, [code, rated])
}
