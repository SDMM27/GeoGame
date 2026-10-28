import { getDocs } from 'firebase/firestore'

// getDocs for a leaderboard, with a deadline: should a query stall without failing (see utils/firestoreCache.js for
// the known case), the leaderboard fails like a network error after LEADERBOARD_TIMEOUT_MS instead of loading forever.
export const LEADERBOARD_TIMEOUT_MS = 8000

export function getLeaderboardDocs(firestoreQuery, timeoutMs = LEADERBOARD_TIMEOUT_MS) {
  let timer
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Leaderboard query timed out after ${timeoutMs} ms`)
      error.code = 'deadline-exceeded'
      reject(error)
    }, timeoutMs)
  })
  return Promise.race([getDocs(firestoreQuery), deadline]).finally(() => clearTimeout(timer))
}
