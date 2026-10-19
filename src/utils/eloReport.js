// Sends solo answers and finished duels to the Elo endpoint (api/elo), which alone writes the ratings.
// Shared by the website and the app. Best effort like gameHistory.js: a failure never breaks the game and is
// not retried; signed-out players are ignored (callPush resolves null).
// pushApi (Firebase Auth) is loaded on the first call, so that importing a game hook stays free of Firebase.
let pushApi = null
const post = async (body) => {
  pushApi ??= import('./pushApi')
  return (await pushApi).callPush('elo', body)
}

const MAX_BATCH = 50
const IDLE_MS = 10000

const queues = new Map()
let idleTimer = null

async function sendBatch(mode, results) {
  try {
    await post({ kind: 'solo', mode, results })
  } catch (error) {
    console.warn('[elo]', error)
  }
}

function scheduleIdleFlush() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(flushElo, IDLE_MS)
}

// Sends everything that is queued, one call per mode.
export function flushElo() {
  clearTimeout(idleTimer)
  idleTimer = null
  const pending = [...queues]
  queues.clear()
  for (const [mode, results] of pending) {
    for (let i = 0; i < results.length; i += MAX_BATCH) sendBatch(mode, results.slice(i, i + MAX_BATCH))
  }
}

// `country` is properties.ADMIN, `errors` the wrong answers on it before it was found or passed.
export function reportEloAnswer(mode, country, { found, errors }) {
  if (!mode || !country) return
  const queue = queues.get(mode) ?? []
  queue.push({ country, found: Boolean(found), errors: Math.max(0, Math.floor(errors ?? 0)) })
  queues.set(mode, queue)
  if (queue.length >= MAX_BATCH) {
    queues.delete(mode)
    sendBatch(mode, queue)
  }
  if (queues.size > 0) scheduleIdleFlush()
}

const reportedDuels = new Set()

// Idempotent on the server too; this only avoids repeating the call within a session.
export function reportDuel(room, gameIndex) {
  const key = `${room}:${gameIndex}`
  if (!room || reportedDuels.has(key)) return
  reportedDuels.add(key)
  post({ kind: 'duel', room, gameIndex }).catch((error) => console.warn('[elo]', error))
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushElo()
  })
  if (typeof window !== 'undefined') window.addEventListener('pagehide', flushElo)
}
