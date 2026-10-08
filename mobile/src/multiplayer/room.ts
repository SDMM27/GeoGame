// Multiplayer rooms, shared with the website (src/utils/multiplayerRoom.js holds the format and the Firestore writes).
// A room holds one game. 'live': everyone starts together after the host launches it.
// 'challenge': anyone with the code plays the same game whenever they want.
// A live room keeps accepting players once launched, so it also works as a challenge afterwards.
import { doc, getDoc, type Timestamp } from 'firebase/firestore'

import { firestore } from '@shared/Firebase'
import * as shared from '@shared/utils/multiplayerRoom'

import type { GameId } from '@/games'

export type RoomMode = 'live' | 'challenge'

export type RoomGame = {
  id: GameId
  // Shared GAME_TYPES value (seeding, scoring)
  type: string
  difficulty?: string | null
  continent?: string | null
  phases?: Record<string, number> | null
  presetName?: string | null
  // Border Guess / Country Clue: number of countries. Quiz: number of questions.
  count?: number
  // Quiz only
  quizDifficulty?: string
  answerMode?: 'choices' | 'free'
  // Survival only: the games of the rounds ('FLAGS+QUIZ', see survivalModesKey) and the lives
  modes?: string
  lives?: number
}

// `uid`: the player's account, when signed in. `seenAt`: lobby heartbeat.
export type RoomPlayer = { pseudo: string; uid?: string; seenAt?: Timestamp }

export type Room = {
  id: string
  // Format marker, on every room, wherever it was created
  source: 'app' | 'app2'
  createdOn?: 'web' | 'app'
  hostId: string
  mode: RoomMode
  status: 'lobby' | 'playing'
  // Games in a row (missing on the first rooms, which hold `game` only); read them with roomGames()
  games?: RoomGame[]
  // The live game being played
  gameIndex?: number
  // Current game, for app versions that only know one game. A view from roomForGame() holds the game being played.
  game: RoomGame
  seed: number
  startAt: Timestamp | null
  players: Record<string, RoomPlayer>
}

// What a player reports at the end of the game. Same fields as the website's gameResults.
export type GameResult = {
  weightedScore: number
  countriesSolved: number
  attempts: number
  elapsedTime: number
  total: number
}

export type PlayerResult = GameResult & { playerId: string; pseudo: string; gameIndex?: number }

// `lives`: survival only, the lives left
export type PlayerProgress = { gameIndex: number; found: number; total: number; finished: boolean; lives?: number }

const PLAYER_ID_KEY = 'mp_player_id'
const PSEUDO_KEY = 'geogame_pseudo'
const RECENT_KEY = 'geogame_recent_rooms'
const MAX_RECENT = 8

export const roomRef = (code: string) => doc(firestore, 'rooms', code)

export function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export function getPlayerId() {
  let id = globalThis.localStorage?.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
    globalThis.localStorage?.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export function getSavedPseudo() {
  return globalThis.localStorage?.getItem(PSEUDO_KEY) ?? ''
}

function savePseudo(pseudo: string) {
  globalThis.localStorage?.setItem(PSEUDO_KEY, pseudo)
}

// ─── Recent rooms (to come back to a challenge's standings) ────────────────

export type RecentRoom = { code: string; gameId: GameId; mode: RoomMode; at: number }

export function getRecentRooms(): RecentRoom[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function rememberRoom(room: Pick<Room, 'id' | 'mode' | 'game'>) {
  const others = getRecentRooms().filter((recent) => recent.code !== room.id)
  const next = [{ code: room.id, gameId: room.game.id, mode: room.mode, at: Date.now() }, ...others].slice(0, MAX_RECENT)
  globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(next))
}

// ─── Firestore ─────────────────────────────────────────────────────────────

export async function createRoom({ game, mode, pseudo, uid }: { game: RoomGame; mode: RoomMode; pseudo: string; uid?: string | null }) {
  savePseudo(pseudo)
  const code: string = await shared.createRoom({ games: [game], mode, hostId: getPlayerId(), pseudo, uid, createdOn: 'app' })
  rememberRoom({ id: code, mode, game })
  return code
}

export async function joinRoom(room: Room, pseudo: string, uid?: string | null) {
  savePseudo(pseudo)
  await shared.joinRoom(room.id, getPlayerId(), pseudo, uid)
  rememberRoom(room)
}

export async function launchRoom(code: string) {
  await shared.launchRoom(code, getPlayerId())
}

export async function launchNextGame(room: Room) {
  await shared.launchNextGame(room, getPlayerId())
}

// Host: adds a game at the end of the room
export async function addGameToRoom(code: string, game: RoomGame) {
  const snap = await getDoc(roomRef(code))
  if (!snap.exists()) throw new Error('Room not found')
  await shared.addGame({ id: code, ...snap.data() }, game, getPlayerId())
}

export async function reportProgress(code: string, progress: PlayerProgress) {
  await shared.reportProgress(code, getPlayerId(), progress)
}

export async function submitResult(code: string, gameIndex: number, pseudo: string, result: GameResult) {
  await shared.submitResult(code, getPlayerId(), pseudo, result, gameIndex)
}
