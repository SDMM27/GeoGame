// Weekly league: the accounts ranked on the points of the daily games of the week (Monday to Sunday, Paris), computed
// once a day by the server (api/_lib/weeklyTop.mjs) into weeklyTop/current, with the finished week in weeklyTop/last.
// Shared by the website and the app.
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { previousDayKey } from './dailyGames'
import { missionDayAt, weekDays, weekKeyOf } from './missions'

// Players shown in the world board, and in the podium of the last week.
export const WORLD_SIZE = 20
export const PODIUM_SIZE = 3

const isPlayer = (entry) => typeof entry?.uid === 'string' && typeof entry.name === 'string'
const count = (value) => (Number.isFinite(value) ? value : 0)
const readPlayers = (list) =>
  Array.isArray(list)
    ? list.filter(isPlayer).map((entry) => ({ uid: entry.uid, name: entry.name, points: count(entry.points), played: count(entry.played), golds: count(entry.golds), reward: count(entry.reward) }))
    : []

const readWeek = (snapshot, ...fields) => {
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  const list = fields.map((field) => data[field]).find(Array.isArray)
  return { week: typeof data.week === 'string' ? data.week : null, players: readPlayers(list) }
}

// { current: { week, players } | null, last: { week, players } | null }, best first. A missing document is null; the
// players of a `current` written before the league existed are in `entries`.
export async function fetchLeague() {
  const [current, last] = await Promise.all([getDoc(doc(firestore, 'weeklyTop', 'current')), getDoc(doc(firestore, 'weeklyTop', 'last'))])
  return { current: readWeek(current, 'players', 'entries'), last: readWeek(last, 'players') }
}

// Only the finished week: { week, players } | null (one read).
export async function fetchLastWeek() {
  return readWeek(await getDoc(doc(firestore, 'weeklyTop', 'last')), 'players')
}

// The week that ended before the one `now` is in: '2026-W41' on Wednesday 14 October 2026.
export const previousWeekKey = (now) => weekKeyOf(previousDayKey(weekDays(missionDayAt(now))[0]))

// { week, rank, points, reward } when `uid` finished 1st to 3rd of `last` ({ week, players }) and was paid, else null.
export function podiumResult(last, uid) {
  const index = last && uid ? last.players.findIndex((player) => player.uid === uid) : -1
  const player = last?.players[index]
  if (!player || index >= PODIUM_SIZE || player.reward <= 0) return null
  return { week: last.week, rank: index + 1, points: player.points, reward: player.reward }
}

/**
 * What the League page shows, from fetchLeague() and the account (`uid`, `friends`: [{ uid, username }], `username`: the
 * account's own name, for when it isn't ranked yet), at `now`:
 * - world: the top WORLD_SIZE, [{ uid, name, points, played, golds, rank }]
 * - me: { rank, points, played, ahead: { name, gap } | null } or null when not ranked this week; `gap`: the points
 *   needed to pass the player right above
 * - friendsBoard: the account and its friends, [{ uid, name, points, played, rank, isMe }]; those not ranked have 0 points
 * - lastResult: { week, rank, points, reward, podium } for the finished week, null without one; `rank` is null when the
 *   account didn't play
 * - daysLeft: days left in the week, today included (1 on Sunday)
 */
export function leagueView({ current, last, uid, friends = [], username = '', now }) {
  const today = missionDayAt(now)
  // Until the first run of the week, `current` is still the finished week.
  const players = current && (current.week == null || current.week === weekKeyOf(today)) ? current.players : []
  const index = uid ? players.findIndex((player) => player.uid === uid) : -1
  const mine = players[index]
  const above = index > 0 ? players[index - 1] : null

  const ranked = new Map(players.map((player) => [player.uid, player]))
  const board = [...(uid ? [{ uid, username }] : []), ...friends.filter((friend) => friend.uid !== uid)]
    .map((person) => ({
      uid: person.uid,
      name: ranked.get(person.uid)?.name ?? person.username,
      points: ranked.get(person.uid)?.points ?? 0,
      played: ranked.get(person.uid)?.played ?? 0,
      isMe: person.uid === uid,
    }))
    .filter((person) => person.name)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

  const lastIndex = last && uid ? last.players.findIndex((player) => player.uid === uid) : -1
  const lastMine = last?.players[lastIndex]
  return {
    world: players.slice(0, WORLD_SIZE).map((player, position) => ({ ...player, rank: position + 1 })),
    me: mine ? { rank: index + 1, points: mine.points, played: mine.played, ahead: above ? { name: above.name, gap: above.points - mine.points + 1 } : null } : null,
    friendsBoard: board.map((person, position) => ({ ...person, rank: position + 1 })),
    lastResult: last
      ? {
          week: last.week,
          rank: lastMine ? lastIndex + 1 : null,
          points: lastMine?.points ?? 0,
          reward: lastMine?.reward ?? 0,
          podium: last.players.slice(0, PODIUM_SIZE).map((player, position) => ({ ...player, rank: position + 1 })),
        }
      : null,
    daysLeft: 7 - weekDays(today).indexOf(today),
  }
}
