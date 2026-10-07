// Single-game multiplayer rooms, stored in the website's `rooms` collection.
// A room holds one game. 'live': everyone starts together after the host launches it.
// 'challenge': anyone with the code plays the same game whenever they want.
// A live room keeps accepting players once launched, so it also works as a challenge afterwards.
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'

import { firestore } from '@shared/Firebase'
import { generateRoomId } from '@shared/utils/multiplayerRoom'

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
}

// `uid`: the player's account, when signed in.
export type RoomPlayer = { pseudo: string; uid?: string }

export type Room = {
  id: string
  source: 'app'
  hostId: string
  mode: RoomMode
  status: 'lobby' | 'playing'
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

export type PlayerResult = GameResult & { playerId: string; pseudo: string }

export type PlayerProgress = { found: number; total: number; finished: boolean }

const PLAYER_ID_KEY = 'mp_player_id'
const PSEUDO_KEY = 'geogame_pseudo'
const RECENT_KEY = 'geogame_recent_rooms'
const MAX_RECENT = 8
// Live countdown, so that every player gets the launch before the game starts.
const LAUNCH_DELAY_MS = 5000

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

const roomPlayer = (pseudo: string, uid?: string | null): RoomPlayer => (uid ? { pseudo, uid } : { pseudo })

export async function createRoom({ game, mode, pseudo, uid }: { game: RoomGame; mode: RoomMode; pseudo: string; uid?: string | null }) {
  const hostId = getPlayerId()
  savePseudo(pseudo)
  let code = generateRoomId()
  while ((await getDoc(roomRef(code))).exists()) code = generateRoomId()
  const room: Omit<Room, 'id'> = {
    source: 'app',
    hostId,
    mode,
    status: mode === 'live' ? 'lobby' : 'playing',
    game,
    seed: Math.floor(Math.random() * 2 ** 31),
    startAt: null,
    players: { [hostId]: roomPlayer(pseudo, uid) },
  }
  await setDoc(roomRef(code), { ...room, createdAt: serverTimestamp() })
  rememberRoom({ id: code, mode, game })
  return code
}

export async function joinRoom(room: Room, pseudo: string, uid?: string | null) {
  savePseudo(pseudo)
  await updateDoc(roomRef(room.id), { [`players.${getPlayerId()}`]: roomPlayer(pseudo, uid) })
  rememberRoom(room)
}

export async function launchRoom(code: string) {
  await updateDoc(roomRef(code), {
    status: 'playing',
    startAt: Timestamp.fromDate(new Date(Date.now() + LAUNCH_DELAY_MS)),
  })
}

export async function reportProgress(code: string, progress: PlayerProgress) {
  await setDoc(doc(firestore, 'rooms', code, 'progress', getPlayerId()), { ...progress, lastSeen: serverTimestamp() }, { merge: true })
}

export async function submitResult(code: string, pseudo: string, result: GameResult) {
  const playerId = getPlayerId()
  await setDoc(doc(firestore, 'rooms', code, 'gameResults', `0_${playerId}`), {
    playerId,
    pseudo,
    gameIndex: 0,
    ...result,
    finishedAt: serverTimestamp(),
  })
}
