// Invitation link to add a player as a friend: <origin>/add/<username>. Whoever opens it can send the request in
// one tap, without knowing the username beforehand. Shared by the website and the app.
//
// A visitor who isn't signed in yet is sent to create an account first: the username is kept here until their
// friends list shows it (see FriendsPanel / the app's Friends screen).
const PENDING_KEY = 'geogame_pending_add'

export const inviteUrl = (origin, username) => `${origin}/add/${encodeURIComponent(username)}`

export function setPendingInvite(username) {
  try {
    globalThis.localStorage?.setItem(PENDING_KEY, username)
  } catch {
    // Storage unavailable: the invite is simply not remembered.
  }
}

export function getPendingInvite() {
  try {
    return globalThis.localStorage?.getItem(PENDING_KEY) || null
  } catch {
    return null
  }
}

export function clearPendingInvite() {
  try {
    globalThis.localStorage?.removeItem(PENDING_KEY)
  } catch {
    // Same as above.
  }
}
