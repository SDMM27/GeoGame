// Asks the website's API (api/*-push) to send a push notification about something the signed-in player just did.
// Best effort: the action itself already worked, the notification is a bonus. Shared by the website and the app.
import { getAuth } from 'firebase/auth'
import { app } from '../Firebase'

// The website calls its own API; the app and the web app (another origin) set the website's address at startup.
let apiOrigin = ''
export function setPushApiOrigin(origin) {
  apiOrigin = origin
}

export async function requestPush(path, body) {
  try {
    const idToken = await getAuth(app).currentUser?.getIdToken()
    if (!idToken) return
    await fetch(`${apiOrigin}/api/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.warn('[push]', error)
  }
}
