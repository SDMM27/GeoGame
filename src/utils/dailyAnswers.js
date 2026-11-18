import { collection, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { getLeaderboardDocs } from './leaderboardQuery'

// The answers of daily scores (guesses, or the order played in Country Ranking) are kept apart from the public
// daily_scores, in daily_answers/{dailyKey}/{gameType}/{entryId}: today's ones are readable only by a signed-in player who
// saved their own score that day, so a leaderboard can't give the solution away (see firestore.rules).

// The entry of a score: the account's uid, or 'v_' + the score's id for a visitor.
export const answersEntryId = (scoreId, uid) => (uid ? uid : `v_${scoreId}`)

// Writes the answers of a score just saved, as a separate write: it is only logged when it fails (the score stays saved).
export async function saveDailyAnswers({ gameType, dailyKey, scoreId, uid, guesses, playerOrder }) {
  try {
    const data = {
      scoreId,
      ...(uid && { uid }),
      ...(Array.isArray(guesses) && { guesses }),
      ...(Array.isArray(playerOrder) && { playerOrder }),
    }
    await setDoc(doc(firestore, 'daily_answers', dailyKey, gameType, answersEntryId(scoreId, uid)), data)
  } catch (error) {
    console.warn('Could not save the answers of the daily score', error)
  }
}

// The answers of one day and game, as a Map scoreId -> { guesses, playerOrder }. null when Firestore refuses them
// (permission-denied): the day isn't over and the player hasn't played it, so they're locked.
export async function fetchDailyAnswers(gameType, dailyKey) {
  try {
    const snapshot = await getLeaderboardDocs(collection(firestore, 'daily_answers', dailyKey, gameType))
    return new Map(snapshot.docs.map((entry) => {
      const { scoreId, guesses, playerOrder } = entry.data()
      return [scoreId, { guesses, playerOrder }]
    }))
  } catch (error) {
    if (error?.code === 'permission-denied') return null
    throw error
  }
}

// Whether the player saved a score for that game and day.
export async function hasPlayedDaily(uid, gameType, dailyKey) {
  const snapshot = await getDocs(
    query(collection(firestore, 'daily_scores'), where('uid', '==', uid), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey), limit(1))
  )
  return !snapshot.empty
}

// What a leaderboard does with the answers of the day it shows:
//  - 'open': a past day, shown to everyone.
//  - 'signed-out': today without an account, locked and nothing to ask.
//  - 'check': today with an account, locked until Firestore shows the player has played.
// `todayKey` is the current daily key, `day` the one displayed (days compare as 'YYYY-MM-DD' strings).
export function answersAccess(day, todayKey, uid) {
  if (!day || !todayKey || day < todayKey) return 'open'
  return uid ? 'check' : 'signed-out'
}

// The answers to show for a leaderboard row, or null when they are locked. The entry of daily_answers first; the fields
// that apps from before it still saved in the score only as a fallback, and never when locked.
export function answersOf(score, { locked, answers }) {
  if (locked) return null
  const entry = (score.id && answers?.get(score.id)) || null
  return { guesses: entry?.guesses ?? score.guesses, playerOrder: entry?.playerOrder ?? score.playerOrder }
}
