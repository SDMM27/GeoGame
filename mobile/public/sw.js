// Service worker of the web app: shows the notifications pushed by the website's API (Web Push: room invites, friend
// requests), and opens the right screen when one is tapped. On iPhone this only works once the app is added to the
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
      // One notification per invite or friend: a newer one replaces it.
      tag: data.inviteId || (data.uid && `${data.type}-${data.uid}`) || undefined,
      data,
    })
  )
})

// Same screens as the app opens for a tapped notification (mobile/src/notifications/push.ts).
function screenFor(data) {
  if (data.type === 'invite' && data.room) return `/multi/${encodeURIComponent(data.room)}?invited=1`
  if (data.type === 'friend_request') return '/friends'
  if (data.type === 'friend_accepted' && data.uid) return `/player/${encodeURIComponent(data.uid)}`
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
