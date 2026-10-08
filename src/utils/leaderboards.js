// Leaderboards of the solo and Ascension scores: which Firestore queries a filter needs, and how their results
// become the ranking. Pure (no DOM, no Firestore), shared with the app; the queries run in saveScore.js.
//
// Each query is one set of equality filters plus the leaderboard order and a limit, so each one is served by a
// composite index from firestore.indexes.json. Queries never overlap (a score has one difficulty / one preset),
// so the top rows of the union are among the top rows of each query: merge, sort again, cut.

import { CONTINENTS } from './continents'

export const LEADERBOARD_SIZE = 100

export const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
export const CONTINENT_NAMES = CONTINENTS.map(({ name }) => name)

export const ALL_GAMES = 'AllGames'
export const ALL_DIFFICULTIES = 'AllScores'
export const ALL_CONTINENTS = 'AllContinents'
export const ALL_PRESETS = 'AllPresets'

// Continent scores keep the continent as their difficulty; some also have a continent field.
export const isContinentScore = (score) => score.continent != null || CONTINENT_NAMES.includes(score.difficulty)

// Best score first, then the shortest time (a score without time comes last).
export const sortScores = (scores) =>
  [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })

// Shortest time first, then the best score.
export const sortAscensionScores = (scores) =>
  [...scores].sort((a, b) => {
    const tA = a.globalTimeMs ?? Infinity
    const tB = b.globalTimeMs ?? Infinity
    if (tA !== tB) return tA - tB
    return (b.globalScore ?? 0) - (a.globalScore ?? 0)
  })

// Which scores page the filters show: the difficulties (continent scores excluded) or the continents.
// Returns the equality filters of each query: { difficulty, gameType? }.
export function soloQueries({ game = ALL_GAMES, continentMode = false, difficulty = ALL_DIFFICULTIES, continent = ALL_CONTINENTS } = {}) {
  const values = continentMode
    ? continent === ALL_CONTINENTS ? CONTINENT_NAMES : [continent]
    : difficulty === ALL_DIFFICULTIES ? DIFFICULTIES : [difficulty]
  return values.map((value) => ({ ...(game !== ALL_GAMES && { gameType: game }), difficulty: value }))
}

// What the page shows from the merged results of soloQueries.
export function soloLeaderboard(scores, { continentMode = false, limit = LEADERBOARD_SIZE } = {}) {
  return sortScores(scores.filter((score) => isContinentScore(score) === continentMode)).slice(0, limit)
}

// Ascension scores of a game and a preset: a single query, whichever filters are set.
export function ascensionQuery({ game = ALL_GAMES, preset = ALL_PRESETS } = {}) {
  return {
    ...(game !== ALL_GAMES && { gameType: game }),
    ...(preset !== ALL_PRESETS && { presetName: preset }),
  }
}

export const ascensionLeaderboard = (scores, limit = LEADERBOARD_SIZE) => sortAscensionScores(scores).slice(0, limit)
