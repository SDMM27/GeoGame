// Elo ratings (src/utils/eloRating.js holds the math and the data model). Called by POST /api/elo for the signed-in
// player; the server alone writes:
//   elo/{uid}                                      the player's ratings in their last season (public)
//   eloQuestions/{mode}_{country}                  each country's rating per solo mode
//   eloGains/{uid}_{season}_{mode}_{country}       { won }: the player answered that country this season (won: found)
//   eloDuels/{room}_{gameIndex}                    a duel already rated (or refused), so it counts once
//   eloDuelPairs/{uidA}_{uidB}_{day}               rated duels between two accounts on a day (Paris), DUEL_PAIR_DAILY_LIMIT at most
//   eloDuelAccounts/{uid}_{day}                    rated duels of an account on a day, DUEL_ACCOUNT_DAILY_LIMIT at most
//   mastery/{uid}                                  countries found at the first try per mode, for good (public, see below)
// The bookkeeping (eloGains, eloDuels, eloDuelPairs, eloDuelAccounts) carries `at` (ms) for the daily cleanup
// (cleanupExpired.mjs).
//
// mastery/{uid} = { placement: [ADMIN names], flags: [...], hardcore: [...], updatedAt }: the countries found at the first
// try (found, no error) in Placement and Flags, forever (flagCollection.js, for the "Légende" badge). 'hardcore' is
// reserved for the no-borders mode: nothing writes it yet. Like Elo, the answers are reported by the client, so the
// badge is as honest as Elo.
//
// Solo answers are reported by the client, so they can be made up; what bounds a cheater is that a country pays once
// per mode and season, and only gains (never losses) exist in solo. Duels are read from the room's gameResults, which
// only each player can write (proved by their secret, see firestore.rules), between two accounts the rules tie to
// the players' own uid. A player can still inflate their own result: what bounds it is that results must be plausible
// (plausibleResults), accounts younger than MIN_DUEL_ACCOUNT_AGE_MS are not rated, and the daily caps per pair and per
// account limit farming with other accounts.
import countriesMeta from '../../src/data/countries.meta.json' with { type: 'json' }
import { MASTERY_MODES } from '../../src/utils/flagCollection.js'
import { rankResults } from '../../src/utils/multiplayerScoring.js'
import { GAME_TYPES } from '../../src/utils/gameTypes.js'
import {
  ELO_MODES,
  QUESTION_START,
  difficultyField,
  duelResult,
  ratingOf,
  ratingsForSeason,
  seasonKeyAt,
  soloResult,
} from '../../src/utils/eloRating.js'

export const MAX_RESULTS = 50
export const MAX_ERRORS = 1000
export const DUEL_PAIR_DAILY_LIMIT = 3
export const DUEL_ACCOUNT_DAILY_LIMIT = 20
export const MIN_DUEL_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000
// Most points a country gives in Placement, Flags and Capitals (SCORE_TABLE in src/utils/scoringRules.js).
const MAX_POINTS_PER_COUNTRY = 9
const SCORE_TABLE_GAMES = ['PLACEMENT', 'FLAGS', 'CAPITALS']

const reply = (status, body) => ({ status, body })

// properties of each country, by its ADMIN name (what the games use).
const COUNTRIES = new Map(countriesMeta.features.map(({ properties }) => [properties.ADMIN, properties]))

// Mastery key of the solo modes that have one.
const MASTERY_KEYS = { [GAME_TYPES.PLACEMENT]: 'placement', [GAME_TYPES.FLAGS]: 'flags' }

// A country name as a document id piece ('/' is the only character an id can't hold).
const countryKey = (name) => name.replace(/\//g, '_')

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })

async function verifiedUid(auth, idToken) {
  if (!idToken) return null
  try {
    return (await auth.verifyIdToken(idToken)).uid
  } catch {
    return null
  }
}

// The answers of a solo request, checked; null when malformed or when no country is known. One per country (the
// first one); a country missing from countries.meta.json is skipped rather than losing the whole batch.
export function parseResults(results) {
  if (!Array.isArray(results) || results.length === 0 || results.length > MAX_RESULTS) return null
  const seen = new Set()
  const parsed = []
  for (const result of results) {
    const { country, found, errors } = result ?? {}
    if (typeof country !== 'string' || country.length > 100) return null
    if (typeof found !== 'boolean' || !Number.isInteger(errors) || errors < 0 || errors > MAX_ERRORS) return null
    if (seen.has(country) || !COUNTRIES.has(country)) continue
    seen.add(country)
    parsed.push({ country, found, errors })
  }
  return parsed.length ? parsed : null
}

// elo/{uid} as it will be written: only what was played this season, `carry` for the rest.
function eloDoc({ uid, name, season, state, now }) {
  return {
    uid,
    name,
    season,
    ...(state.duel && { duel: state.duel }),
    solo: state.solo,
    carry: state.carry,
    updatedAt: now,
  }
}

// Moves `key` from carry to the played ratings of `state`.
function withoutCarry(carry, key) {
  const { [key]: _, ...rest } = carry
  return rest
}

/** Solo answers of one game mode. { season, mode, rating, gained } */
export async function rateSolo({ db, uid, name, mode, results, now = Date.now() }) {
  const season = seasonKeyAt(new Date(now))
  const field = difficultyField(mode)
  const eloRef = db.doc(`elo/${uid}`)
  const masteryRef = db.doc(`mastery/${uid}`)
  const items = results.map((result) => {
    const key = countryKey(result.country)
    return {
      ...result,
      start: QUESTION_START[COUNTRIES.get(result.country)[field]] ?? QUESTION_START.Moyen,
      gainRef: db.doc(`eloGains/${uid}_${season}_${mode}_${key}`),
      questionRef: db.doc(`eloQuestions/${mode}_${key}`),
    }
  })

  return db.runTransaction(async (transaction) => {
    const [eloSnap, masterySnap, ...snaps] = await transaction.getAll(
      eloRef,
      masteryRef,
      ...items.map((item) => item.gainRef),
      ...items.map((item) => item.questionRef)
    )
    const gains = snaps.slice(0, items.length)
    const questions = snaps.slice(items.length)
    const state = ratingsForSeason(eloSnap.exists ? eloSnap.data() : null, season)
    let rating = ratingOf(state, mode)
    let gained = 0
    let won = 0

    items.forEach((item, index) => {
      const marker = gains[index].exists ? gains[index].data() : null
      const question = questions[index].exists ? questions[index].data() : null
      const result = soloResult({
        rating,
        question: question?.rating ?? item.start,
        found: item.found,
        errors: item.errors,
        alreadyWon: Boolean(marker?.won),
        rateQuestion: !marker,
      })
      rating += result.gain
      gained += result.gain
      if (!marker) {
        transaction.set(item.questionRef, {
          mode,
          country: item.country,
          rating: result.question,
          answers: (question?.answers ?? 0) + 1,
        })
      }
      if (!marker || (item.found && !marker.won)) {
        transaction.set(item.gainRef, { uid, won: item.found || Boolean(marker?.won), at: now })
        if (item.found) won += 1
      }
    })

    const masteryKey = MASTERY_KEYS[mode]
    if (masteryKey) {
      const mastery = masterySnap.exists ? masterySnap.data() : {}
      const known = new Set(mastery[masteryKey] ?? [])
      const fresh = items.filter((item) => item.found && item.errors === 0 && !known.has(item.country)).map((item) => item.country)
      if (fresh.length > 0) {
        const next = Object.fromEntries(MASTERY_MODES.map((key) => [key, mastery[key] ?? []]))
        next[masteryKey] = [...next[masteryKey], ...fresh]
        transaction.set(masteryRef, { ...next, updatedAt: now })
      }
    }

    rating = Math.round(rating * 10) / 10
    gained = Math.round(gained * 10) / 10
    // Only a country won puts the mode on this season's leaderboard.
    if (won > 0) {
      const found = (state.solo[mode]?.found ?? 0) + won
      const next = { ...state, solo: { ...state.solo, [mode]: { rating, found } }, carry: withoutCarry(state.carry, mode) }
      transaction.set(eloRef, eloDoc({ uid, name, season, state: next, now }))
    }
    return { season, mode, rating, gained }
  })
}

// Border Guess / Country Clue rank on countries found, then attempts, then time; the others on score, then time
// (same as roomScoringMode in src/utils/multiplayerRoom.js, which needs the Firebase client).
const scoringMode = (game) => (game.type === 'BORDER_GUESS' || game.type === 'COUNTRY_CLUE' ? 'solved' : 'weighted')

// 1 when `a` beats `b`, 0.5 on a tie, 0 otherwise.
export function duelScore(game, a, b) {
  const sameRank = scoringMode(game) === 'solved'
    ? (a.countriesSolved ?? 0) === (b.countriesSolved ?? 0) && (a.attempts ?? 0) === (b.attempts ?? 0)
      && (a.elapsedTime ?? null) === (b.elapsedTime ?? null)
    : (a.weightedScore ?? 0) === (b.weightedScore ?? 0) && (a.elapsedTime ?? null) === (b.elapsedTime ?? null)
  if (sameRank) return 0.5
  const [first] = rankResults([a, b], 2, scoringMode(game))
  return first.playerId === a.playerId ? 1 : 0
}

const isCount = (value) => Number.isFinite(value) && value >= 0

/**
 * Whether the two results of a game could be real: same number of countries, no more found than that, a time, and
 * no more points than the countries can give.
 */
export function plausibleResults(game, a, b) {
  if (!Number.isInteger(a.total) || a.total < 1 || a.total !== b.total) return false
  return [a, b].every((result) =>
    isCount(result.countriesSolved) && result.countriesSolved <= result.total
    && isCount(result.weightedScore) && isCount(result.attempts)
    && Number.isFinite(result.elapsedTime) && result.elapsedTime > 0
    && (!SCORE_TABLE_GAMES.includes(game.type) || result.weightedScore <= result.total * MAX_POINTS_PER_COUNTRY))
}

// An account created over MIN_DUEL_ACCOUNT_AGE_MS ago (accounts from before createdAt count as old).
function oldEnough(user, now) {
  const createdAt = user.data().createdAt?.toMillis?.()
  return createdAt == null || now - createdAt >= MIN_DUEL_ACCOUNT_AGE_MS
}

/**
 * A finished game of a two-player room: { status: 'pending' } until both results are in, then the duel is rated once,
 * { status: 'rated', rating, delta } (the caller's), or { status: 'unrated', reason } when it can't count.
 */
export async function rateDuel({ db, uid, room: code, gameIndex, now = Date.now() }) {
  const roomSnap = await db.doc(`rooms/${code}`).get()
  if (!roomSnap.exists) return reply(404, { error: 'room_not_found' })
  const room = roomSnap.data()
  const game = (room.games?.length ? room.games : [room.game])[gameIndex]
  if (!game) return reply(404, { error: 'game_not_found' })
  const players = Object.entries(room.players ?? {})
  if (!players.some(([, player]) => player.uid === uid)) return reply(403, { error: 'not_in_room' })
  // Rooms from before the players' secrets (source 'app') let anyone write as anyone: never rated.
  if (room.source !== 'app2') return reply(200, { status: 'unrated', reason: 'legacy_room' })
  if (players.length !== 2) return reply(200, { status: 'unrated', reason: 'not_a_duel' })
  const [[idA, playerA], [idB, playerB]] = players
  if (!playerA.uid || !playerB.uid || playerA.uid === playerB.uid) return reply(200, { status: 'unrated', reason: 'not_signed_in' })

  const [resultA, resultB, userA, userB] = await Promise.all([
    db.doc(`rooms/${code}/gameResults/${gameIndex}_${idA}`).get(),
    db.doc(`rooms/${code}/gameResults/${gameIndex}_${idB}`).get(),
    db.doc(`users/${playerA.uid}`).get(),
    db.doc(`users/${playerB.uid}`).get(),
  ])
  if (!resultA.exists || !resultB.exists) return reply(200, { status: 'pending' })
  if (!userA.exists || !userB.exists) return reply(200, { status: 'unrated', reason: 'not_signed_in' })

  if (!oldEnough(userA, now) || !oldEnough(userB, now)) return reply(200, { status: 'unrated', reason: 'new_account' })
  const a = { ...resultA.data(), playerId: idA }
  const b = { ...resultB.data(), playerId: idB }
  if (!plausibleResults(game, a, b)) return reply(200, { status: 'unrated', reason: 'implausible' })

  const score = duelScore(game, a, b)
  const season = seasonKeyAt(new Date(now))
  const day = dayFormatter.format(new Date(now))
  const [low, high] = [playerA.uid, playerB.uid].sort()
  const duelRef = db.doc(`eloDuels/${code}_${gameIndex}`)
  const pairRef = db.doc(`eloDuelPairs/${low}_${high}_${day}`)
  const accountRefA = db.doc(`eloDuelAccounts/${playerA.uid}_${day}`)
  const accountRefB = db.doc(`eloDuelAccounts/${playerB.uid}_${day}`)
  const refA = db.doc(`elo/${playerA.uid}`)
  const refB = db.doc(`elo/${playerB.uid}`)

  return db.runTransaction(async (transaction) => {
    const [duelSnap, pairSnap, accountA, accountB, eloA, eloB] =
      await transaction.getAll(duelRef, pairRef, accountRefA, accountRefB, refA, refB)
    const mine = playerA.uid === uid ? 'a' : 'b'
    if (duelSnap.exists) {
      const done = duelSnap.data()
      return done.rated
        ? reply(200, { status: 'rated', rating: done[mine].rating, delta: done[mine].delta })
        : reply(200, { status: 'unrated', reason: done.reason })
    }
    const count = pairSnap.exists ? pairSnap.data().count : 0
    if (count >= DUEL_PAIR_DAILY_LIMIT) {
      transaction.set(duelRef, { rated: false, reason: 'pair_limit', at: now })
      return reply(200, { status: 'unrated', reason: 'pair_limit' })
    }
    const countA = accountA.exists ? accountA.data().count : 0
    const countB = accountB.exists ? accountB.data().count : 0
    if (countA >= DUEL_ACCOUNT_DAILY_LIMIT || countB >= DUEL_ACCOUNT_DAILY_LIMIT) {
      transaction.set(duelRef, { rated: false, reason: 'account_limit', at: now })
      return reply(200, { status: 'unrated', reason: 'account_limit' })
    }

    const stateA = ratingsForSeason(eloA.exists ? eloA.data() : null, season)
    const stateB = ratingsForSeason(eloB.exists ? eloB.data() : null, season)
    const before = { a: ratingOf(stateA, 'duel'), b: ratingOf(stateB, 'duel') }
    const after = duelResult(before.a, before.b, score)
    const nextDuel = (state, rating, win) => ({
      ...state,
      duel: { rating, games: (state.duel?.games ?? 0) + 1, wins: (state.duel?.wins ?? 0) + (win ? 1 : 0) },
      carry: withoutCarry(state.carry, 'duel'),
    })
    transaction.set(refA, eloDoc({ uid: playerA.uid, name: userA.data().username, season, state: nextDuel(stateA, after.a, score === 1), now }))
    transaction.set(refB, eloDoc({ uid: playerB.uid, name: userB.data().username, season, state: nextDuel(stateB, after.b, score === 0), now }))
    const outcome = {
      a: { uid: playerA.uid, rating: after.a, delta: Math.round((after.a - before.a) * 10) / 10 },
      b: { uid: playerB.uid, rating: after.b, delta: Math.round((after.b - before.b) * 10) / 10 },
    }
    transaction.set(duelRef, { rated: true, score, ...outcome, at: now })
    transaction.set(pairRef, { count: count + 1, at: now })
    transaction.set(accountRefA, { uid: playerA.uid, count: countA + 1, at: now })
    transaction.set(accountRefB, { uid: playerB.uid, count: countB + 1, at: now })
    return reply(200, { status: 'rated', rating: outcome[mine].rating, delta: outcome[mine].delta })
  })
}

const ROOM_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

/** POST /api/elo: { kind: 'solo', mode, results: [{ country, found, errors }] } or { kind: 'duel', room, gameIndex }. */
export async function handleElo({ db, auth, idToken, body, now = Date.now() }) {
  const uid = await verifiedUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthorized' })

  if (body?.kind === 'solo') {
    if (!ELO_MODES.includes(body.mode)) return reply(400, { error: 'bad_mode' })
    const results = parseResults(body.results)
    if (!results) return reply(400, { error: 'bad_results' })
    const user = await db.doc(`users/${uid}`).get()
    if (!user.exists || !user.data().username) return reply(403, { error: 'no_account' })
    return reply(200, await rateSolo({ db, uid, name: user.data().username, mode: body.mode, results, now }))
  }

  if (body?.kind === 'duel') {
    const { room, gameIndex } = body
    if (typeof room !== 'string' || !ROOM_CODE.test(room)) return reply(400, { error: 'bad_room' })
    if (!Number.isInteger(gameIndex) || gameIndex < 0 || gameIndex >= 20) return reply(400, { error: 'bad_game' })
    return rateDuel({ db, uid, room, gameIndex, now })
  }

  return reply(400, { error: 'bad_kind' })
}
