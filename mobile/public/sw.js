// Service worker of the web app: shows the room invites pushed by api/invite-push (Web Push), and opens the room
// when one is tapped. On iPhone this only works once the app is added to the home screen (iOS 16.4+).
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
      // One notification per invite: inviting again replaces it.
      tag: data.inviteId || undefined,
      data,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const path = data.type === 'invite' && data.room ? `/multi/${encodeURIComponent(data.room)}?invited=1` : '/'
  const url = new URL(path, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) return open.focus().then((client) => (client || open).navigate(url))
      return self.clients.openWindow(url)
    })
  )
})
