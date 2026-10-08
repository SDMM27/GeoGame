import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { isBetterDailyScore, sortDailyScores } from './dailyScores'
import { sortRankingScores } from './rankingScores'
import { LEADERBOARD_SIZE, ascensionLeaderboard, ascensionQuery, soloLeaderboard, soloQueries, sortSurvivalScores } from './leaderboards'
import { GAME_TYPES } from './gameTypes'
import { normalizeUsername } from './account'
import { containsProfanity } from './profanity'

// Every save takes the player as { name, uid? }:
//  - signed in: uid and the account's username. One entry per account, owned by it (see firestore.rules).
//  - visitor: a free name, as long as no account owns it.
// Each save returns { status: 'saved' | 'updated' }, { status: 'blocked', existing } when the player
// already has a better entry, { status: 'taken' } when a visitor picks an account's username, or
// { status: 'forbidden' } when a visitor's name is offensive (utils/profanity.js).

// A missing time (null) is the worst one.
function isBetter(newScore, newTime, existingScore, existingTime) {
  if (newScore > existingScore) return true
  if (newScore === existingScore && (newTime ?? Infinity) < (existingTime ?? Infinity)) return true
  return false
}

// Whether `name` is the username of an account (usernames/{lowercase}, see account.js).
export async function isNameTaken(name) {
  const key = normalizeUsername(name).toLowerCase()
  if (!key || key.includes('/')) return false
  return (await getDoc(doc(firestore, 'usernames', key))).exists()
}

// Saves `data` as the player's entry among the documents matching `filters`, unless their existing
// entry is better. `toExisting` turns that entry into what `blocked` reports.
async function saveBest(collectionName, player, filters, data, isBetterThan, toExisting) {
  const { uid } = player
  // Spaces normalized like usernames, so the rules' check against usernames/ sees the same key.
  const name = uid ? player.name : normalizeUsername(player.name)
  if (!uid && containsProfanity(name)) return { status: 'forbidden' }
  if (!uid && (await isNameTaken(name))) return { status: 'taken' }

  const ref = collection(firestore, collectionName)
  const owner = uid ? where('uid', '==', uid) : where('name', '==', name)
  const conditions = Object.entries(filters).map(([field, value]) => where(field, '==', value))
  const existing = await getDocs(query(ref, owner, ...conditions))
  const entry = { name, ...(uid && { uid }), ...filters, ...data }

  if (!existing.empty) {
    const previous = existing.docs[0].data()
    if (!isBetterThan(entry, previous)) return { status: 'blocked', existing: toExisting(previous) }
    // Firestore rules only allow replacing a score with a better one, never deleting it.
    await setDoc(existing.docs[0].ref, entry)
    return { status: 'updated' }
  }

  await addDoc(ref, entry)
  return { status: 'saved' }
}

// Solo score: best one per player, difficulty and game (and continent).
export function saveScore({ name, uid, score, difficulty, elapsedTime, gameType, continent }) {
  return saveBest(
    'scores',
    { name, uid },
    { difficulty, gameType, ...(continent != null && { continent }) },
    { score, elapsedTime: elapsedTime ?? null }, // always written, null if missing: orderBy('elapsedTime') skips documents without the key
    (next, previous) => isBetter(next.score, next.elapsedTime, previous.score, previous.elapsedTime),
    (previous) => ({ score: previous.score, elapsedTime: previous.elapsedTime })
  )
}

// Ascension score: best one per player, game and preset.
export function saveAscensionScore({ name, uid, gameType, presetName, timer, score, stats, phaseStats }) {
  return saveBest(
    'ascension_scores',
    { name, uid },
    { gameType, presetName },
    {
      globalTimeMs: timer,
      globalScore: score,
      totalFound: stats.found,
      totalSkipped: stats.skipped,
      phaseStats,
      date: serverTimestamp(),
    },
    (next, previous) => isBetter(next.globalScore, next.globalTimeMs, previous.globalScore, previous.globalTimeMs),
    (previous) => ({ timeMs: previous.globalTimeMs, score: previous.globalScore })
  )
}

// Daily-challenge score: best one per player, game and day.
export function saveDailyScore({ name, uid, gameType, dailyKey, attempts, elapsedTime, guesses, hints }) {
  return saveBest(
    'daily_scores',
    { name, uid },
    { gameType, dailyKey },
    { attempts, elapsedTime, guesses, ...(hints != null && { hints }) },
    isBetterDailyScore,
    (previous) => ({ attempts: previous.attempts, elapsedTime: previous.elapsedTime })
  )
}

// Country Ranking daily score: higher score first, then the smaller total error.
export function saveRankingScore({ name, uid, dailyKey, score, totalError, attemptsUsed, playerOrder }) {
  return saveBest(
    'daily_scores',
    { name, uid },
    { gameType: GAME_TYPES.RANKING, dailyKey },
    { score, totalError, attemptsUsed, playerOrder },
    (next, previous) =>
      next.score > previous.score || (next.score === previous.score && next.totalError < (previous.totalError ?? Infinity)),
    (previous) => previous
  )
}

// Survival score: best one per player, set of games (`modes`, see survivalModesKey) and number of lives.
export function saveSurvivalScore({ name, uid, modes, lives, score, elapsedTime }) {
  return saveBest(
    'survival_scores',
    { name, uid },
    { modes, lives },
    { score, elapsedTime },
    (next, previous) => isBetter(next.score, next.elapsedTime, previous.score, previous.elapsedTime),
    (previous) => ({ score: previous.score, elapsedTime: previous.elapsedTime })
  )
}

// A leaderboard row: the document's fields and its id, which reports/ points at (utils/reports.js).
const withId = (doc) => ({ ...doc.data(), id: doc.id })

// Daily-challenge scores of one day, best first.
export async function fetchDailyScores(gameType, dailyKey) {
  const snapshot = await getDocs(
    query(collection(firestore, 'daily_scores'), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
  )
  return sortDailyScores(snapshot.docs.map(withId))
}

// Country Ranking scores of one day, best first (the best LEADERBOARD_SIZE).
export async function fetchRankingScores(dailyKey) {
  const snapshot = await getDocs(
    query(
      collection(firestore, 'daily_scores'),
      where('gameType', '==', GAME_TYPES.RANKING),
      where('dailyKey', '==', dailyKey),
      orderBy('score', 'desc'),
      orderBy('totalError', 'asc'),
      limit(LEADERBOARD_SIZE)
    )
  )
  return sortRankingScores(snapshot.docs.map(withId))
}

// Runs one query per set of equality filters, each in the given leaderboard order (see firestore.indexes.json).
async function fetchTop(collectionName, filterSets, orderFields) {
  const results = await Promise.all(
    filterSets.map((filters) =>
      getDocs(
        query(
          collection(firestore, collectionName),
          ...Object.entries(filters).map(([field, value]) => where(field, '==', value)),
          ...orderFields.map(([field, direction]) => orderBy(field, direction)),
          limit(LEADERBOARD_SIZE)
        )
      )
    )
  )
  return results.flatMap((snapshot) => snapshot.docs.map(withId))
}

// Solo leaderboard (the best LEADERBOARD_SIZE), for { game, continentMode, difficulty, continent } (see leaderboards.js).
export async function fetchSoloScores(filters) {
  const scores = await fetchTop('scores', soloQueries(filters), [['score', 'desc'], ['elapsedTime', 'asc']])
  return soloLeaderboard(scores, filters)
}

// Ascension leaderboard (the best LEADERBOARD_SIZE), for { game, preset }.
export async function fetchAscensionScores(filters) {
  const scores = await fetchTop('ascension_scores', [ascensionQuery(filters)], [['globalTimeMs', 'asc'], ['globalScore', 'desc']])
  return ascensionLeaderboard(scores)
}

// Survival leaderboard (the best LEADERBOARD_SIZE) of a number of lives, for a set of games or all of them (modes null).
export async function fetchSurvivalScores({ lives, modes = null }) {
  const filters = { lives, ...(modes && { modes }) }
  const scores = await fetchTop('survival_scores', [filters], [['score', 'desc'], ['elapsedTime', 'asc']])
  return sortSurvivalScores(scores).slice(0, LEADERBOARD_SIZE)
}
