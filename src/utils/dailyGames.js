// Which dailies there are, and since / until when. Plain module (no Firebase import, unlike profileStats.js, which
// re-exports all of this): read by the website, the app (@shared) and the API, which bundles missions.js.
import { isGameHidden } from './gameAvailability.js'
import { GAME_TYPES } from './gameTypes.js'

// Every daily there has ever been, in display order.
export const ALL_DAILY_GAME_TYPES = [
  GAME_TYPES.DAILY_CHALLENGE,
  GAME_TYPES.COUNTRY_OF_DAY,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.COUNTRY_CLUE,
  GAME_TYPES.VOYAGE_VOYAGE,
  GAME_TYPES.RANKING,
  GAME_TYPES.QUIZ,
]

// The dailies of today (the hidden games left out, see gameAvailability.js).
export const DAILY_GAME_TYPES = ALL_DAILY_GAME_TYPES.filter((type) => !isGameHidden(type))

// The Country of the Day took the Geo Quiz's place among the dailies on that day (its launch).
export const COUNTRY_OF_DAY_SINCE = '2026-10-29'

// First day of the dailies added after the others (the other ones have always been there).
export const DAILY_GAME_SINCE = {
  [GAME_TYPES.DAILY_CHALLENGE]: '2026-10-16',
  [GAME_TYPES.COUNTRY_OF_DAY]: COUNTRY_OF_DAY_SINCE,
}

// Day after the last one of the dailies taken away.
export const DAILY_GAME_UNTIL = {
  [GAME_TYPES.QUIZ]: COUNTRY_OF_DAY_SINCE,
}

// The dailies there were on a day ('2026-10-13'): "every daily done" on a day means those ones, so that a player keeps
// the sweeps they made before a daily was added or taken away.
export function dailyTypesOn(day) {
  return ALL_DAILY_GAME_TYPES.filter(
    (type) => (!DAILY_GAME_SINCE[type] || day >= DAILY_GAME_SINCE[type]) && (!DAILY_GAME_UNTIL[type] || day < DAILY_GAME_UNTIL[type])
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

export function previousDayKey(key) {
  return new Date(Date.parse(`${key}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
}
