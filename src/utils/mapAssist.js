// Optional world map showing the countries already guessed (Country Clue, Border Guess). Using it during a daily
// puts the score in a lower tier of the leaderboard (stored as `mapAssist: true`, see sortDailyScores in dailyScores.js).

const prefKey = (gameType) => `map-assist:${gameType}`

export function readMapAssistPref(gameType) {
  try {
    return window.localStorage.getItem(prefKey(gameType)) === 'true'
  } catch {
    return false
  }
}

export function writeMapAssistPref(gameType, on) {
  try {
    window.localStorage.setItem(prefKey(gameType), String(Boolean(on)))
  } catch {
    // Ignore localStorage write failures.
  }
}
