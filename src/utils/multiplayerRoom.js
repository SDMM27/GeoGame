// src/utils/multiplayerRoom.js
// Multiplayer rooms, shared by the website and the mobile app: one or more games in a row.
// 'live': everyone starts each game together when the host launches it.
// 'challenge': everyone plays the games in order, whenever they want.
// A live room keeps accepting players once launched, so it also works as a challenge afterwards.
//
// Room document (rooms/{code}):
//   source: 'app'            the format marker (older app versions only open rooms carrying it)
//   createdOn: 'web' | 'app' where the room was created (missing on the first app rooms)
//   hostId, mode, status: 'lobby' | 'playing', seed, startAt (start of the current live game)
//   games: [game, …]         missing on the first rooms, which hold `game` only
//   gameIndex                the live game being played (0 in a challenge)
//   game                     copy of games[gameIndex], for app versions that only know one game
//   players: { [playerId]: { pseudo, uid?, seenAt? } }   seenAt: lobby heartbeat, to hand the host role over
// Subcollections: progress/{playerId} { gameIndex, found, total, finished },
// gameResults/{gameIndex}_{playerId}.
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import countries from '../data/countriesWithDifficulty_FR.json'
import { GAME_TYPES } from './gameTypes'
import {
  getSeededAscensionOverrides,
  getSeededBorderGuessCountries,
  getSeededCapitalCountries,
  getSeededCountryClueCountries,
  getSeededFlagCountries,
  getSeededPlacementCountries,
} from './multiplayerSeed'
import { rankResults } from './multiplayerScoring'
import { seededShuffle } from './prng'

export const ROOM_FORMAT = 'app'
export const isRoomFormat = (room) => room?.source === ROOM_FORMAT

// Live countdown, so that every player gets the launch before the game starts.
const LAUNCH_DELAY_MS = 5000
// Lobby heartbeat; a host silent for HOST_GONE_MS hands the room to the next player. Generous, since a phone
// suspends the page while its player shares the code in another app.
export const HEARTBEAT_MS = 15000
export const HOST_GONE_MS = 120000

/** Readable 6-character room code (no O/0/I/1). */
export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/** Stable id per browser, kept in localStorage (shared across tabs). */
export function getOrCreatePlayerId() {
  let id = localStorage.getItem('mp_player_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('mp_player_id', id)
  }
  return id
}

// ─── Games of a room ───────────────────────────────────────────────────────

export const roomGames = (room) => (room.games?.length ? room.games : [room.game])
export const currentGameIndex = (room) => room.gameIndex ?? 0
const indexOf = (doc) => doc?.gameIndex ?? 0

/**
 * The room as seen by game `index`: its `game` and its own `seed` (the room's seed for the first game, so that
 * rooms from before multi-game rooms keep their countries). Players of a game draw its content from this view.
 */
export function roomForGame(room, index) {
  const seed = index === 0 ? room.seed : ((room.seed * 31 + index * 1000003) >>> 0)
  return { ...room, game: roomGames(room)[index], gameIndex: index, seed }
}

/** `results`: the room's gameResults as an array. */
export const resultsForGame = (results, index) => results.filter((result) => indexOf(result) === index)

/** `progress`: { [playerId]: progress } → only the players' progress in game `index`. */
export const progressForGame = (progress, index) =>
  Object.fromEntries(Object.entries(progress).filter(([, entry]) => indexOf(entry) === index))

/**
 * The game the player can play now, or null: in a live room the launched game if they did not play it yet;
 * in a challenge the first game they did not play.
 */
export function nextGameToPlay(room, results, playerId) {
  const played = new Set(results.filter((result) => result.playerId === playerId).map(indexOf))
  if (room.mode === 'live') {
    const index = currentGameIndex(room)
    return room.status === 'playing' && !played.has(index) ? index : null
  }
  const index = roomGames(room).findIndex((_, i) => !played.has(i))
  return index === -1 ? null : index
}

/**
 * Standings over every game: each game gives its players points by rank (n points for the first of n players),
 * summed. [{ playerId, pseudo, points, played, rank }], best first.
 */
export function overallStandings(room, results) {
  const totals = {}
  roomGames(room).forEach((game, index) => {
    const gameResults = resultsForGame(results, index)
    rankResults(gameResults, gameResults.length, roomScoringMode(game)).forEach(({ playerId, pseudo, points }) => {
      const total = (totals[playerId] ??= { playerId, pseudo, points: 0, played: 0 })
      total.points += points
      total.played += 1
    })
  })
  const sorted = Object.values(totals).sort((a, b) => b.points - a.points || b.played - a.played)
  return sorted.map((total) => ({ ...total, rank: 1 + sorted.findIndex((other) => other.points === total.points && other.played === total.played) }))
}

// ─── Content and ranking ───────────────────────────────────────────────────

const SETUP_TYPES = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]

// Same pools as the solo continent mode of each game
function continentPool(type, continent) {
  const features = countries.features.filter((c) => c.properties.continent === continent)
  if (type === GAME_TYPES.PLACEMENT) return features.map((c) => c.properties.ADMIN)
  if (type === GAME_TYPES.CAPITALS) return features.filter((c) => c.properties.ISO_A2 && c.properties.capital)
  return features.filter((c) => c.properties.ISO_A2)
}

/**
 * What every player of a room gets: the same countries in the same order, drawn from the room's seed.
 * `list`: Placement / Flags / Capitals (standard or continent), Border Guess, Country Clue.
 * `byDifficulty`: Ascension. Quiz: neither, the questions are drawn by useQuizState from the seed.
 */
export function getRoomContent(game, seed) {
  if (SETUP_TYPES.includes(game.type)) {
    if (game.phases) {
      const byDifficulty = getSeededAscensionOverrides(game.phases, game.type, seed, 0)
      const total = Object.values(byDifficulty).reduce((sum, list) => sum + list.length, 0)
      return { list: null, byDifficulty, total }
    }
    const list = game.continent
      ? seededShuffle(continentPool(game.type, game.continent), seed)
      : game.type === GAME_TYPES.PLACEMENT
        ? getSeededPlacementCountries(game.difficulty, seed, 0)
        : game.type === GAME_TYPES.FLAGS
          ? getSeededFlagCountries(game.difficulty, seed, 0)
          : getSeededCapitalCountries(game.difficulty, seed, 0)
    return { list, byDifficulty: null, total: list.length }
  }
  if (game.type === GAME_TYPES.BORDER_GUESS || game.type === GAME_TYPES.COUNTRY_CLUE) {
    const pick = game.type === GAME_TYPES.BORDER_GUESS ? getSeededBorderGuessCountries : getSeededCountryClueCountries
    const list = pick(game.count ?? 10, seed, 0)
    return { list, byDifficulty: null, total: list.length }
  }
  return { list: null, byDifficulty: null, total: game.count ?? 10 }
}

// Border Guess / Country Clue rank on countries found, then attempts, then time; the others on score, then time.
export function roomScoringMode(game) {
  return game.type === GAME_TYPES.BORDER_GUESS || game.type === GAME_TYPES.COUNTRY_CLUE ? 'solved' : 'weighted'
}

export function rankRoomResults(game, results) {
  return rankResults(results, results.length, roomScoringMode(game))
}

// ─── Host hand-over ────────────────────────────────────────────────────────

const millis = (value) => (value?.toMillis ? value.toMillis() : null)

/**
 * In a live lobby whose host stopped sending heartbeats, the player who takes over: the one with the smallest id
 * among those seen recently, so every client agrees. null when nothing has to change.
 * A host with no heartbeat at all (an app version without it) is never replaced.
 */
export function pickNewHost(room, now) {
  if (room?.status !== 'lobby') return null
  const host = room.players?.[room.hostId]
  const hostSeen = millis(host?.seenAt)
  if (host && (hostSeen == null || now - hostSeen < HOST_GONE_MS)) return null
  const active = Object.entries(room.players ?? {})
    .filter(([id, player]) => id !== room.hostId && now - (millis(player.seenAt) ?? -Infinity) < HOST_GONE_MS)
    .map(([id]) => id)
    .sort()
  return active[0] ?? null
}

// ─── Firestore ─────────────────────────────────────────────────────────────

const roomRef = (code) => doc(firestore, 'rooms', code)
const roomPlayer = (pseudo, uid) => (uid ? { pseudo, uid } : { pseudo })

/**
 * Creates a room and returns its code.
 * Each game: { id, type, difficulty?, continent?, phases?, presetName?, count?, quizDifficulty?, answerMode? }
 */
export async function createRoom({ games, mode, hostId, pseudo, uid, createdOn }) {
  let code = generateRoomId()
  while ((await getDoc(roomRef(code))).exists()) code = generateRoomId()
  await setDoc(roomRef(code), {
    source: ROOM_FORMAT,
    createdOn,
    hostId,
    mode,
    status: mode === 'live' ? 'lobby' : 'playing',
    games,
    gameIndex: 0,
    game: games[0],
    seed: Math.floor(Math.random() * 2 ** 31),
    startAt: null,
    players: { [hostId]: roomPlayer(pseudo, uid) },
    createdAt: serverTimestamp(),
  })
  return code
}

export async function joinRoom(code, playerId, pseudo, uid) {
  await updateDoc(roomRef(code), { [`players.${playerId}`]: roomPlayer(pseudo, uid) })
}

export async function launchRoom(code) {
  await updateDoc(roomRef(code), {
    status: 'playing',
    startAt: Timestamp.fromDate(new Date(Date.now() + LAUNCH_DELAY_MS)),
  })
}

/** Live: the host launches the next game. */
export async function launchNextGame(room) {
  const index = currentGameIndex(room) + 1
  await updateDoc(roomRef(room.id), {
    gameIndex: index,
    game: roomGames(room)[index],
    status: 'playing',
    startAt: Timestamp.fromDate(new Date(Date.now() + LAUNCH_DELAY_MS)),
  })
}

/** The host adds a game at the end of the room. */
export async function addGame(room, game) {
  await updateDoc(roomRef(room.id), { games: [...roomGames(room), game] })
}

/** Lobby heartbeat of a player who already joined. */
export async function touchPlayer(code, playerId) {
  await updateDoc(roomRef(code), { [`players.${playerId}.seenAt`]: serverTimestamp() })
}

export async function transferHost(code, newHostId) {
  await updateDoc(roomRef(code), { hostId: newHostId })
}

/** `progress`: { gameIndex, found, total, finished } */
export async function reportProgress(code, playerId, progress) {
  await setDoc(doc(firestore, 'rooms', code, 'progress', playerId), { ...progress, lastSeen: serverTimestamp() }, { merge: true })
}

/** `result`: { weightedScore, countriesSolved, attempts, elapsedTime, total } */
export async function submitResult(code, playerId, pseudo, result, gameIndex = 0) {
  await setDoc(doc(firestore, 'rooms', code, 'gameResults', `${gameIndex}_${playerId}`), {
    playerId,
    pseudo,
    gameIndex,
    ...result,
    finishedAt: serverTimestamp(),
  })
}
