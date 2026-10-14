// Top of the week (api/weekly-top.mjs, Vercel Cron): the accounts that did best in the daily challenges of the last
// WEEK_DAYS days, written to weeklyTop/current for the Community page (src/utils/community.js). Server only: the
// rules let anyone read it and nobody write it.
//
// Points, per daily challenge of those days: 1 for playing it, plus a podium bonus (1st +5, 2nd +3, 3rd +2) among
// the accounts that played it. Visitors (scores without a uid) don't count. Ties go to the most podium wins,
// then to the most challenges played.
import { Timestamp } from 'firebase-admin/firestore'

import { dailyKeyAt } from './dailyReminder.mjs'

export const WEEK_DAYS = 7
export const TOP_SIZE = 20
export const PARTICIPATION_POINTS = 1
export const PODIUM_POINTS = [5, 3, 2]
const DAY = 24 * 60 * 60 * 1000

// The daily keys of the last `days` days, today included, oldest first.
export function weekKeys(now, days = WEEK_DAYS) {
  return Array.from({ length: days }, (_, index) => dailyKeyAt(now - (days - 1 - index) * DAY))
}

// Same orders as the daily leaderboards (src/utils/dailyScores.js, rankingScores.js), best first.
const attemptsOf = (score) => (score.attempts ?? 0) + (score.hints ?? 0)
const byDailyOrder = (a, b) => attemptsOf(a) - attemptsOf(b) || (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
const byRankingOrder = (a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.totalError ?? Infinity) - (b.totalError ?? Infinity)

// `scores`: the daily_scores documents of the week. Returns [{ uid, name, points, played, golds }] best first.
export function computeWeeklyTop(scores, size = TOP_SIZE) {
  const boards = new Map()
  for (const score of scores) {
    if (!score.uid || !score.gameType || !score.dailyKey) continue
    const id = `${score.gameType}|${score.dailyKey}`
    boards.set(id, [...(boards.get(id) ?? []), score])
  }

  const players = new Map()
  for (const [id, board] of boards) {
    const order = id.startsWith('RANKING|') ? byRankingOrder : byDailyOrder
    board.sort(order).forEach((score, rank) => {
      const player = players.get(score.uid) ?? { uid: score.uid, name: score.name, points: 0, played: 0, golds: 0 }
      player.name = score.name
      player.played += 1
      player.points += PARTICIPATION_POINTS + (PODIUM_POINTS[rank] ?? 0)
      if (rank === 0) player.golds += 1
      players.set(score.uid, player)
    })
  }

  return [...players.values()]
    .sort((a, b) => b.points - a.points || b.golds - a.golds || b.played - a.played || a.name.localeCompare(b.name))
    .slice(0, size)
}

// Reads the week's scores and writes weeklyTop/current. Returns { players, scores } for the logs.
export async function refreshWeeklyTop({ db, now = Date.now() }) {
  const keys = weekKeys(now)
  const snapshot = await db.collection('daily_scores').where('dailyKey', 'in', keys).get()
  const entries = computeWeeklyTop(snapshot.docs.map((item) => item.data()))
  await db.doc('weeklyTop/current').set({ entries, from: keys[0], to: keys[keys.length - 1], updatedAt: Timestamp.fromMillis(now) })
  return { players: entries.length, scores: snapshot.size }
}
