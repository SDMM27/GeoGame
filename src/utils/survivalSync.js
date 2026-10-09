// src/utils/survivalSync.js
// Survival in a live room: everyone plays the same round at the same time, and the next round starts once every
// player still in the game is done with it (or when its time is up). Pure: no DOM, no Firestore.
//
// There is no server: each player writes their state to rooms/{room}/progress/{player}
//   { round, roundAt, roundDone, finished, lastSeen }
// (round: the round they are on, roundAt: when it started, server ms; lastSeen: server time of the write), and every
// client works out the same schedule from these documents. Round 0 starts with the game (the room's startAt);
// round k+1 starts REVEAL_MS after the last player finished round k, or after round k's time is up.
// The game ends for everyone once a single player is left: the others out of lives, they win when done with that round.

// The answer of a round stays on screen this long before the next round
export const SURVIVAL_REVEAL_MS = 3000
// Without a timer, how long a round waits for a player who doesn't answer (closed tab, lost connection)
export const SURVIVAL_MAX_WAIT_MS = 120000
// Players who open a live survival game later than this after its start play it on their own
export const SURVIVAL_LATE_MS = 20000

/** Whether a player's progress shows them done with round `round` (answered, out of time, or out of lives). */
export function isRoundDone(entry, round) {
  return Boolean(entry.finished) || entry.round > round || (entry.round === round && Boolean(entry.roundDone))
}

/**
 * Players to wait for in round `round`: those playing in sync (they report a `round`), unless they were out of lives
 * before it.
 */
export const playersInRound = (entries, round) =>
  entries.filter((entry) => entry.round != null && !(entry.finished && entry.round < round))

/**
 * When round `round` (started at `startAt`, server ms) hands over to the next one, in server ms:
 * REVEAL_MS after the last player in the round finished it, at the latest REVEAL_MS after its time is up.
 * `entries`: [{ round, roundDone, finished, lastSeen (server ms, null while the write is pending) }].
 */
export function nextRoundStart(entries, { round, startAt, timerMs }) {
  const deadline = startAt + (timerMs > 0 ? timerMs : SURVIVAL_MAX_WAIT_MS)
  const players = playersInRound(entries, round)
  const doneAt = players.map((entry) => (isRoundDone(entry, round) ? entry.lastSeen : null))
  const allDone = players.length > 0 && doneAt.every((time) => time != null)
  const end = allDone ? Math.min(deadline, Math.max(startAt, ...doneAt)) : deadline
  return end + SURVIVAL_REVEAL_MS
}

/** The furthest round another player already reached: { round, startAt }, to catch up after a reconnection. */
export function furthestRound(entries) {
  return entries.reduce(
    (best, entry) =>
      entry.round != null && entry.roundAt != null && (best == null || entry.round > best.round)
        ? { round: entry.round, startAt: entry.roundAt }
        : best,
    null
  )
}

/**
 * The round after which `playerId` is the last player left: every other player who played round by round is out
 * (`finished`), and this is the furthest round they reached. Null while someone else is still in the game, or when
 * nobody else played in sync. `entries` carry the player's `id`.
 */
export function lastSurvivorRound(entries, playerId) {
  const others = entries.filter((entry) => entry.id !== playerId && entry.round != null)
  if (others.length === 0 || !others.every((entry) => entry.finished)) return null
  return Math.max(...others.map((entry) => entry.round))
}

/** Whether another player who plays round by round is still in the game (a player out of lives can watch them). */
export const othersStillIn = (entries, playerId) =>
  entries.some((entry) => entry.id !== playerId && entry.round != null && !entry.finished)

/**
 * What a player out of lives sees of round `round`: every player who played round by round, those still in first
 * (most lives first), then the others by the round they went out on.
 * [{ id, pseudo, lives, out, outRound, answered }]: `answered`, done with round `round`; `outRound`, 0-based.
 */
export function spectatorRows(entries, names, round) {
  return entries
    .filter((entry) => entry.round != null)
    .map((entry) => ({
      id: entry.id,
      pseudo: names?.[entry.id] ?? '?',
      lives: entry.lives ?? 0,
      out: Boolean(entry.finished),
      outRound: entry.finished ? entry.round : null,
      answered: !entry.finished && isRoundDone(entry, round),
    }))
    .sort((a, b) => Number(a.out) - Number(b.out) || (a.out ? b.outRound - a.outRound : b.lives - a.lives))
}

/** How many of the players in the round are done with it: { done, total }. */
export function roundWaiting(entries, round) {
  const players = playersInRound(entries, round)
  return { done: players.filter((entry) => isRoundDone(entry, round)).length, total: players.length }
}
