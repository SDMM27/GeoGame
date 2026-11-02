// What the weekly league pays at the end of the week (api/_lib/weeklyTop.mjs pays it, the League page tells it). No
// import: the API bundles this file.

// Flag fragments by rank (1-based).
export const LEAGUE_REWARDS = { 1: 10, 2: 6, 3: 4, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 }
// Games played to earn the reward: a player below it keeps their rank, and nobody below takes their reward.
export const LEAGUE_MIN_PLAYED = 5
