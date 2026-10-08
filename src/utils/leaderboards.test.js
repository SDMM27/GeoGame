import { describe, it, expect } from 'vitest'
import {
  ALL_CONTINENTS,
  ALL_DIFFICULTIES,
  ALL_GAMES,
  ALL_PRESETS,
  CONTINENT_NAMES,
  DIFFICULTIES,
  LEADERBOARD_SIZE,
  ascensionLeaderboard,
  ascensionQuery,
  isContinentScore,
  soloLeaderboard,
  soloQueries,
  sortAscensionScores,
  sortScores,
} from './leaderboards'
import { GAME_TYPES } from './gameTypes'

describe('sortScores', () => {
  it('trie par score décroissant', () => {
    const input = [
      { name: 'A', score: 5, elapsedTime: 120 },
      { name: 'B', score: 10, elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('B')
  })

  it('à score égal, trie par temps croissant', () => {
    const input = [
      { name: 'Slow', score: 10, elapsedTime: 180 },
      { name: 'Fast', score: 10, elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('Fast')
  })

  it('place les scores sans temps en dernier à score égal, sans muter le tableau', () => {
    const input = [{ name: 'NoTime', score: 10 }, { name: 'HasTime', score: 10, elapsedTime: 90 }]
    const copy = [...input]
    expect(sortScores(input).map((s) => s.name)).toEqual(['HasTime', 'NoTime'])
    expect(input).toEqual(copy)
  })
})

describe('sortAscensionScores', () => {
  it('trie par temps croissant puis score décroissant', () => {
    const input = [
      { name: 'A', globalTimeMs: 200, globalScore: 10 },
      { name: 'B', globalTimeMs: 100, globalScore: 1 },
      { name: 'C', globalTimeMs: 100, globalScore: 5 },
      { name: 'D', globalScore: 99 },
    ]
    expect(sortAscensionScores(input).map((s) => s.name)).toEqual(['C', 'B', 'A', 'D'])
  })
})

describe('soloQueries', () => {
  it('une requête par difficulté pour toutes les difficultés', () => {
    expect(soloQueries({ game: GAME_TYPES.FLAGS })).toEqual(
      DIFFICULTIES.map((difficulty) => ({ gameType: GAME_TYPES.FLAGS, difficulty }))
    )
  })

  it('filtre une difficulté précise, sans gameType pour tous les jeux', () => {
    expect(soloQueries({ game: ALL_GAMES, difficulty: 'Moyen' })).toEqual([{ difficulty: 'Moyen' }])
  })

  it('en mode continents, le continent est la difficulté enregistrée', () => {
    expect(soloQueries({ game: GAME_TYPES.PLACEMENT, continentMode: true, continent: 'Asie' })).toEqual([
      { gameType: GAME_TYPES.PLACEMENT, difficulty: 'Asie' },
    ])
    expect(soloQueries({ continentMode: true, continent: ALL_CONTINENTS })).toHaveLength(CONTINENT_NAMES.length)
  })

  it('ignore le filtre de difficulté en mode continents et inversement', () => {
    expect(soloQueries({ continentMode: true, difficulty: 'Facile', continent: 'Europe' })).toEqual([{ difficulty: 'Europe' }])
    expect(soloQueries({ continentMode: false, difficulty: 'Facile', continent: 'Europe' })).toEqual([{ difficulty: 'Facile' }])
  })
})

describe('ascensionQuery', () => {
  it('ne garde que les filtres posés', () => {
    expect(ascensionQuery({ game: ALL_GAMES, preset: ALL_PRESETS })).toEqual({})
    expect(ascensionQuery({ game: 'FLAGS', preset: ALL_PRESETS })).toEqual({ gameType: 'FLAGS' })
    expect(ascensionQuery({ game: 'FLAGS', preset: 'Challenge' })).toEqual({ gameType: 'FLAGS', presetName: 'Challenge' })
  })
})

// The previous scoreboards: every document, filtered and sorted in the browser.
const oldSolo = (all, { game, continentMode, difficulty, continent }) =>
  sortScores(
    all.filter((score) => {
      if (game !== ALL_GAMES && score.gameType !== game) return false
      if (continentMode) {
        if (!isContinentScore(score)) return false
        return continent === ALL_CONTINENTS || score.continent === continent || score.difficulty === continent
      }
      if (isContinentScore(score)) return false
      return difficulty === ALL_DIFFICULTIES || score.difficulty === difficulty
    })
  )

const oldAscension = (all, { game, preset }) =>
  sortAscensionScores(
    all.filter((score) => (game === ALL_GAMES || score.gameType === game) && (preset === ALL_PRESETS || score.presetName === preset))
  )

// What Firestore does for one query: equality filters, orderBy (documents without the field are left out), limit.
function runQuery(docs, filters, orderFields) {
  return docs
    .filter((doc) => Object.entries(filters).every(([field, value]) => doc[field] === value))
    .filter((doc) => orderFields.every(([field]) => doc[field] !== undefined))
    .sort((a, b) => {
      for (const [field, direction] of orderFields) {
        if (a[field] !== b[field]) return direction === 'desc' ? b[field] - a[field] : a[field] - b[field]
      }
      return 0
    })
    .slice(0, LEADERBOARD_SIZE)
}

const newSolo = (all, filters) =>
  soloLeaderboard(
    soloQueries(filters).flatMap((query) => runQuery(all, query, [['score', 'desc'], ['elapsedTime', 'asc']])),
    filters
  )

const newAscension = (all, filters) =>
  ascensionLeaderboard(runQuery(all, ascensionQuery(filters), [['globalTimeMs', 'asc'], ['globalScore', 'desc']]))

// Deterministic pseudo-random data, with many ties on score and time.
function random(seed) {
  let state = seed
  return (n) => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return Math.floor((state / 4294967296) * n)
  }
}

const games = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]

function soloData(count) {
  const next = random(7)
  return Array.from({ length: count }, (_, i) => {
    const continent = next(3) === 0 ? CONTINENT_NAMES[next(5)] : null
    const legacy = continent && next(2) === 0
    return {
      name: `P${i}`,
      gameType: games[next(3)],
      difficulty: continent ?? DIFFICULTIES[next(5)],
      ...(continent && !legacy && { continent }),
      score: next(30),
      elapsedTime: 1000 * (10 + next(40)),
    }
  })
}

function ascensionData(count) {
  const next = random(11)
  return Array.from({ length: count }, (_, i) => ({
    name: `P${i}`,
    gameType: games[next(3)],
    presetName: ['Challenge', 'Marathon', 'Sprint'][next(3)],
    globalTimeMs: 1000 * (60 + next(80)),
    globalScore: next(40),
  }))
}

// Ties are broken by document id in Firestore, so compare what ranks: the same sort keys in the same order.
const keys = (rows, fields) => rows.map((row) => fields.map((field) => row[field]).join('|'))

describe('classement ciblé contre classement complet', () => {
  const scores = soloData(3000)
  const ascensions = ascensionData(1500)

  const soloCases = []
  for (const game of [ALL_GAMES, ...games]) {
    for (const difficulty of [ALL_DIFFICULTIES, ...DIFFICULTIES]) {
      soloCases.push({ game, continentMode: false, difficulty, continent: ALL_CONTINENTS })
    }
    for (const continent of [ALL_CONTINENTS, ...CONTINENT_NAMES]) {
      soloCases.push({ game, continentMode: true, difficulty: ALL_DIFFICULTIES, continent })
    }
  }

  it.each(soloCases)('solo %j', (filters) => {
    const before = oldSolo(scores, filters).slice(0, LEADERBOARD_SIZE)
    const after = newSolo(scores, filters)
    expect(after).toHaveLength(before.length)
    expect(keys(after, ['score', 'elapsedTime'])).toEqual(keys(before, ['score', 'elapsedTime']))
  })

  it('les données de test remplissent des classements de plus de 100 lignes', () => {
    expect(oldSolo(scores, soloCases[0]).length).toBeGreaterThan(LEADERBOARD_SIZE)
  })

  const ascensionCases = []
  for (const game of [ALL_GAMES, ...games]) {
    for (const preset of [ALL_PRESETS, 'Challenge', 'Marathon', 'Sprint']) ascensionCases.push({ game, preset })
  }

  it.each(ascensionCases)('ascension %j', (filters) => {
    const before = oldAscension(ascensions, filters).slice(0, LEADERBOARD_SIZE)
    const after = newAscension(ascensions, filters)
    expect(keys(after, ['globalTimeMs', 'globalScore'])).toEqual(keys(before, ['globalTimeMs', 'globalScore']))
  })

  it('un ancien score dont le continent est seulement la difficulté reste classé en mode continents', () => {
    const legacy = { name: 'Old', gameType: GAME_TYPES.PLACEMENT, difficulty: 'Europe', score: 99, elapsedTime: 5000 }
    const rows = newSolo([legacy], { game: GAME_TYPES.PLACEMENT, continentMode: true, continent: 'Europe' })
    expect(rows).toEqual([legacy])
    expect(newSolo([legacy], { game: GAME_TYPES.PLACEMENT, continentMode: false, difficulty: ALL_DIFFICULTIES })).toEqual([])
  })
})
