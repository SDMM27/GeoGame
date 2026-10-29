// Computes the highest score a legitimate game can reach, and the other limits used by the leaderboard rules
// in firestore.rules (validScore, validAscension, validDaily).
//
//   node scripts/scoreCaps.mjs           prints every cap and where it comes from
//   node scripts/scoreCaps.mjs --check   fails when the maps in firestore.rules or src/utils/perfectScores.js differ from the computed ones
//   node scripts/scoreCaps.mjs --write   rewrites those maps in firestore.rules (between the scoreCaps markers) and that file
//
// Everything is read from the code and the data, so a new country, a new preset or a new scoring table shows up
// as a failing --check (and as the unit test scripts/scoreCaps.test.mjs) until the rules are updated and published.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCORE_TABLE, getRankingAttemptScore } from '../src/utils/scoringRules.js'
import { HARDCORE_MAX_POINTS } from '../src/utils/hardcoreScoring.js'
import { ASCENSION_PRESETS, buildPhaseSequence } from '../src/utils/ascensionPresets.js'
import { CONTINENTS } from '../src/utils/continents.js'
import { CRITERIA_KEYS } from '../src/utils/rankingCriteria.js'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const countries = JSON.parse(read('src/data/countriesWithDifficulty_FR.json')).features.map((f) => f.properties)

const DIFFICULTIES = Object.keys(SCORE_TABLE) // Facile, Moyen, Difficile, Impossible; "Hardcore" is all of them
const MARGIN_RATIO = 0.1 // headroom on every value that depends on the country data
const MIN_MS_PER_COUNTRY = 100 // nobody finds, types or clicks a country faster than that

// Value found in a source file (constants that live in hooks, which node can't import).
function constantFrom(path, pattern, label) {
  const match = read(path).match(pattern)
  if (!match) throw new Error(`${label}: pattern not found in ${path}`)
  return match[1]
}

// Each solo game: which country property holds its difficulty, and which countries it can ask for
// (useGameState, useFlagGameState, useCapitalsGameState and useAscensionState filters), and the most a country gives
// (SCORE_TABLE by difficulty; Hardcore, a tap inside the country, whatever its difficulty).
const perfectFor = (property) => (c) => (SCORE_TABLE[c[property]] ? perfect(c[property]) : 0)
const SOLO_GAMES = {
  PLACEMENT: { property: 'Difficulty', playable: () => true, best: perfectFor('Difficulty') },
  HARDCORE: { property: 'Difficulty', playable: () => true, best: () => HARDCORE_MAX_POINTS },
  FLAGS: { property: 'DifficultyFlag', playable: (c) => Boolean(c.ISO_A2), best: perfectFor('DifficultyFlag') },
  // Missing Flag: the Flags game with one band hidden (same countries and score table, its own difficulty)
  MISSING_FLAG: { property: 'DifficultyMissingFlag', playable: (c) => Boolean(c.ISO_A2), best: perfectFor('DifficultyMissingFlag') },
  CAPITALS: { property: 'DifficultyCapitals', playable: (c) => Boolean(c.ISO_A2 && c.capital), best: perfectFor('DifficultyCapitals') },
}

const withMargin = (max) => max + Math.max(2, Math.ceil(max * MARGIN_RATIO))
const perfect = (difficulty) => SCORE_TABLE[difficulty][0] // 0 error on the first try

// Solo scores, by "GAME_difficulty" (the difficulty is the continent name when the game is played by continent).
function soloLimits() {
  const caps = {}
  const minTimes = {}
  const rows = []
  for (const [game, { property, playable, best }] of Object.entries(SOLO_GAMES)) {
    const modes = [
      ...[...DIFFICULTIES, 'Hardcore'].map((name) => ({
        name,
        pool: countries.filter((c) => playable(c) && (name === 'Hardcore' ? DIFFICULTIES : [name]).includes(c[property])),
      })),
      ...CONTINENTS.map(({ name }) => ({ name, pool: countries.filter((c) => playable(c) && c.continent === name) })),
    ]
    for (const { name, pool } of modes) {
      // A country without a difficulty for this game is asked in continent mode (it gives no point, but in Hardcore).
      const max = pool.reduce((sum, c) => sum + best(c), 0)
      const key = `${game}_${name}`
      caps[key] = withMargin(max)
      minTimes[key] = pool.length * MIN_MS_PER_COUNTRY
      rows.push({ game, mode: name, countries: pool.length, max, cap: caps[key], minTimeMs: minTimes[key] })
    }
  }
  return { caps, minTimes, rows }
}

// Ascension: the preset fixes how many countries of each difficulty are asked, whatever the game. Hardcore gives a tap
// inside the country HARDCORE_MAX_POINTS whatever its difficulty, hence its own caps (exact: the count is fixed).
function ascensionLimits() {
  const out = { caps: {}, hardcoreCaps: {}, totals: {}, phases: {}, phaseCounts: {}, minTimes: {}, rows: [] }
  for (const { name, phases } of ASCENSION_PRESETS) {
    const sequence = buildPhaseSequence(phases)
    const total = sequence.reduce((sum, p) => sum + p.count, 0)
    const max = sequence.reduce((sum, p) => sum + p.count * perfect(p.difficulty), 0)
    out.caps[name] = withMargin(max)
    out.hardcoreCaps[name] = total * HARDCORE_MAX_POINTS
    out.totals[name] = total
    out.phases[name] = sequence.length
    out.minTimes[name] = total * MIN_MS_PER_COUNTRY
    sequence.forEach((p, i) => { out.phaseCounts[`${name}_${i}`] = p.count })
    out.rows.push({ preset: name, countries: total, phases: sequence.length, max, cap: out.caps[name], hardcoreCap: out.hardcoreCaps[name], minTimeMs: out.minTimes[name] })
  }
  return out
}

// Daily challenges.
function dailyLimits() {
  const quizAttempts = Number(constantFrom('src/hooks/useDailyQuizState.js', /export const DAILY_MAX_ATTEMPTS = (\d+)/, 'quiz attempts'))
  const quizHints = Number(constantFrom('src/utils/quizQuestions.js', /export const MAX_HINTS = (\d+)/, 'quiz hints'))
  // Border Guess / Country Clue: a name can't be proposed twice, so a player can't go past the accepted names;
  // counting one per country, doubled for the alias that names the same country a second time.
  const guessable = countries.length * 2
  // Voyage Voyage: the score is the number of steps (a chain of distinct countries), wrong guesses are distinct
  // countries too, and hints are of a few kinds. Only countries with an ISO code can be typed there.
  const voyageCountries = withMargin(countries.filter((c) => c.ISO_A2).length)
  const hintKinds = constantFrom('src/hooks/useVoyageVoyageState.js', /useState\(\[\]\)\s*\/\/\s*(.+)/, 'voyage hints')
    .split('|').length
  const rankingCount = Number(constantFrom('src/hooks/useRankingGameState.js', /const DAILY_COUNT = (\d+)/, 'ranking count'))
  const rankingTries = Number(constantFrom('src/hooks/useRankingGameState.js', /const MAX_ATTEMPTS = (\d+)/, 'ranking tries'))
  // The daily ranks the same countries by every criterion, one stage each, and adds up the stages.
  const rankingStages = CRITERIA_KEYS.length
  // Sum of |position - right position| over n items is at most floor(n * n / 2) (the reversed list).
  const worstError = Math.floor((rankingCount * rankingCount) / 2)

  // Daily Challenge: 12 rounds, a point per right answer (src/utils/dailyChallenge.js, which node can't import)
  const challengeRounds = Number(constantFrom('src/utils/dailyChallenge.js', /export const CHALLENGE_ROUNDS = (\d+)/, 'challenge rounds'))

  // Country of the Day: 4 steps of 3 tries, points by the try a step was found on (src/utils/countryOfDay.js, which
  // node can't import: it reads the hooks). The rules recompute the score from the tries.
  const countryOfDaySource = 'src/utils/countryOfDay.js'
  const countryOfDaySteps = constantFrom(countryOfDaySource, /export const COUNTRY_OF_DAY_STEPS = \[([^\]]+)\]/, 'country of day steps')
    .split(',').filter((step) => step.trim()).length
  const countryOfDayTries = Number(constantFrom(countryOfDaySource, /export const COUNTRY_OF_DAY_TRIES = (\d+)/, 'country of day tries'))
  const pointsOf = (mode) => `[${constantFrom(countryOfDaySource, new RegExp(String.raw`^  ${mode}: \[([\d, ]+)\]`, 'm'), `country of day ${mode} points`)}]`

  return {
    countryOfDay: { steps: countryOfDaySteps, tries: countryOfDayTries, minTime: countryOfDaySteps * MIN_MS_PER_COUNTRY },
    countryOfDayPoints: { choice: pointsOf('choice'), free: pointsOf('free') },
    // Rounds (one point each) and the least time for all of them: nobody answers a round faster than MIN_MS_PER_COUNTRY
    challenge: { rounds: challengeRounds, minTime: challengeRounds * MIN_MS_PER_COUNTRY },
    attempts: { BORDER_GUESS: guessable, COUNTRY_CLUE: guessable, QUIZ: quizAttempts, VOYAGE_VOYAGE: voyageCountries },
    hints: { BORDER_GUESS: 0, COUNTRY_CLUE: 0, QUIZ: quizHints, VOYAGE_VOYAGE: hintKinds },
    // Voyage Voyage stores its wrong guesses in elapsedTime (a count, not a time)
    voyageWrong: { VOYAGE_VOYAGE: voyageCountries },
    ranking: {
      score: rankingStages * getRankingAttemptScore(1),
      totalError: withMargin(rankingStages * worstError),
      attemptsUsed: rankingStages * rankingTries,
      // A stage found at attempt a scores getRankingAttemptScore(a) = 4 - a, a failed one 0 in 3 attempts:
      // score + attempts is at most 4 per stage.
      scoreAndAttempts: rankingStages * (getRankingAttemptScore(1) + 1),
      // One line per stage (describePlayedOrders); entries saved before the stages hold the 5 countries.
      players: Math.max(rankingCount, rankingStages),
    },
    sources: { quizAttempts, quizHints, guessable, voyageCountries, hintKinds, rankingCount, rankingTries, rankingStages, worstError },
  }
}

export function computeLimits() {
  const solo = soloLimits()
  const ascension = ascensionLimits()
  const daily = dailyLimits()
  const maps = {
    soloCaps: solo.caps,
    soloMinTime: solo.minTimes,
    ascensionCaps: ascension.caps,
    ascensionHardcoreCaps: ascension.hardcoreCaps,
    ascensionTotals: ascension.totals,
    ascensionPhases: ascension.phases,
    ascensionPhaseCounts: ascension.phaseCounts,
    ascensionMinTime: ascension.minTimes,
    dailyAttempts: daily.attempts,
    dailyHints: daily.hints,
    dailyWrong: daily.voyageWrong,
    rankingCaps: daily.ranking,
    challengeCaps: daily.challenge,
    countryOfDayCaps: daily.countryOfDay,
    countryOfDayPoints: daily.countryOfDayPoints,
  }
  return { maps, solo, ascension, daily }
}

const formatMap = (map, indent) =>
  Object.entries(map).map(([key, value]) => `${indent}'${key}': ${value}`).join(',\n')

const RULES_PATH = new URL('firestore.rules', root)
const BLOCK = /^([ \t]*)\/\/ scoreCaps:begin (\w+)\r?\n([\s\S]*?)^[ \t]*\/\/ scoreCaps:end \2$/gm

// Rewrites every marked block of the rules, and reports the ones that differed or are missing.
export function syncRules(rules, maps) {
  const stale = []
  const seen = new Set()
  const next = rules.replace(BLOCK, (whole, indent, name, body) => {
    seen.add(name)
    if (!maps[name]) throw new Error(`firestore.rules: unknown scoreCaps block "${name}"`)
    const wanted = formatMap(maps[name], indent)
    if (body.replace(/\s+/g, '') !== wanted.replace(/\s+/g, '')) stale.push(name)
    return `${indent}// scoreCaps:begin ${name}\n${wanted}\n${indent}// scoreCaps:end ${name}`
  })
  const missing = Object.keys(maps).filter((name) => !seen.has(name))
  return { next, stale, missing }
}

const PERFECT_PATH = new URL('src/utils/perfectScores.js', root)

// The exact best solo scores (no margin) as a module the profile reads.
export function perfectScoresSource(solo) {
  const entries = solo.rows.map(({ game, mode, max }) => `  '${game}_${mode}': ${max},`).join('\n')
  return `// Generated by scripts/scoreCaps.mjs (node scripts/scoreCaps.mjs --write), do not edit.
// The highest score a solo game can give, by "GAME_difficulty" (the difficulty is the continent name by continent).
export const PERFECT_SCORES = {
${entries}
}
`
}

function print({ solo, ascension, daily }) {
  console.log('Solo scores (PLACEMENT / FLAGS / CAPITALS), one perfect country = first row of SCORE_TABLE')
  console.table(solo.rows)
  console.log('Ascension presets (found + skipped <= countries; score cap and minimum time as above)')
  console.table(ascension.rows)
  console.log('Daily challenges')
  console.table({
    'BORDER_GUESS / COUNTRY_CLUE attempts <=': { value: daily.attempts.BORDER_GUESS, from: '2 x number of countries in the data' },
    'QUIZ attempts <=': { value: daily.attempts.QUIZ, from: 'DAILY_MAX_ATTEMPTS (useDailyQuizState)' },
    'QUIZ hints <=': { value: daily.hints.QUIZ, from: 'MAX_HINTS (quizQuestions)' },
    'VOYAGE_VOYAGE steps <=': { value: daily.attempts.VOYAGE_VOYAGE, from: 'countries with an ISO code, plus margin' },
    'VOYAGE_VOYAGE hints <=': { value: daily.hints.VOYAGE_VOYAGE, from: 'kinds of hint (useVoyageVoyageState)' },
    'VOYAGE_VOYAGE wrong guesses (elapsedTime) <=': { value: daily.voyageWrong.VOYAGE_VOYAGE, from: 'countries with an ISO code, plus margin' },
    'RANKING score <=': { value: daily.ranking.score, from: `${daily.sources.rankingStages} criteria x getRankingAttemptScore(1)` },
    'RANKING totalError <=': { value: daily.ranking.totalError, from: `${daily.sources.rankingStages} x floor(${daily.sources.rankingCount}^2 / 2) = ${daily.sources.rankingStages * daily.sources.worstError}, plus margin` },
    'RANKING attemptsUsed <=': { value: daily.ranking.attemptsUsed, from: `${daily.sources.rankingStages} criteria x MAX_ATTEMPTS (useRankingGameState)` },
    'RANKING score + attemptsUsed <=': { value: daily.ranking.scoreAndAttempts, from: 'getRankingAttemptScore(1) + 1 per criterion' },
    'RANKING playerOrder length <=': { value: daily.ranking.players, from: 'DAILY_COUNT, or one line per criterion' },
    'DAILY_CHALLENGE score / results length <=': { value: daily.challenge.rounds, from: 'CHALLENGE_ROUNDS (dailyChallenge.js)' },
    'DAILY_CHALLENGE elapsedTime >=': { value: daily.challenge.minTime, from: `${daily.challenge.rounds} rounds x ${MIN_MS_PER_COUNTRY} ms` },
    'COUNTRY_OF_DAY steps x tries': { value: `${daily.countryOfDay.steps} x ${daily.countryOfDay.tries}`, from: 'COUNTRY_OF_DAY_STEPS / _TRIES (countryOfDay.js)' },
    'COUNTRY_OF_DAY points by try (choice / free)': { value: `${daily.countryOfDayPoints.choice} / ${daily.countryOfDayPoints.free}`, from: 'COUNTRY_OF_DAY_POINTS (countryOfDay.js)' },
    'COUNTRY_OF_DAY elapsedTime >=': { value: daily.countryOfDay.minTime, from: `${daily.countryOfDay.steps} steps x ${MIN_MS_PER_COUNTRY} ms` },
    'daily attempts >=': { value: 1, from: 'a daily is saved once solved: at least one guess or step' },
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const limits = computeLimits()
  const mode = process.argv[2]
  if (mode === '--check' || mode === '--write') {
    const { next, stale, missing } = syncRules(readFileSync(RULES_PATH, 'utf8'), limits.maps)
    const perfect = perfectScoresSource(limits.solo)
    const sameText = (a, b) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '')
    const perfectStale = !existsSync(PERFECT_PATH) || !sameText(readFileSync(PERFECT_PATH, 'utf8'), perfect)
    if (mode === '--write') {
      writeFileSync(RULES_PATH, next)
      writeFileSync(PERFECT_PATH, perfect)
      console.log(`firestore.rules updated (${stale.length} block(s) changed)`)
      console.log(`src/utils/perfectScores.js ${perfectStale ? 'updated' : 'unchanged'}`)
    } else if (stale.length || missing.length || perfectStale) {
      const outOfDate = [...stale, ...missing.map((n) => `${n} (missing)`), ...(perfectStale ? ['src/utils/perfectScores.js'] : [])]
      console.error(`Out of date: ${outOfDate.join(', ')}`)
      console.error('Run: node scripts/scoreCaps.mjs --write')
      process.exit(1)
    } else {
      console.log('firestore.rules and src/utils/perfectScores.js match the computed caps')
    }
  } else {
    print(limits)
  }
}
