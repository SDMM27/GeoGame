import { addDoc, collection, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { isBetterDailyScore, sortDailyScores } from './dailyScores'

function isBetter(newScore, newTime, existingScore, existingTime) {
  if (newScore > existingScore) return true
  if (newScore === existingScore && newTime < existingTime) return true
  return false
}

// Saves a solo score, keeping only the best one per (name, difficulty, gameType).
// Returns { status: 'saved' | 'updated' } or { status: 'blocked', existing: { score, elapsedTime } }.
export async function saveScore({ name, score, difficulty, elapsedTime, gameType, continent }) {
  const ref = collection(firestore, 'scores')
  const data = {
    name,
    score,
    difficulty,
    elapsedTime,
    gameType,
    ...(continent != null && { continent }),
  }

  const existingSnapshot = await getDocs(
    query(ref, where('name', '==', name), where('difficulty', '==', difficulty), where('gameType', '==', gameType))
  )

  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0].data()
    if (!isBetter(score, elapsedTime, existing.score, existing.elapsedTime)) {
      return { status: 'blocked', existing: { score: existing.score, elapsedTime: existing.elapsedTime } }
    }
    // Firestore rules only allow replacing a score with a better one, never deleting it.
    await setDoc(existingSnapshot.docs[0].ref, data)
    return { status: 'updated' }
  }

  await addDoc(ref, data)
  return { status: 'saved' }
}

// Saves an Ascension score, keeping only the best one per (name, gameType, presetName).
// Returns { status: 'saved' | 'updated' } or { status: 'blocked', existing: { score, timeMs } }.
export async function saveAscensionScore({ name, gameType, presetName, timer, score, stats, phaseStats }) {
  const ref = collection(firestore, 'ascension_scores')
  const existing = await getDocs(
    query(ref, where('name', '==', name), where('gameType', '==', gameType), where('presetName', '==', presetName))
  )

  if (!existing.empty) {
    const prev = existing.docs[0].data()
    if (!isBetter(score, timer, prev.globalScore, prev.globalTimeMs)) {
      return { status: 'blocked', existing: { timeMs: prev.globalTimeMs, score: prev.globalScore } }
    }
  }

  const data = {
    name,
    gameType,
    presetName,
    globalTimeMs: timer,
    globalScore: score,
    totalFound: stats.found,
    totalSkipped: stats.skipped,
    phaseStats,
    date: serverTimestamp(),
  }
  if (!existing.empty) {
    await setDoc(existing.docs[0].ref, data)
    return { status: 'updated' }
  }
  await addDoc(ref, data)
  return { status: 'saved' }
}

// Saves a daily-challenge score, keeping only the best one per (name, gameType, dailyKey).
// Returns { status: 'saved' | 'updated' } or { status: 'blocked', existing: { attempts, elapsedTime } }.
export async function saveDailyScore({ name, gameType, dailyKey, attempts, elapsedTime, guesses, hints }) {
  const ref = collection(firestore, 'daily_scores')
  const newScore = { name, gameType, dailyKey, attempts, elapsedTime, guesses, ...(hints != null && { hints }) }

  const existingSnapshot = await getDocs(
    query(ref, where('name', '==', name), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
  )

  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0].data()
    if (!isBetterDailyScore(newScore, existing)) {
      return { status: 'blocked', existing: { attempts: existing.attempts, elapsedTime: existing.elapsedTime } }
    }
    await setDoc(existingSnapshot.docs[0].ref, newScore)
    return { status: 'updated' }
  }

  await addDoc(ref, newScore)
  return { status: 'saved' }
}

// Daily-challenge scores of one day, best first.
export async function fetchDailyScores(gameType, dailyKey) {
  const snapshot = await getDocs(
    query(collection(firestore, 'daily_scores'), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
  )
  return sortDailyScores(snapshot.docs.map((doc) => doc.data()))
}
