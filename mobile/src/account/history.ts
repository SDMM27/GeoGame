// Saving finished games to the signed-in player's history (see ../../src/utils/gameHistory.js).
import { useRecordGameWith } from '@shared/hooks/useRecordGame'
import { setupGameRecord as sharedSetupGameRecord } from '@shared/utils/gameHistory'

import { auth } from './auth'

export type GameRecord = {
  gameType: string
  mode: 'standard' | 'ascension' | 'daily' | 'infinite' | 'multi' | 'survival'
  score?: number | null
  attempts?: number | null
  solved?: boolean
  found?: number
  total?: number
  elapsedTime?: number | null
  difficulty?: string | null
  continent?: string | null
  presetName?: string | null
  dailyKey?: string | null
  roomCode?: string | null
  [extra: string]: unknown
}

export const useRecordGame = (record: GameRecord | null | undefined) => useRecordGameWith(auth, record ?? null)

// Placement, Flags and Capitals: classic, Ascension or multiplayer game (nothing for training).
export const setupGameRecord: (game: {
  gameType: string
  isTraining: boolean
  roomCode?: string | null
  isAscension: boolean
  presetName?: string | null
  difficulty: string | null
  continent: string | null
  score: number
  stats: { found: number; total: number }
  timer: number
}) => GameRecord | null = sharedSetupGameRecord
