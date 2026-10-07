import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { isBetterDailyScore, sortDailyScores } from './dailyScores'
import { sortRankingScores } from './rankingScores'
import { GAME_TYPES } from './gameTypes'
import { normalizeUsername } from './account'

// Every save takes the player as { name, uid? }:
//  - signed in: uid and the account's username. One entry per account, owned by it (see firestore.rules).
//  - visitor: a free name, as long as no account owns it.
// Each save returns { status: 'saved' | 'updated' }, { status: 'blocked', existing } when the player
// already has a better entry, or { status: 'taken' } when a visitor picks an account's username.

function isBetter(newScore, newTime, existingScore, existingTime) {
  if (newScore > existingScore) return true
  if (newScore === existingScore && newTime < existingTime) return true
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
    { score, elapsedTime },
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

// Daily-challenge scores of one day, best first.
export async function fetchDailyScores(gameType, dailyKey) {
  const snapshot = await getDocs(
    query(collection(firestore, 'daily_scores'), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
  )
  return sortDailyScores(snapshot.docs.map((doc) => doc.data()))
}

// Country Ranking scores of one day, best first.
export async function fetchRankingScores(dailyKey) {
  const snapshot = await getDocs(
    query(collection(firestore, 'daily_scores'), where('gameType', '==', GAME_TYPES.RANKING), where('dailyKey', '==', dailyKey))
  )
  return sortRankingScores(snapshot.docs.map((doc) => doc.data()))
}
