// The rooms this browser joined lately, for the Multi page (same format as the app's, mobile/src/multiplayer/room.ts).
// [{ code, gameId, mode, at }], newest first.
const RECENT_KEY = 'geogame_recent_rooms'
const MAX_RECENT = 8

export function getRecentRooms() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// `room`: { id, mode, game: { id } }
export function rememberRoom(room) {
  try {
    const others = getRecentRooms().filter((recent) => recent.code !== room.id)
    const next = [{ code: room.id, gameId: room.game.id, mode: room.mode, at: Date.now() }, ...others].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the list is only a shortcut.
  }
}
