// Weekly league (api/weekly-top.mjs, Vercel Cron): the accounts that did best in the daily games of a week, shown on
// the League page (src/utils/league.js). Server only: the rules let anyone read weeklyTop/* and nobody write it.
//
// Weeks are fixed, Monday to Sunday in Paris time (missions.js). Points, per daily game of the week: 1 for playing it,
// plus a podium bonus (1st +5, 2nd +3, 3rd +2) among the accounts that played it; one score per account and board, the
// best one. Visitors (scores without a uid) don't count. Ties go to the most podium wins, then to the most games played.
//
// Each daily run writes weeklyTop/current (the week under way) and, once the previous week is over, pays its rewards
// and writes weeklyTop/last in one transaction (so asking again pays nothing more).
import { Timestamp } from 'firebase-admin/firestore'

import { SCROLLS } from '../../src/data/scrolls.js'
import countriesMeta from '../../src/data/countries.meta.json' with { type: 'json' }
import { previousDayKey } from '../../src/utils/dailyGames.js'
import { addFragments, flagPool, readFlags } from '../../src/utils/flagCollection.js'
import { GAME_TYPES } from '../../src/utils/gameTypes.js'
import { LEAGUE_MIN_PLAYED, LEAGUE_REWARDS } from '../../src/utils/leagueRewards.js'
import { missionDayAt, weekDays, weekKeyOf } from '../../src/utils/missions.js'
import { LEAGUE_WIN_SEALS, payScrolls } from '../../src/utils/scrollCollection.js'

// weeklyTop/current.entries: the top kept for the app versions that only know it.
export const TOP_SIZE = 20
// Players kept in weeklyTop/current and weeklyTop/last: a player's rank is their position in the list.
export const LEAGUE_MAX = 5000
export const PARTICIPATION_POINTS = 1
export const PODIUM_POINTS = [5, 3, 2]
export { LEAGUE_MIN_PLAYED, LEAGUE_REWARDS }

// The flags that fragments unlock.
const POOL = flagPool(countriesMeta.features)

// Same orders as the daily leaderboards (src/utils/dailyScores.js, rankingScores.js), best first. The Daily Challenge and
// the Country of the Day rank on their score (sortChallengeScores), not on attempts.
const attemptsOf = (score) => (score.attempts ?? 0) + (score.hints ?? 0)
const byDailyOrder = (a, b) => (a.mapAssist === true) - (b.mapAssist === true) || attemptsOf(a) - attemptsOf(b) || (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
const byRankingOrder = (a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.totalError ?? Infinity) - (b.totalError ?? Infinity)
const byChallengeOrder = (a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)

const ORDERS = {
  [GAME_TYPES.RANKING]: byRankingOrder,
  [GAME_TYPES.DAILY_CHALLENGE]: byChallengeOrder,
  [GAME_TYPES.COUNTRY_OF_DAY]: byChallengeOrder,
}

// `scores`: the daily_scores documents of the week. Returns every player, [{ uid, name, points, played, golds }] best first.
export function computeWeeklyTop(scores) {
  const boards = new Map()
  for (const score of scores) {
    if (!score.uid || !score.gameType || !score.dailyKey) continue
    const id = `${score.gameType}|${score.dailyKey}`
    boards.set(id, { gameType: score.gameType, scores: [...(boards.get(id)?.scores ?? []), score] })
  }

  const players = new Map()
  for (const { gameType, scores: board } of boards.values()) {
    // The rules let an account save several scores for a board: only its best one counts, and ranks don't skip.
    const seen = new Set()
    const ranked = board.sort(ORDERS[gameType] ?? byDailyOrder).filter((score) => !seen.has(score.uid) && seen.add(score.uid))
    ranked.forEach((score, rank) => {
      const player = players.get(score.uid) ?? { uid: score.uid, name: score.name, points: 0, played: 0, golds: 0 }
      player.name = score.name
      player.played += 1
      player.points += PARTICIPATION_POINTS + (PODIUM_POINTS[rank] ?? 0)
      if (rank === 0) player.golds += 1
      players.set(score.uid, player)
    })
  }

  return [...players.values()].sort((a, b) => b.points - a.points || b.golds - a.golds || b.played - a.played || a.name.localeCompare(b.name))
}

// The scores of the days `days`, in the one query that Firestore allows (up to 30 values for `in`).
async function weekScores(db, days) {
  const snapshot = await db.collection('daily_scores').where('dailyKey', 'in', days).get()
  return snapshot.docs.map((item) => item.data())
}

// users/{uid}.league.wins: the weeks the account won the league (the champion title, shown with the badges).
const winsOf = (data) => (Number.isInteger(data?.league?.wins) && data.league.wins > 0 ? data.league.wins : 0)

// Pays the previous week and writes weeklyTop/last, unless it is already done. The player at rank 1 also gets a win
// when they are paid (enough games, an account): the title doesn't pass down to rank 2. Returns its key when it was closed.
async function closeLastWeek({ db, today, now }) {
  const monday = weekDays(today)[0]
  const days = weekDays(previousDayKey(monday))
  const week = weekKeyOf(days[0])
  const lastRef = db.doc('weeklyTop/last')
  if ((await lastRef.get()).data()?.week === week) return null

  const players = computeWeeklyTop(await weekScores(db, days)).slice(0, LEAGUE_MAX)
  const rewarded = players.slice(0, Object.keys(LEAGUE_REWARDS).length).map((player, index) => ({ ...player, reward: player.played >= LEAGUE_MIN_PLAYED ? LEAGUE_REWARDS[index + 1] : 0 }))

  return db.runTransaction(async (transaction) => {
    const last = await transaction.get(lastRef)
    if (last.data()?.week === week) return null
    const refs = rewarded.filter((player) => player.reward > 0).map((player) => db.doc(`users/${player.uid}`))
    const users = refs.length ? await transaction.getAll(...refs) : []
    const champion = rewarded[0]?.reward > 0 ? rewarded[0].uid : null
    const paid = new Map()
    for (const user of users) {
      if (!user.exists || !user.data().username) continue
      const reward = rewarded.find((player) => player.uid === user.id).reward
      const update = { flags: addFragments(readFlags(user.data(), POOL), reward, POOL, user.id).state }
      if (user.id === champion) {
        update.league = { wins: winsOf(user.data()) + 1, lastWin: week }
        update.scrolls = payScrolls(user.data(), LEAGUE_WIN_SEALS, SCROLLS, user.id).state
      }
      transaction.update(user.ref, update)
      paid.set(user.id, reward)
    }
    const result = players.map((player) => ({ ...player, reward: paid.get(player.uid) ?? 0 }))
    transaction.set(lastRef, { week, players: result, closedAt: Timestamp.fromMillis(now) })
    return week
  })
}

// Closes the previous week if needed and writes weeklyTop/current. Returns { players, scores, closed } for the logs.
export async function refreshWeeklyTop({ db, now = Date.now() }) {
  const today = missionDayAt(now)
  const closed = await closeLastWeek({ db, today, now })

  // Only the days up to today: a score with a dailyKey from the future (forged) is left out.
  const days = weekDays(today).filter((day) => day <= today)
  const scores = await weekScores(db, days)
  const players = computeWeeklyTop(scores).slice(0, LEAGUE_MAX)
  await db.doc('weeklyTop/current').set({
    week: weekKeyOf(today),
    from: days[0],
    to: weekDays(today)[6],
    entries: players.slice(0, TOP_SIZE),
    players,
    updatedAt: Timestamp.fromMillis(now),
  })
  return { players: players.length, scores: scores.length, closed }
}
