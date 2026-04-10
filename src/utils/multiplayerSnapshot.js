// src/utils/multiplayerSnapshot.js
// Persists multiplayer game state in localStorage so players can refresh without losing progress.

const EXPIRY_MS = 2 * 60 * 60 * 1000 // 2 hours

export function snapshotKey(roomId, playerId, gameIndex) {
  return `mp_snap_${roomId}_${playerId}_${gameIndex}`
}

export function saveSnapshot(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage full or disabled — silently ignore, game continues
  }
}

export function loadSnapshot(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.savedAt) return null
    if (Date.now() - data.savedAt > EXPIRY_MS) {
      localStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearSnapshot(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // silently ignore
  }
}
