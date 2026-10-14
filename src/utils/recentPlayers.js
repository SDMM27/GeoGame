// The accounts met in multiplayer rooms lately, to suggest them as friends. Kept on the device only
// (same storage as the recent rooms): [{ uid, name, at }], newest first.
const RECENT_KEY = 'geogame_recent_players'
export const MAX_RECENT_PLAYERS = 20

export function getRecentPlayers() {
  try {
    const list = JSON.parse(globalThis.localStorage?.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((item) => item && typeof item.uid === 'string' && typeof item.name === 'string') : []
  } catch {
    return []
  }
}

// `players`: a room's players ({ [playerId]: { pseudo, uid? } }). Visitors (no uid) and `selfUid` are left out.
export function rememberPlayers(players, selfUid) {
  const met = []
  const seen = new Set()
  for (const player of Object.values(players ?? {})) {
    if (!player?.uid || player.uid === selfUid || seen.has(player.uid)) continue
    seen.add(player.uid)
    met.push({ uid: player.uid, name: String(player.pseudo ?? '').slice(0, 40), at: Date.now() })
  }
  if (met.length === 0) return
  try {
    const others = getRecentPlayers().filter((item) => !seen.has(item.uid))
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify([...met, ...others].slice(0, MAX_RECENT_PLAYERS)))
  } catch {
    // Storage unavailable: the suggestions are only a shortcut.
  }
}
