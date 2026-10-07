// What every player of a room gets: the same countries in the same order, drawn from the room's seed.
import countries from '@shared/data/countriesWithDifficulty_FR.json'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import {
  getSeededAscensionOverrides,
  getSeededBorderGuessCountries,
  getSeededCapitalCountries,
  getSeededCountryClueCountries,
  getSeededFlagCountries,
  getSeededPlacementCountries,
} from '@shared/utils/multiplayerSeed'
import { rankResults } from '@shared/utils/multiplayerScoring'
import { seededShuffle } from '@shared/utils/prng'

import type { PlayerResult, RoomGame } from './room'

type Feature = { properties: Record<string, any> }

const SETUP_TYPES: string[] = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]

// Same pools as the solo continent mode of each hook
function continentPool(type: string, continent: string) {
  const features = (countries.features as Feature[]).filter((c) => c.properties.continent === continent)
  if (type === GAME_TYPES.PLACEMENT) return features.map((c) => c.properties.ADMIN as string)
  if (type === GAME_TYPES.CAPITALS) return features.filter((c) => c.properties.ISO_A2 && c.properties.capital)
  return features.filter((c) => c.properties.ISO_A2)
}

export type RoomContent = {
  // Standard Placement / Flags / Capitals, Border Guess, Country Clue
  list: any[] | null
  // Ascension: countries per difficulty
  byDifficulty: Record<string, any[]> | null
  total: number
}

export function getRoomContent(game: RoomGame, seed: number): RoomContent {
  if (SETUP_TYPES.includes(game.type)) {
    if (game.phases) {
      const byDifficulty = getSeededAscensionOverrides(game.phases, game.type, seed, 0)
      const total = Object.values(byDifficulty as Record<string, any[]>).reduce((sum, list) => sum + list.length, 0)
      return { list: null, byDifficulty, total }
    }
    const list = game.continent
      ? seededShuffle(continentPool(game.type, game.continent), seed)
      : game.type === GAME_TYPES.PLACEMENT
        ? getSeededPlacementCountries(game.difficulty, seed, 0)
        : game.type === GAME_TYPES.FLAGS
          ? getSeededFlagCountries(game.difficulty, seed, 0)
          : getSeededCapitalCountries(game.difficulty, seed, 0)
    return { list, byDifficulty: null, total: list.length }
  }
  if (game.type === GAME_TYPES.BORDER_GUESS || game.type === GAME_TYPES.COUNTRY_CLUE) {
    const pick = game.type === GAME_TYPES.BORDER_GUESS ? getSeededBorderGuessCountries : getSeededCountryClueCountries
    const list = pick(game.count ?? 10, seed, 0)
    return { list, byDifficulty: null, total: list.length }
  }
  // Quiz: the questions are drawn by useQuizState from the seed
  return { list: null, byDifficulty: null, total: game.count ?? 10 }
}

// Border Guess / Country Clue rank on countries found, then attempts, then time; the others on score, then time.
export function scoringMode(game: RoomGame): 'solved' | 'weighted' {
  return game.type === GAME_TYPES.BORDER_GUESS || game.type === GAME_TYPES.COUNTRY_CLUE ? 'solved' : 'weighted'
}

export function rankRoomResults(game: RoomGame, results: PlayerResult[]): (PlayerResult & { rank: number })[] {
  return rankResults(results, results.length, scoringMode(game))
}
