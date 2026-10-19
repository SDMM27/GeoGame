// Profile decorations: a frame around the avatar and a color for the username, chosen by the player and shown on
// their profile and next to their name in the leaderboards. Shared by the website and the app.
// users/{uid}.decoration = { frame, color }: catalog ids, written by the player on their own document
// (firestore.rules: validDecoration). Like the badges, it is a courtesy: anything unknown reads as the default.
//
// Every item says how it is unlocked: `starter` items from the start, `level` items at a player level (XP, see
// missions.js); flag fragments (step 6 of docs/plan-fonctionnalites.md) will add more kinds. firestore.rules keeps
// the level of each `level` item (decorationLevel) and refuses a locked one; a test checks both lists match.
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { cachedPublicData, fetchPublicData, patchPublicData } from './publicProfile'

const STARTER = { kind: 'starter' }
const atLevel = (level) => ({ kind: 'level', level })

// `style`: solid, dashed or double (the app draws double as a thicker solid line).
export const FRAMES = [
  { id: 'none', unlock: STARTER },
  { id: 'silver', color: '#C0C7D0', style: 'solid', unlock: STARTER },
  { id: 'gold', color: '#F5B83D', style: 'double', unlock: STARTER },
  { id: 'ocean', color: '#5FD4F4', style: 'solid', unlock: STARTER },
  { id: 'jungle', color: '#3DDC97', style: 'dashed', unlock: STARTER },
  { id: 'volcano', color: '#FF7A6B', style: 'double', unlock: STARTER },
  { id: 'sunrise', color: '#FFB86B', style: 'dashed', unlock: atLevel(3) },
  { id: 'glacier', color: '#A8E6FF', style: 'double', unlock: atLevel(6) },
  { id: 'amethyst', color: '#B57BFF', style: 'double', unlock: atLevel(10) },
  { id: 'ruby', color: '#FF4D6D', style: 'double', unlock: atLevel(15) },
  { id: 'emerald', color: '#1FD18B', style: 'double', unlock: atLevel(20) },
  { id: 'crown', color: '#FFE066', style: 'double', unlock: atLevel(30) },
]

// `value` null: the usual text color.
export const NAME_COLORS = [
  { id: 'default', value: null, unlock: STARTER },
  { id: 'mint', value: '#3DDC97', unlock: STARTER },
  { id: 'sky', value: '#7AA2FF', unlock: STARTER },
  { id: 'coral', value: '#FF7A6B', unlock: STARTER },
  { id: 'amber', value: '#F5B83D', unlock: STARTER },
  { id: 'lilac', value: '#C792FF', unlock: STARTER },
  { id: 'rose', value: '#FF9EC7', unlock: STARTER },
  { id: 'lime', value: '#B4E05A', unlock: atLevel(2) },
  { id: 'peach', value: '#FFB38A', unlock: atLevel(4) },
  { id: 'turquoise', value: '#2EE6D6', unlock: atLevel(8) },
  { id: 'violet', value: '#9D7BFF', unlock: atLevel(12) },
  { id: 'crimson', value: '#FF4D6D', unlock: atLevel(18) },
  { id: 'gilded', value: '#FFD447', unlock: atLevel(25) },
]

export const DEFAULT_DECORATION = { frame: 'none', color: 'default' }

const FRAMES_BY_ID = Object.fromEntries(FRAMES.map((item) => [item.id, item]))
const COLORS_BY_ID = Object.fromEntries(NAME_COLORS.map((item) => [item.id, item]))

// Whether the player may pick `item`. `progress`: { level } (readXp in missions.js), fragments later (step 6).
export function isUnlocked(item, progress = {}) {
  switch (item.unlock?.kind) {
    case 'starter':
      return true
    case 'level':
      return (progress.level ?? 0) >= item.unlock.level
    default:
      return false
  }
}

// The ids stored on a users/{uid} document, cleaned up: unknown or malformed ids fall back to the default.
export function readDecoration(data) {
  const raw = data?.decoration
  return {
    frame: typeof raw?.frame === 'string' && FRAMES_BY_ID[raw.frame] ? raw.frame : DEFAULT_DECORATION.frame,
    color: typeof raw?.color === 'string' && COLORS_BY_ID[raw.color] ? raw.color : DEFAULT_DECORATION.color,
  }
}

// What to draw for a decoration ({ frame, color } ids): { frame: { color, style } | null, nameColor: '#hex' | null }.
export function decorationStyle(decoration) {
  const frame = FRAMES_BY_ID[decoration?.frame]
  return {
    frame: frame?.color ? { color: frame.color, style: frame.style } : null,
    nameColor: COLORS_BY_ID[decoration?.color]?.value ?? null,
  }
}

export const isDefaultDecoration = (decoration) =>
  decoration?.frame === DEFAULT_DECORATION.frame && decoration?.color === DEFAULT_DECORATION.color

// Saves the player's choice on their own document. Throws on a locked or unknown item, or when the write fails.
export async function saveDecoration(uid, decoration, progress = {}) {
  const frame = FRAMES_BY_ID[decoration.frame]
  const color = COLORS_BY_ID[decoration.color]
  if (!frame || !color || !isUnlocked(frame, progress) || !isUnlocked(color, progress)) {
    throw new Error('locked decoration')
  }
  const value = { frame: frame.id, color: color.id }
  await updateDoc(doc(firestore, 'users', uid), { decoration: value })
  patchPublicData(uid, { decoration: value })
  return value
}

// The decoration of one account (the default for a visitor or when it can't be read).
export async function fetchDecoration(uid) {
  return readDecoration(await fetchPublicData(uid))
}

// Same, from the cache only: null when the account wasn't read recently.
export function cachedDecoration(uid) {
  const data = cachedPublicData(uid)
  return data ? readDecoration(data) : null
}
