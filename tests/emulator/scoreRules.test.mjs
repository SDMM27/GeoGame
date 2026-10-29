// @vitest-environment node
// firestore.rules limits on leaderboard scores (scores, ascension_scores, daily_scores), against the Firestore emulator
// (npm run test:emulator). The limits come from scripts/scoreCaps.mjs, which computes them from the game code and data.
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { computeLimits } from '../../scripts/scoreCaps.mjs'
import { ASCENSION_PRESETS, buildPhaseSequence } from '../../src/utils/ascensionPresets.js'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const now = () => firebase.firestore.FieldValue.serverTimestamp()
const { solo, ascension, daily } = computeLimits()

let env

const as = (uid) => env.authenticatedContext(uid).firestore()
const anonymous = () => env.unauthenticatedContext().firestore()
const clean = (data) => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))

// Signed in as alice by default; { uid: undefined, name: 'Zoe' } makes it a visitor.
const solos = (overrides = {}) =>
  clean({ name: 'Alice', uid: 'alice', score: 10, difficulty: 'Facile', gameType: 'PLACEMENT', elapsedTime: 60000, ...overrides })

const phaseStatsOf = (presetName) =>
  buildPhaseSequence(ASCENSION_PRESETS.find((preset) => preset.name === presetName)?.phases ?? {}).map((phase) => ({
    difficulty: phase.difficulty,
    count: phase.count,
    found: phase.count,
    skipped: 0,
    timeMs: 5000,
  }))

const ascensions = (presetName = 'Challenge', overrides = {}) =>
  clean({
    name: 'Alice',
    uid: 'alice',
    gameType: 'PLACEMENT',
    presetName,
    globalTimeMs: 120000,
    globalScore: 100,
    totalFound: ascension.totals[presetName],
    totalSkipped: 0,
    phaseStats: phaseStatsOf(presetName),
    date: now(),
    ...overrides,
  })

const dailies = (overrides = {}) =>
  clean({ name: 'Alice', uid: 'alice', gameType: 'BORDER_GUESS', dailyKey: '2026-10-08', attempts: 4, elapsedTime: 30000, guesses: ['A', 'B', 'C', 'D'], ...overrides })

const rankings = (overrides = {}) =>
  clean({ name: 'Alice', uid: 'alice', gameType: 'RANKING', dailyKey: '2026-10-08', score: 2, totalError: 0, attemptsUsed: 2, playerOrder: ['A', 'B', 'C', 'D', 'E'], ...overrides })

const challenges = (overrides = {}) =>
  clean({
    name: 'Alice',
    uid: 'alice',
    gameType: 'DAILY_CHALLENGE',
    dailyKey: '2026-10-16',
    score: 9,
    elapsedTime: 95000,
    results: [true, true, true, false, true, true, true, false, true, true, false, true],
    ...overrides,
  })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'geogame-sdmm',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await db.doc('usernames/alice').set({ uid: 'alice', username: 'Alice' })
    await db.doc('users/alice').set({ username: 'Alice' })
  })
})

describe('computed limits', () => {
  it('match the perfect run of a few known modes', () => {
    const row = (game, mode) => solo.rows.find((r) => r.game === game && r.mode === mode)
    // 29 easy countries at 3 points each, and every difficulty together for Hardcore
    expect(row('PLACEMENT', 'Facile').max).toBe(87)
    expect(row('PLACEMENT', 'Hardcore').max).toBe(1554)
    expect(ascension.rows.map((r) => r.max)).toEqual([62, 139, 123, 215])
  })
})

describe('offensive names', () => {
  it('refuses the most explicit insults in a visitor name, not names that merely look like them', async () => {
    for (const name of ['Fuck', 'xXConnardXx', 'Salope', 'ХУЙ', 'Пиздец'])
      await assertFails(anonymous().collection('scores').add(solos({ name, uid: undefined })))
    for (const name of ['Scunthorpe', 'Cassandra', 'Dickens', 'Иван'])
      await assertSucceeds(anonymous().collection('scores').add(solos({ name, uid: undefined })))
  })
})

describe('solo scores', () => {
  const modes = solo.rows.map((row) => [`${row.game} ${row.mode}`, row])

  it.each(modes)('accepts the best %s run, signed in or as a visitor, and refuses more', async (_label, row) => {
    const mode = { gameType: row.game, difficulty: row.mode }
    // Continent games send the continent name as the difficulty, plus the continent itself
    const continent = ['Europe', 'Asie', 'Afrique', 'Amériques', 'Océanie'].includes(row.mode) ? { continent: row.mode } : {}
    const best = { ...mode, ...continent, score: row.max, elapsedTime: row.minTimeMs }
    await assertSucceeds(as('alice').collection('scores').add(solos(best)))
    await assertSucceeds(anonymous().collection('scores').add(solos({ ...best, name: `Zoe ${row.game}`, uid: undefined })))
    await assertSucceeds(as('alice').collection('scores').add(solos({ ...best, score: row.cap })))

    await assertFails(as('alice').collection('scores').add(solos({ ...best, score: row.cap + 1 })))
    await assertFails(anonymous().collection('scores').add(solos({ ...best, name: 'Zoe', uid: undefined, score: row.cap + 1 })))
  })

  it('refuses a score nobody could reach', async () => {
    await assertFails(as('alice').collection('scores').add(solos({ score: 1000000 })))
    await assertFails(as('alice').collection('scores').add(solos({ score: 999999, difficulty: 'Hardcore' })))
    await assertFails(as('alice').collection('scores').add(solos({ score: 97, difficulty: 'Facile' })))
  })

  it('keeps the limit of the game and the difficulty it is played at', async () => {
    // 200 is plenty for Hardcore placement, out of reach on Facile
    await assertSucceeds(as('alice').collection('scores').add(solos({ score: 200, difficulty: 'Hardcore' })))
    await assertFails(as('alice').collection('scores').add(solos({ score: 200, difficulty: 'Facile' })))
    await assertFails(as('alice').collection('scores').add(solos({ score: 221, difficulty: 'Océanie' })))
  })

  it('refuses a game or difficulty that does not exist', async () => {
    await assertFails(as('alice').collection('scores').add(solos({ gameType: 'QUIZ' })))
    await assertFails(as('alice').collection('scores').add(solos({ gameType: 'BORDER_GUESS' })))
    await assertFails(as('alice').collection('scores').add(solos({ difficulty: 'Cheat' })))
    await assertFails(as('alice').collection('scores').add(solos({ difficulty: 'facile' })))
  })

  it('refuses a time too short for the number of countries, and a score without one still works', async () => {
    const facile = solo.rows.find((r) => r.game === 'PLACEMENT' && r.mode === 'Facile')
    await assertFails(as('alice').collection('scores').add(solos({ elapsedTime: facile.minTimeMs - 1 })))
    await assertFails(as('alice').collection('scores').add(solos({ elapsedTime: 0 })))
    await assertFails(as('alice').collection('scores').add(solos({ elapsedTime: -5 })))
    await assertSucceeds(as('alice').collection('scores').add(solos({ elapsedTime: facile.minTimeMs })))
    await assertSucceeds(as('alice').collection('scores').add(solos({ elapsedTime: undefined })))
  })

  it('still replaces a score with a better one, within the limit', async () => {
    const ref = await as('alice').collection('scores').add(solos({ score: 40 }))
    await assertSucceeds(as('alice').doc(ref.path).set(solos({ score: 87, elapsedTime: 70000 })))
    await assertFails(as('alice').doc(ref.path).set(solos({ score: 97 })))
    await assertFails(as('alice').doc(ref.path).set(solos({ score: 20 })))
  })
})

describe('Ascension scores', () => {
  it.each(ascension.rows.map((row) => [row.preset, row]))('accepts the best %s run, and refuses more', async (preset, row) => {
    const best = ascensions(preset, { globalScore: row.max, globalTimeMs: row.minTimeMs })
    await assertSucceeds(as('alice').collection('ascension_scores').add(best))
    await assertSucceeds(anonymous().collection('ascension_scores').add(clean({ ...best, name: 'Zoe', uid: undefined })))
    await assertSucceeds(as('alice').collection('ascension_scores').add({ ...best, globalScore: row.cap }))

    await assertFails(as('alice').collection('ascension_scores').add({ ...best, globalScore: row.cap + 1 }))
    await assertFails(anonymous().collection('ascension_scores').add(clean({ ...best, name: 'Zoe', uid: undefined, globalScore: row.cap + 1 })))
  })

  it.each(ascension.rows.map((row) => [row.preset, row]))('caps a Hardcore %s run at the most its taps give', async (preset, row) => {
    const best = ascensions(preset, { gameType: 'HARDCORE', globalScore: row.hardcoreCap, globalTimeMs: row.minTimeMs })
    await assertSucceeds(as('alice').collection('ascension_scores').add(best))
    await assertFails(as('alice').collection('ascension_scores').add({ ...best, globalScore: row.hardcoreCap + 1 }))
    // The other games keep their own (much lower) caps
    await assertFails(as('alice').collection('ascension_scores').add({ ...best, gameType: 'PLACEMENT' }))
  })

  it('accepts the four games and a run with skipped countries', async () => {
    for (const gameType of ['PLACEMENT', 'HARDCORE', 'FLAGS', 'CAPITALS']) {
      await assertSucceeds(as('alice').collection('ascension_scores').add(ascensions('Progressif', { gameType })))
    }
    const phaseStats = phaseStatsOf('Progressif').map((phase) => ({ ...phase, found: phase.count - 1, skipped: 1 }))
    await assertSucceeds(
      as('alice').collection('ascension_scores').add(ascensions('Progressif', { totalFound: 27, totalSkipped: 4, phaseStats }))
    )
  })

  it('refuses more countries than the preset asks', async () => {
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { totalFound: 24 })))
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { totalFound: 20, totalSkipped: 4 })))
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { totalFound: 10000 })))
  })

  it('refuses a score from a lighter preset claimed on a heavier one, and a preset that does not exist', async () => {
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Découverte', { globalScore: 100 })))
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Cheat', { globalScore: 1, totalFound: 5, phaseStats: [] })))
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { gameType: 'QUIZ' })))
  })

  it('refuses a time too short for the preset', async () => {
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { globalTimeMs: 2299 })))
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { globalTimeMs: 0 })))
    await assertSucceeds(as('alice').collection('ascension_scores').add(ascensions('Challenge', { globalTimeMs: 2300 })))
  })

  it('refuses inflated phaseStats', async () => {
    const stats = phaseStatsOf('Challenge')
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { phaseStats: [...stats, ...stats] })))
    await assertFails(
      as('alice').collection('ascension_scores').add(ascensions('Challenge', { phaseStats: stats.map((p, i) => (i === 3 ? { ...p, found: 50 } : p)) }))
    )
    await assertFails(
      as('alice').collection('ascension_scores').add(ascensions('Challenge', { phaseStats: stats.map((p, i) => (i === 0 ? { ...p, count: 8 } : p)) }))
    )
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Découverte', { phaseStats: phaseStatsOf('Progressif'), totalFound: 16 })))
    await assertFails(as('alice').collection('ascension_scores').add(ascensions('Challenge', { phaseStats: [1, 2, 3] })))
  })
})

describe('daily scores', () => {
  it('accepts a normal Border Guess or Country Clue, and the longest one', async () => {
    for (const gameType of ['BORDER_GUESS', 'COUNTRY_CLUE']) {
      await assertSucceeds(as('alice').collection('daily_scores').add(dailies({ gameType })))
      await assertSucceeds(anonymous().collection('daily_scores').add(dailies({ gameType, name: 'Zoe', uid: undefined, attempts: 1 })))
      await assertSucceeds(as('alice').collection('daily_scores').add(dailies({ gameType, dailyKey: 'x', attempts: daily.attempts[gameType] })))
      await assertFails(as('alice').collection('daily_scores').add(dailies({ gameType, dailyKey: 'y', attempts: daily.attempts[gameType] + 1 })))
    }
  })

  it('refuses a daily solved in no attempt, or with hints it does not have', async () => {
    await assertFails(as('alice').collection('daily_scores').add(dailies({ attempts: 0 })))
    await assertFails(as('alice').collection('daily_scores').add(dailies({ attempts: -1 })))
    await assertFails(as('alice').collection('daily_scores').add(dailies({ hints: 1 })))
    await assertSucceeds(as('alice').collection('daily_scores').add(dailies({ hints: 0 })))
  })

  it('accepts a quiz up to 5 attempts and 3 hints, no more', async () => {
    const quiz = (overrides) => dailies({ gameType: 'QUIZ', ...overrides })
    await assertSucceeds(as('alice').collection('daily_scores').add(quiz({ attempts: 1, hints: 0 })))
    await assertSucceeds(as('alice').collection('daily_scores').add(quiz({ dailyKey: 'a', attempts: 5, hints: 3 })))
    await assertSucceeds(anonymous().collection('daily_scores').add(quiz({ name: 'Zoe', uid: undefined, attempts: 5, hints: 3 })))
    await assertFails(as('alice').collection('daily_scores').add(quiz({ dailyKey: 'b', attempts: 6 })))
    await assertFails(as('alice').collection('daily_scores').add(quiz({ dailyKey: 'c', attempts: 3, hints: 4 })))
    await assertFails(as('alice').collection('daily_scores').add(quiz({ dailyKey: 'd', attempts: 0, hints: 0 })))
  })

  it('accepts Voyage Voyage steps, hints and wrong guesses, within the countries', async () => {
    const voyage = (overrides) => dailies({ gameType: 'VOYAGE_VOYAGE', ...overrides })
    await assertSucceeds(as('alice').collection('daily_scores').add(voyage({ attempts: 6, elapsedTime: 4, hints: 2 })))
    await assertSucceeds(
      as('alice').collection('daily_scores').add(voyage({ dailyKey: 'a', attempts: daily.attempts.VOYAGE_VOYAGE, elapsedTime: daily.voyageWrong.VOYAGE_VOYAGE, hints: 3 }))
    )
    await assertFails(as('alice').collection('daily_scores').add(voyage({ dailyKey: 'b', attempts: daily.attempts.VOYAGE_VOYAGE + 1 })))
    await assertFails(as('alice').collection('daily_scores').add(voyage({ dailyKey: 'c', elapsedTime: daily.voyageWrong.VOYAGE_VOYAGE + 1 })))
    await assertFails(as('alice').collection('daily_scores').add(voyage({ dailyKey: 'd', hints: 4 })))
    await assertFails(as('alice').collection('daily_scores').add(voyage({ dailyKey: 'e', attempts: 0 })))
  })

  it('refuses a game that has no daily', async () => {
    await assertFails(as('alice').collection('daily_scores').add(dailies({ gameType: 'PLACEMENT' })))
    await assertFails(as('alice').collection('daily_scores').add(dailies({ gameType: 'Cheat' })))
  })

  it('accepts a Country Ranking up to perfect first tries on every criterion, and no better', async () => {
    const ranking = (overrides) => rankings(overrides)
    const orders = ['Population : A > B > C > D > E', 'PIB : B > A > C > D > E', 'Superficie : E > D > C > B > A']
    // 3 criteria, each found at the first try
    await assertSucceeds(as('alice').collection('daily_scores').add(ranking({ score: 9, attemptsUsed: 3, playerOrder: orders })))
    // found at the 2nd and 3rd tries, one criterion failed (its best total error counts)
    await assertSucceeds(anonymous().collection('daily_scores').add(ranking({ name: 'Zoe', uid: undefined, dailyKey: 'a', score: 3, totalError: 4, attemptsUsed: 8, playerOrder: orders })))
    // all failed: no point, 12 is the worst order of 5 countries, on each criterion
    await assertSucceeds(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'b', score: 0, totalError: 36, attemptsUsed: 9 })))
    // saved before the criteria stages: one criterion, the 5 countries
    await assertSucceeds(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'j', score: 3, attemptsUsed: 1 })))
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'c', score: 10, attemptsUsed: 1 })))
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'd', score: 1000000 })))
    // more points than the attempts allow: 9 points take exactly 3 attempts
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'e', score: 9, attemptsUsed: 4 })))
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'f', score: 0, totalError: daily.ranking.totalError + 1 })))
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'g', score: 0, attemptsUsed: 10 })))
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'h', attemptsUsed: 0 })))
    await assertFails(as('alice').collection('daily_scores').add(ranking({ dailyKey: 'i', playerOrder: new Array(6).fill('A') })))
  })

  it('accepts a Daily Challenge from 0 to 12 right answers, whoever the player is', async () => {
    const twelve = Array(12).fill(true)
    await assertSucceeds(as('alice').collection('daily_scores').add(challenges()))
    await assertSucceeds(as('alice').collection('daily_scores').add(challenges({ dailyKey: 'a', score: 12, results: twelve })))
    await assertSucceeds(as('alice').collection('daily_scores').add(challenges({ dailyKey: 'b', score: 0, results: Array(12).fill(false) })))
    await assertSucceeds(anonymous().collection('daily_scores').add(challenges({ name: 'Zoe', uid: undefined })))
    await assertSucceeds(as('alice').collection('daily_scores').add(challenges({ dailyKey: 'c', elapsedTime: daily.challenge.minTime })))
  })

  it('refuses a Daily Challenge with an impossible score, results or time', async () => {
    const add = (overrides) => as('alice').collection('daily_scores').add(challenges(overrides))
    await assertFails(add({ dailyKey: 'a', score: 13, results: Array(12).fill(true) }))
    await assertFails(add({ dailyKey: 'b', score: -1 }))
    await assertFails(add({ dailyKey: 'c', score: 8.5 }))
    await assertFails(add({ dailyKey: 'd', score: 1000000 }))
    // not 12 rounds
    await assertFails(add({ dailyKey: 'e', results: Array(11).fill(true), score: 5 }))
    await assertFails(add({ dailyKey: 'f', results: Array(13).fill(true), score: 5 }))
    // not booleans
    await assertFails(add({ dailyKey: 'g', results: Array(12).fill('correct') }))
    await assertFails(add({ dailyKey: 'h', results: 'yes' }))
    // faster than a round can be played, or not a time at all
    await assertFails(add({ dailyKey: 'i', elapsedTime: daily.challenge.minTime - 1 }))
    await assertFails(add({ dailyKey: 'j', elapsedTime: 1000000001 }))
    await assertFails(add({ dailyKey: 'k', elapsedTime: undefined }))
    await assertFails(add({ dailyKey: 'l', results: undefined }))
    // keys of another game
    await assertFails(add({ dailyKey: 'm', attempts: 3 }))
    await assertFails(add({ dailyKey: 'n', guesses: ['A'] }))
  })

  it('never replaces a saved Daily Challenge', async () => {
    const ref = await as('alice').collection('daily_scores').add(challenges({ score: 4 }))
    await assertFails(as('alice').doc(ref.path).set(challenges({ score: 12, results: Array(12).fill(true) })))
    await assertFails(as('alice').doc(ref.path).update({ score: 5 }))
  })

  it('does not take a Daily Challenge for another daily', async () => {
    // the other games' shape with the challenge's game type
    await assertFails(as('alice').collection('daily_scores').add(dailies({ gameType: 'DAILY_CHALLENGE' })))
  })

  it('never replaces a saved daily, even with a better one', async () => {
    const ref = await as('alice').collection('daily_scores').add(dailies({ attempts: 6 }))
    await assertFails(as('alice').doc(ref.path).set(dailies({ attempts: 3 })))
    await assertFails(as('alice').doc(ref.path).update({ attempts: 1 }))
    const ranking = await as('alice').collection('daily_scores').add(rankings({ dailyKey: 'z', score: 1, attemptsUsed: 3 }))
    await assertFails(as('alice').doc(ranking.path).set(rankings({ dailyKey: 'z', score: 3, attemptsUsed: 1 })))
  })
})

const countryOfDays = (overrides = {}) =>
  clean({
    name: 'Alice',
    uid: 'alice',
    gameType: 'COUNTRY_OF_DAY',
    dailyKey: '2026-11-05',
    mode: 'free',
    steps: [2, 1, 1, 0],
    score: 390,
    elapsedTime: 95000,
    ...overrides,
  })

describe('Country of the Day scores', () => {
  it('accepts the score its tries give, in both modes, even 0', async () => {
    await assertSucceeds(as('alice').collection('daily_scores').add(countryOfDays()))
    await assertSucceeds(as('alice').collection('daily_scores').add(countryOfDays({ dailyKey: 'b', mode: 'choice', steps: [1, 1, 1, 1], score: 400 })))
    await assertSucceeds(as('alice').collection('daily_scores').add(countryOfDays({ dailyKey: 'c', steps: [0, 0, 0, 0], score: 0 })))
  })

  it('refuses a score the tries do not give', async () => {
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ score: 600 })))
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ mode: 'choice' })))
  })

  it('refuses broken tries, modes, times or fields', async () => {
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ steps: [4, 1, 1, 0], score: 285 })))
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ steps: [1, 1, 1], score: 450 })))
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ steps: [1.5, 1, 1, 0], score: 300 })))
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ mode: 'hard' })))
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ elapsedTime: 100 })))
    await assertFails(as('alice').collection('daily_scores').add(countryOfDays({ attempts: 1 })))
    await assertFails(as('alice').collection('daily_scores').add(dailies({ gameType: 'COUNTRY_OF_DAY' })))
  })
})

const survivals = (overrides = {}) =>
  clean({ name: 'Alice', uid: 'alice', modes: 'FLAGS+CAPITALS', lives: 3, timer: 30, ramp: 'normal', score: 12, elapsedTime: 90000, ...overrides })

describe('survival scores', () => {
  it('accepts a run of any set of games and lives, signed in or as a visitor', async () => {
    await assertSucceeds(as('alice').collection('survival_scores').add(survivals()))
    await assertSucceeds(as('alice').collection('survival_scores').add(survivals({ modes: 'PLACEMENT+FLAGS+CAPITALS+BORDER_GUESS', lives: 10, timer: 0 })))
    await assertSucceeds(anonymous().collection('survival_scores').add(survivals({ name: 'Zoe', uid: undefined, modes: 'CAPITALS', lives: 1 })))
  })

  it('refuses unknown games, lives or timers', async () => {
    await assertFails(as('alice').collection('survival_scores').add(survivals({ modes: 'FLAGS+CHEAT' })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ modes: 'FLAGS+COUNTRY_CLUE' })))
    // The hidden Geo Quiz: no new run with quiz rounds
    await assertFails(as('alice').collection('survival_scores').add(survivals({ modes: 'FLAGS+QUIZ' })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ modes: 'QUIZ' })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ timer: 45 })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ timer: undefined })))
    // A custom ramp is not ranked
    await assertFails(as('alice').collection('survival_scores').add(survivals({ ramp: 'custom' })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ ramp: undefined })))
    await assertSucceeds(as('alice').collection('survival_scores').add(survivals({ ramp: 'hardcore' })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ modes: '' })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ lives: 2 })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ lives: 100 })))
  })

  it('refuses more rounds than a run has, an empty run, and a run too fast', async () => {
    await assertSucceeds(as('alice').collection('survival_scores').add(survivals({ score: 300, elapsedTime: 90000 })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ score: 301, elapsedTime: 900000 })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ score: 0 })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ score: 12, elapsedTime: 3000 })))
    await assertFails(as('alice').collection('survival_scores').add(survivals({ elapsedTime: undefined })))
  })

  it('only replaces a run with a better one of the same games, lives, timer and ramp', async () => {
    const ref = await as('alice').collection('survival_scores').add(survivals())
    await assertSucceeds(as('alice').doc(ref.path).set(survivals({ score: 15, elapsedTime: 100000 })))
    await assertFails(as('alice').doc(ref.path).set(survivals({ score: 10 })))
    await assertFails(as('alice').doc(ref.path).set(survivals({ score: 20, lives: 5 })))
    await assertFails(as('alice').doc(ref.path).set(survivals({ score: 20, modes: 'FLAGS' })))
    await assertFails(as('alice').doc(ref.path).set(survivals({ score: 20, timer: 60 })))
    await assertFails(as('alice').doc(ref.path).set(survivals({ score: 20, ramp: 'express' })))
  })
})
