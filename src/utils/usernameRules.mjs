import { containsProfanity } from './profanity.js'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

const USERNAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u

export function normalizeUsername(username) {
  return username.trim().replace(/\s+/g, ' ')
}

export function usernameKey(username) {
  return normalizeUsername(username).toLowerCase()
}

export function validateUsername(username) {
  const name = normalizeUsername(username)
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return 'username_length'
  if (!USERNAME_PATTERN.test(name)) return 'username_chars'
  if (containsProfanity(name)) return 'username_forbidden'
  return null
}
