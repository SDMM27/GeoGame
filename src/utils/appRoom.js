// src/utils/appRoom.js
// Rooms created in the mobile app (`source: 'app'`): one game per room, played by the app and the website.
// 'live': everyone starts together after the host launches it. 'challenge': everyone plays whenever they want.
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import countries from '../data/countriesWithDifficulty_FR.json'
import { GAME_TYPES } from './gameTypes'
import {
  getSeededAscensionOverrides,
  getSeededBorderGuessCountries,
  getSeededCapitalCountries,
  getSeededCountryClueCountries,
  getSeededFlagCountries,
  getSeededPlacementCountries,
} from './multiplayerSeed'
import { rankResults } from './multiplayerScoring'
import { seededShuffle } from './prng'

export const isAppRoom = (room) => room?.source === 'app'

const SETUP_TYPES = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]

// Same pools as the solo continent mode of each game
function continentPool(type, continent) {
  const features = countries.features.filter((c) => c.properties.continent === continent)
  if (type === GAME_TYPES.PLACEMENT) return features.map((c) => c.properties.ADMIN)
  if (type === GAME_TYPES.CAPITALS) return features.filter((c) => c.properties.ISO_A2 && c.properties.capital)
  return features.filter((c) => c.properties.ISO_A2)
}

/**
 * What every player of a room gets: the same countries in the same order, drawn from the room's seed.
 * `list`: Placement / Flags / Capitals (standard or continent), Border Guess, Country Clue.
 * `byDifficulty`: Ascension. Quiz: neither, the questions are drawn by useQuizState from the seed.
 */
export function getAppRoomContent(game, seed) {
  if (SETUP_TYPES.includes(game.type)) {
    if (game.phases) {
      const byDifficulty = getSeededAscensionOverrides(game.phases, game.type, seed, 0)
      const total = Object.values(byDifficulty).reduce((sum, list) => sum + list.length, 0)
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
  return { list: null, byDifficulty: null, total: game.count ?? 10 }
}

// Border Guess / Country Clue rank on countries found, then attempts, then time; the others on score, then time.
export function appRoomScoringMode(game) {
  return game.type === GAME_TYPES.BORDER_GUESS || game.type === GAME_TYPES.COUNTRY_CLUE ? 'solved' : 'weighted'
}

export function rankAppRoomResults(game, results) {
  return rankResults(results, results.length, appRoomScoringMode(game))
}

// ─── Firestore (same documents as the app's mobile/src/multiplayer/room.ts) ──

const appRoomRef = (code) => doc(firestore, 'rooms', code)

export async function joinAppRoom(code, playerId, pseudo, uid) {
  await updateDoc(appRoomRef(code), { [`players.${playerId}`]: uid ? { pseudo, uid } : { pseudo } })
}

/** `progress`: { found, total, finished } */
export async function reportAppProgress(code, playerId, progress) {
  await setDoc(doc(firestore, 'rooms', code, 'progress', playerId), { ...progress, lastSeen: serverTimestamp() }, { merge: true })
}

/** `result`: { weightedScore, countriesSolved, attempts, elapsedTime, total } */
export async function submitAppResult(code, playerId, pseudo, result) {
  await setDoc(doc(firestore, 'rooms', code, 'gameResults', `0_${playerId}`), {
    playerId,
    pseudo,
    gameIndex: 0,
    ...result,
    finishedAt: serverTimestamp(),
  })
}
