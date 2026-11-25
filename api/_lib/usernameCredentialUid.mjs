const PLAYER_UID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const PREFIX = 'username-credential:'

export function isUsernameCredentialUid(uid) {
  return typeof uid === 'string' && uid.startsWith(PREFIX)
}

export function playerUidForUsernameCredential(uid) {
  if (!isUsernameCredentialUid(uid)) return null
  const playerUid = uid.slice(PREFIX.length)
  return PLAYER_UID.test(playerUid) ? playerUid : null
}

export function usernameCredentialUid(uid) {
  if (typeof uid !== 'string' || !PLAYER_UID.test(uid)) throw new Error('Invalid player UID for username credential')
  return `${PREFIX}${uid}`
}
