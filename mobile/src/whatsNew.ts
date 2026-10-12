// "What's new" notes, shown once after an update brought them (components/WhatsNew.tsx).
// To announce something: add a note at the end, with an id that sorts after the previous ones (date first) and its
// texts under mobile.whats_new in every language. New players never see the notes that came before their install.

export type WhatsNewNote = {
  id: string
  icon: 'translate'
  titleKey: string
  bodyKey: string
  /** Offers the language list under the text. */
  languagePicker?: boolean
}

export const WHATS_NEW: WhatsNewNote[] = [
  {
    id: '2026-10-languages',
    icon: 'translate',
    titleKey: 'mobile.whats_new.languages_title',
    bodyKey: 'mobile.whats_new.languages_body',
    languagePicker: true,
  },
]

export const SEEN_KEY = 'geogame-whats-new'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'key' | 'length'>

// Keys every launch writes, even the very first one: they don't tell a returning player apart.
const FIRST_LAUNCH_KEYS = new Set(['geogame-lang', SEEN_KEY])

/** True when the app has been used before: something other than the first launch's keys is stored. */
export function hasPlayedBefore(storage: Storage) {
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key && !FIRST_LAUNCH_KEYS.has(key)) return true
  }
  return false
}

/**
 * The note to show now, if any: the newest one the player hasn't seen. On a first launch nothing is shown and every
 * current note counts as seen. `playedBefore` must be read at startup, before the app stores anything.
 */
export function pendingNote(storage: Storage, playedBefore: boolean, notes = WHATS_NEW): WhatsNewNote | null {
  const latest = notes.at(-1)
  if (!latest) return null
  const seen = storage.getItem(SEEN_KEY)
  if (seen === null && !playedBefore) {
    storage.setItem(SEEN_KEY, latest.id)
    return null
  }
  return seen === null || seen < latest.id ? latest : null
}

export function markSeen(storage: Storage, note: WhatsNewNote) {
  storage.setItem(SEEN_KEY, note.id)
}
