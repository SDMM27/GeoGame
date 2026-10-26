import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { GAME_TYPES } from './gameTypes'
import { CONTINENT_NAMES, DIFFICULTIES } from './leaderboards'
import { PERFECT_SCORES } from './perfectScores'

// A player's all-time best solo scores, as a grid of games x difficulties (or continents) with the perfect ones marked.

export const RECORD_GAMES = [GAME_TYPES.PLACEMENT, GAME_TYPES.HARDCORE, GAME_TYPES.FLAGS, GAME_TYPES.MISSING_FLAG, GAME_TYPES.CAPITALS]

// The player's best solo scores by "GAME_difficulty" (the difficulty is the continent name by continent): { score, elapsedTime }.
export async function fetchPlayerRecords(uid) {
  const snapshot = await getDocs(query(collection(firestore, 'scores'), where('uid', '==', uid)))
  const records = {}
  for (const document of snapshot.docs) {
    const { gameType, difficulty, score, elapsedTime } = document.data()
    if (!RECORD_GAMES.includes(gameType) || typeof score !== 'number') continue
    const key = `${gameType}_${difficulty}`
    const previous = records[key]
    const better = !previous || score > previous.score || (score === previous.score && (elapsedTime ?? Infinity) < (previous.elapsedTime ?? Infinity))
    if (better) records[key] = { score, elapsedTime: elapsedTime ?? null }
  }
  return records
}

function recordCell(records, game, mode) {
  const key = `${game}_${mode}`
  const perfect = PERFECT_SCORES[key]
  const score = records[key]?.score ?? null
  return {
    key,
    mode,
    score,
    perfect,
    // At least the perfect score: a score saved before a country or a scoring change still counts
    isPerfect: score != null && perfect > 0 && score >= perfect,
    ratio: score == null || !perfect ? 0 : Math.min(1, score / perfect),
  }
}

// The table of the profile: one row per game with a cell per difficulty and per continent, and how many of
// all the cells hold the perfect score.
export function buildRecordsGrid(records = {}) {
  const rows = RECORD_GAMES.map((game) => ({
    game,
    difficulties: DIFFICULTIES.map((mode) => recordCell(records, game, mode)),
    continents: CONTINENT_NAMES.map((mode) => recordCell(records, game, mode)),
  }))
  const cells = rows.flatMap((row) => [...row.difficulties, ...row.continents])
  return { rows, perfectCount: cells.filter((cell) => cell.isPerfect).length, total: cells.length }
}
