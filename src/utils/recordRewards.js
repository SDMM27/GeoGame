// Rewards for the solo records (the grid of utils/playerRecords.js): XP when a player beats their best score of a cell,
// more XP and fragments the first time they reach its perfect score. Pure: api/_lib/xp.mjs pays it on the server.
//
// users/{uid}.records = { best: { key: score }, perfect: [keys], day, dayPaid: [keys] }: the bests the server has seen,
// the cells whose perfect score was paid (once ever) and the cells whose record was paid today (once a day).
// A key is "GAME_difficulty" (the difficulty is the continent name by continent), like PERFECT_SCORES.
import { GAME_TYPES } from './gameTypes.js'
import { PERFECT_SCORES } from './perfectScores.js'

export const RECORD_GAMES = [GAME_TYPES.PLACEMENT, GAME_TYPES.HARDCORE, GAME_TYPES.FLAGS, GAME_TYPES.MISSING_FLAG, GAME_TYPES.CAPITALS]

const TIERS = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
export const RECORD_XP = { Facile: 15, Moyen: 25, Difficile: 40, Impossible: 50, Hardcore: 60, continent: 25 }
export const PERFECT_XP = { Facile: 75, Moyen: 125, Difficile: 200, Impossible: 250, Hardcore: 400, continent: 150 }
export const PERFECT_FRAGMENTS = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 4, Hardcore: 6, continent: 2 }

// { game, mode } of a key; MISSING_FLAG holds an underscore, so the game is found in RECORD_GAMES.
export function splitKey(key) {
  const game = RECORD_GAMES.find((candidate) => key.startsWith(`${candidate}_`))
  return game ? { game, mode: key.slice(game.length + 1) } : null
}

export function tierOf(key) {
  const mode = splitKey(key)?.mode
  return TIERS.includes(mode) ? mode : 'continent'
}

/** The best score of each cell among the player's `scores` documents: { [key]: score }. */
export function bestScoresOf(scoreDocs) {
  const bests = {}
  for (const { gameType, difficulty, score } of scoreDocs) {
    if (!RECORD_GAMES.includes(gameType) || typeof score !== 'number' || !Number.isFinite(score)) continue
    const key = `${gameType}_${difficulty}`
    if (!(key in PERFECT_SCORES)) continue
    if (!(key in bests) || score > bests[key]) bests[key] = score
  }
  return bests
}

/** users/{uid}.records at `day`: { seeded, best, perfect, day, dayPaid } (seeded: false when the field is absent). */
export function readRecords(data, day) {
  const stored = data?.records
  if (!stored || typeof stored !== 'object') return { seeded: false, best: {}, perfect: [], day, dayPaid: [] }
  return {
    seeded: true,
    best: stored.best && typeof stored.best === 'object' ? stored.best : {},
    perfect: Array.isArray(stored.perfect) ? stored.perfect : [],
    day,
    dayPaid: stored.day === day && Array.isArray(stored.dayPaid) ? stored.dayPaid : [],
  }
}

/** Pays the records among `bests` (bestScoresOf) to a player in `state` (readRecords):
 *  { gained, fragments, rewards, state, changed }. The first claim only seeds the bests (and pays the perfect cells once);
 *  after it a better score than the stored one pays a record (once a cell a day), the perfect score pays once ever. */
export function grantRecords(state, bests, day) {
  const seeded = state.seeded
  const best = { ...state.best }
  const perfect = [...state.perfect]
  const dayPaid = [...state.dayPaid]
  const rewards = []
  let changed = !seeded
  const pay = (kind, key, score, previous) => {
    const tier = tierOf(key)
    const { game, mode } = splitKey(key)
    const perfectKind = kind === 'perfect'
    rewards.push({
      kind,
      key,
      game,
      mode,
      score,
      previous,
      xp: perfectKind ? PERFECT_XP[tier] : RECORD_XP[tier],
      fragments: perfectKind ? PERFECT_FRAGMENTS[tier] : 0,
    })
    changed = true
  }

  for (const [key, score] of Object.entries(bests)) {
    const previous = seeded && typeof best[key] === 'number' ? best[key] : null
    if (seeded && score <= (previous ?? -Infinity)) continue
    best[key] = score
    if (seeded) changed = true
    const isPerfect = score >= PERFECT_SCORES[key]
    if (!seeded) {
      if (isPerfect) {
        pay('perfect', key, score, null)
        perfect.push(key)
      }
      continue
    }
    if (isPerfect && !perfect.includes(key)) {
      pay('perfect', key, score, previous)
      perfect.push(key)
    } else if (previous != null && !perfect.includes(key) && !dayPaid.includes(key)) {
      // A perfect cell pays nothing more: a score above it only comes from a scoring change or a forged one
      pay('record', key, score, previous)
      dayPaid.push(key)
    }
  }

  return {
    gained: rewards.reduce((sum, reward) => sum + reward.xp, 0),
    fragments: rewards.reduce((sum, reward) => sum + reward.fragments, 0),
    rewards,
    state: { best, perfect, day, dayPaid },
    changed,
  }
}

const GAME_TITLE_KEYS = {
  [GAME_TYPES.PLACEMENT]: 'games.placement.title',
  [GAME_TYPES.HARDCORE]: 'games.hardcore.title',
  [GAME_TYPES.FLAGS]: 'games.flags.title',
  [GAME_TYPES.MISSING_FLAG]: 'games.missing_flag.title',
  [GAME_TYPES.CAPITALS]: 'games.capitals.title',
}

/** The toast line of a record reward, translated with `t` (react-i18next). */
export function rewardText(t, reward) {
  const game = t(GAME_TITLE_KEYS[reward.game])
  const mode = t(`${TIERS.includes(reward.mode) ? 'difficulties' : 'continents'}.${reward.mode}`)
  if (reward.kind === 'perfect') return t('records.reward_perfect', { game, mode, xp: reward.xp, count: reward.fragments })
  return t('records.reward_record', { game, mode, xp: reward.xp })
}
