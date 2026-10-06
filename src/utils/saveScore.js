import { addDoc, collection, deleteDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { firestore } from '../Firebase'

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
    await deleteDoc(existingSnapshot.docs[0].ref)
  }

  await addDoc(ref, data)
  return { status: existingSnapshot.empty ? 'saved' : 'updated' }
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
    await deleteDoc(existing.docs[0].ref)
  }

  await addDoc(ref, {
    name,
    gameType,
    presetName,
    globalTimeMs: timer,
    globalScore: score,
    totalFound: stats.found,
    totalSkipped: stats.skipped,
    phaseStats,
    date: serverTimestamp(),
  })
  return { status: existing.empty ? 'saved' : 'updated' }
}
