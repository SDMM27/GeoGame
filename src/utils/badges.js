// Public badges of a player, so that others see their level at a glance (in a room, on a profile).
// Shared by the website and the app. users/{uid}.badges = { top: [achievement id, up to 3], count }:
// the highest tiers the player unlocked (see achievements.js). The summary is computed on the player's own
// device from their history and written there (firestore.rules: only the owner, only `badges` and `challenges`), so it is a
// courtesy and not proof of anything.
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { ACHIEVEMENTS, computeAchievements, unlockedStickyIds, withRemembered } from './achievements'
import { fetchGames } from './gameHistory'
import { computeStats } from './profileStats'
import { fetchPublicData, patchPublicData } from './publicProfile'

export const BADGES_SHOWN = 3
const KNOWN_IDS = new Set(ACHIEVEMENTS.map((achievement) => achievement.id))
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]))

// { top: [ids], count } from computeAchievements(): the best unlocked badges (it sorts them by tier).
// 'friend' is left out: it depends on data that another player's profile can't read.
export function badgeSummary(achievements) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked && achievement.id !== 'friend')
  return { top: unlocked.slice(0, BADGES_SHOWN).map((achievement) => achievement.id), count: unlocked.length }
}

// What a users/{uid} document holds, cleaned up: [{ id, tier, emoji, icon }] best first, and the total.
export function readBadges(data) {
  const raw = data?.badges
  if (!raw || !Array.isArray(raw.top)) return { top: [], count: 0 }
  const top = raw.top
    .filter((id) => KNOWN_IDS.has(id))
    .map((id) => BY_ID[id])
    .slice(0, BADGES_SHOWN)
    .map(({ id, tier, emoji, icon }) => ({ id, tier, emoji, icon }))
  return { top, count: Number.isFinite(raw.count) ? raw.count : top.length }
}

const sameSummary = (a, b) =>
  Array.isArray(b?.top) && a.count === b.count && a.top.length === b.top.length && a.top.every((id, index) => id === b.top[index])

export const MAX_CHALLENGES = 20

// users/{uid}.challenges: the sticky achievements (challenges) the player unlocked, kept even when the games that
// unlocked them leave the capped history. Anything unknown or malformed is dropped.
export function readChallenges(data) {
  const raw = data?.challenges
  return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string' && KNOWN_IDS.has(id)).slice(0, MAX_CHALLENGES) : []
}

const sameList = (a, b) => Array.isArray(b) && a.length === b.length && a.every((id, index) => id === b[index])

// Writes the badge summary and the unlocked challenges on the player's own document when they changed.
export async function syncBadges(uid, achievements) {
  try {
    const ref = doc(firestore, 'users', uid)
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) return
    const data = snapshot.data()
    const stored = readChallenges(data)
    const merged = [...new Set([...stored, ...unlockedStickyIds(achievements)])].slice(0, MAX_CHALLENGES)
    const summary = badgeSummary(withRemembered(achievements, merged))
    const changes = {}
    if (!sameSummary(summary, data.badges)) changes.badges = summary
    if (!sameList(merged, data.challenges)) changes.challenges = merged
    if (Object.keys(changes).length === 0) return
    await updateDoc(ref, changes)
    if (changes.badges) patchPublicData(uid, { badges: summary })
  } catch (error) {
    // Badges are a bonus: never get in the way of the profile or of a game.
    console.warn('[badges]', error?.code, error)
  }
}

// The challenges the signed-in player unlocked before (empty when they can't be read).
export async function fetchChallenges(uid) {
  try {
    const snapshot = await getDoc(doc(firestore, 'users', uid))
    return readChallenges(snapshot.data())
  } catch {
    return []
  }
}

const REFRESH_EVERY = 30 * 60 * 1000
let lastRefresh = 0

// After a game: recompute from the history and sync, at most every 30 minutes (it reads the whole history).
export async function refreshOwnBadges(uid) {
  if (Date.now() - lastRefresh < REFRESH_EVERY) return
  lastRefresh = Date.now()
  try {
    const games = await fetchGames(uid)
    await syncBadges(uid, computeAchievements({ stats: computeStats(games), games }))
  } catch (error) {
    lastRefresh = 0
    console.warn('[badges]', error?.code, error)
  }
}

// The badges of one account (cached for a few minutes, see publicProfile.js); nothing for a visitor or when they can't be read.
export async function fetchBadges(uid) {
  return readBadges(await fetchPublicData(uid))
}
