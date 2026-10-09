// Game history of signed-in players, shared by the website and the app: users/{uid}/games/{id}.
// A record describes one finished game:
//   gameType      GAME_TYPES value
//   mode          'standard' | 'ascension' | 'daily' | 'infinite' | 'multi'
//   score         points, when the game has some
//   attempts      guesses used (daily Border Guess, Country Clue, Quiz, Ranking; steps in Voyage Voyage)
//   solved        daily games: found / ranked
//   found, total  countries found out of the total (Placement, Flags, Capitals, rounds)
//   elapsedTime   milliseconds
//   difficulty, continent, presetName, dailyKey, roomCode   when they apply
// Daily games use a fixed id so the same daily is only kept once.
import { onAuthStateChanged } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../Firebase'

export const HISTORY_LIMIT = 300

export const gamesCollection = (uid) => collection(firestore, 'users', uid, 'games')

// The signed-in user once Firebase has restored the session (null when signed out).
function currentUser(auth) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

// Firestore rejects undefined values.
function withoutEmptyFields(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && !Number.isNaN(value))
  )
}

export async function recordGame(auth, record) {
  try {
    const user = await currentUser(auth)
    if (!user) return
    const data = { ...withoutEmptyFields(record), playedAt: serverTimestamp() }
    if (record.mode === 'daily' && record.dailyKey) {
      const ref = doc(gamesCollection(user.uid), `daily_${record.gameType}_${record.dailyKey}`)
      if ((await getDoc(ref)).exists()) return
      await setDoc(ref, data)
    } else {
      await addDoc(gamesCollection(user.uid), data)
    }
  } catch (error) {
    // History is a bonus: never break the end of a game for it.
    console.warn('[history]', error?.code, error)
  }
}

const fromSnapshot = (snapshot) => {
  const data = snapshot.data()
  // playedAt is null until the server confirms a game written a moment ago.
  return { id: snapshot.id, ...data, playedAt: data.playedAt?.toMillis?.() ?? Date.now() }
}

// Most recent first.
export async function fetchGames(uid, max = HISTORY_LIMIT) {
  const snapshot = await getDocs(query(gamesCollection(uid), orderBy('playedAt', 'desc'), limit(max)))
  return snapshot.docs.map(fromSnapshot)
}

// The player's game of one daily challenge (null if not played), whatever the device it was played on.
export async function fetchDailyGame(uid, gameType, dailyKey) {
  const snapshot = await getDoc(doc(gamesCollection(uid), `daily_${gameType}_${dailyKey}`))
  return snapshot.exists() ? fromSnapshot(snapshot) : null
}

// One player's games of a given daily challenge day.
export async function fetchDailyGames(uid, dailyKey) {
  const snapshot = await getDocs(query(gamesCollection(uid), where('dailyKey', '==', dailyKey)))
  return snapshot.docs.map(fromSnapshot).filter((game) => game.mode === 'daily')
}

// Placement, Flags and Capitals: classic, Ascension or multiplayer game (nothing for training).
export function setupGameRecord({ gameType, isTraining, roomCode, isAscension, presetName, difficulty, continent, score, stats, timer }) {
  if (isTraining) return null
  return {
    gameType,
    mode: roomCode ? 'multi' : isAscension ? 'ascension' : 'standard',
    score,
    found: stats.found,
    total: stats.total,
    elapsedTime: timer,
    difficulty,
    continent,
    presetName,
    roomCode,
  }
}
