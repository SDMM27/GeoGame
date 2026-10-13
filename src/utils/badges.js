// Public badges of a player, so that others see their level at a glance (in a room, on a profile).
// Shared by the website and the app. users/{uid}.badges = { top: [achievement id, up to 3], count }:
// the highest tiers the player unlocked (see achievements.js). The summary is computed on the player's own
// device from their history and written there (firestore.rules: only the owner, only `badges`), so it is a
// courtesy and not proof of anything.
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { ACHIEVEMENTS, computeAchievements } from './achievements'
import { fetchGames } from './gameHistory'
import { computeStats } from './profileStats'

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

// Writes the summary on the player's own document when it changed.
export async function syncBadges(uid, achievements) {
  const summary = badgeSummary(achievements)
  try {
    const ref = doc(firestore, 'users', uid)
    const snapshot = await getDoc(ref)
    if (!snapshot.exists() || sameSummary(summary, snapshot.data().badges)) return
    await updateDoc(ref, { badges: summary })
    cache.set(uid, { at: Date.now(), value: readBadges({ badges: summary }) })
  } catch (error) {
    // Badges are a bonus: never get in the way of the profile or of a game.
    console.warn('[badges]', error?.code, error)
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

const CACHE_FOR = 10 * 60 * 1000
const cache = new Map()
const pending = new Map()

// The badges of one account (cached for a few minutes); nothing for a visitor or when they can't be read.
export async function fetchBadges(uid) {
  const cached = cache.get(uid)
  if (cached && Date.now() - cached.at < CACHE_FOR) return cached.value
  if (!pending.has(uid)) {
    pending.set(
      uid,
      getDoc(doc(firestore, 'users', uid))
        .then((snapshot) => readBadges(snapshot.data()))
        .catch(() => ({ top: [], count: 0 }))
        .then((value) => {
          cache.set(uid, { at: Date.now(), value })
          pending.delete(uid)
          return value
        })
    )
  }
  return pending.get(uid)
}
