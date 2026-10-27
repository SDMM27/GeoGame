// Service worker of the web app: shows the notifications pushed by the website's API (Web Push: room invites, friend
// requests, daily reminder, friends' daily nudges), and opens the right screen when one is tapped. On iPhone this only works once the app is added to the
// home screen (iOS 16.4+).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let message = {}
  try {
    message = event.data ? event.data.json() : {}
  } catch {
    message = { body: event.data ? event.data.text() : '' }
  }
  const data = message.data || {}
  event.waitUntil(
    self.registration.showNotification(message.title || 'GeoGame', {
      body: message.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // One notification per invite, friend (and game, for a nudge) or day: a newer one replaces it.
      tag: data.inviteId || (data.uid && `${data.type}-${data.uid}${data.gameType ? `-${data.gameType}` : ''}`) || data.type || undefined,
      data,
    })
  )
})

// Daily games, as in mobile/src/games.ts.
const DAILY_ROUTES = {
  BORDER_GUESS: '/game/border-guess',
  COUNTRY_CLUE: '/game/country-clue',
  VOYAGE_VOYAGE: '/game/voyage',
  RANKING: '/game/ranking',
  QUIZ: '/game/quiz',
}

// Same screens as the app opens for a tapped notification (mobile/src/notifications/push.ts).
function screenFor(data) {
  if (data.type === 'invite' && data.room) return `/multi/${encodeURIComponent(data.room)}?invited=1`
  if (data.type === 'friend_request') return '/friends'
  if (data.type === 'friend_accepted' && data.uid) return `/player/${encodeURIComponent(data.uid)}`
  // A friend's nudge: the daily challenge they finished
  if (data.type === 'daily_nudge' && DAILY_ROUTES[data.gameType]) return `${DAILY_ROUTES[data.gameType]}?mode=daily`
  if (data.type === 'challenge_result' && data.uid) return `/player/${encodeURIComponent(data.uid)}`
  // 'daily': the home screen and its daily challenges
  return '/'
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = screenFor(event.notification.data || {})
  const url = new URL(path, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) return open.focus().then((client) => (client || open).navigate(url))
      return self.clients.openWindow(url)
    })
  )
})
