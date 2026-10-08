// What every player of a room gets: the same countries in the same order, drawn from the room's seed.
// Shared with the website, which plays the same rooms.
import { getRoomContent as getSharedRoomContent, rankRoomResults as rankSharedResults, roomScoringMode } from '@shared/utils/multiplayerRoom'

import type { PlayerResult, RoomGame } from './room'

export type RoomContent = {
  // Standard Placement / Flags / Capitals, Border Guess, Country Clue
  list: any[] | null
  // Ascension: countries per difficulty
  byDifficulty: Record<string, any[]> | null
  total: number
}

export function getRoomContent(game: RoomGame, seed: number): RoomContent {
  return getSharedRoomContent(game, seed)
}

// Border Guess / Country Clue rank on countries found, then attempts, then time; the others on score, then time.
export function scoringMode(game: RoomGame): 'solved' | 'weighted' {
  return roomScoringMode(game)
}

export function rankRoomResults(game: RoomGame, results: PlayerResult[]): (PlayerResult & { rank: number })[] {
  return rankSharedResults(game, results)
}
