// src/utils/survival.js
// Survival mode, shared by the website and the app: rounds of the chosen games one after another
// (a flag, then a border, then a capital…), getting harder, until the player runs out of lives.
// Every wrong answer costs a life; giving up a round or running out of time too. Pure: no DOM, no Firestore.
//
// The rounds come from a seed, so every player of a multiplayer room gets the same ones.
import countries from '../data/countriesWithDifficulty_FR.json'
import { BORDER_GUESS_COUNTRIES } from '../hooks/useBorderGuessState'
import { GAME_TYPES } from './gameTypes'
import { matchKnownAnswer } from './answerLexicon'
import { getAllCapitalNames, getAllCountryNames } from './getCountryName'
import { ANSWER_MODES, generateQuestion } from './quizQuestions'
import { mulberry32, seededShuffle } from './prng'
import { SURVIVAL_MAX_ROUNDS, normalizeSurvivalModes, normalizeSurvivalRamp } from './survivalConfig'

export * from './survivalConfig'

const TIERS = ['Facile', 'Moyen', 'Difficile', 'Impossible']

// Difficulty field of each game, used to serve easy countries first.
const DIFFICULTY_FIELD = {
  [GAME_TYPES.PLACEMENT]: 'Difficulty',
  [GAME_TYPES.FLAGS]: 'DifficultyFlag',
  [GAME_TYPES.CAPITALS]: 'DifficultyCapitals',
  [GAME_TYPES.BORDER_GUESS]: 'Difficulty',
}

/**
 * Difficulty of round `index` (0-based, all games together) of a run whose ramp is `steps`
 * ({ Facile, Moyen, Difficile }: rounds at each difficulty, Impossible after them; see SURVIVAL_RAMPS).
 */
export function survivalDifficulty(index, steps) {
  const ramp = normalizeSurvivalRamp(steps)
  let end = 0
  for (const tier of TIERS.slice(0, 3)) {
    end += ramp[tier]
    if (index < end) return tier
  }
  return 'Impossible'
}

function pool(type) {
  switch (type) {
    case GAME_TYPES.PLACEMENT:
      return countries.features.filter((c) => TIERS.includes(c.properties.Difficulty))
    case GAME_TYPES.FLAGS:
      return countries.features.filter((c) => c.properties.ISO_A2 && TIERS.includes(c.properties.DifficultyFlag))
    case GAME_TYPES.CAPITALS:
      return countries.features.filter(
        (c) => c.properties.ISO_A2 && c.properties.capital && TIERS.includes(c.properties.DifficultyCapitals)
      )
    case GAME_TYPES.BORDER_GUESS:
      return BORDER_GUESS_COUNTRIES
    default:
      return []
  }
}

const tierOf = (feature, type) => {
  const index = TIERS.indexOf(feature.properties[DIFFICULTY_FIELD[type]])
  return index === -1 ? TIERS.length - 1 : index
}

/** The countries of a game by difficulty, each shuffled: [Facile[], Moyen[], Difficile[], Impossible[]]. */
function countryTiers(type, seed) {
  const features = pool(type)
  return TIERS.map((_, tier) =>
    seededShuffle(features.filter((feature) => tierOf(feature, type) === tier), (seed + tier * 7919) >>> 0)
  )
}

/**
 * Takes a country of difficulty `tier` from `tiers` (removing it). When there are none left: the next harder ones,
 * then the next easier ones. Null when the game has no country left.
 */
function takeCountry(tiers, tier) {
  const order = [...TIERS.keys()].filter((i) => i >= tier).concat([...TIERS.keys()].filter((i) => i < tier).reverse())
  for (const i of order) {
    if (tiers[i].length) return { country: tiers[i].shift(), difficulty: TIERS[i] }
  }
  return null
}

const typeSeed = (seed, type) => {
  let hash = seed >>> 0
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) >>> 0
  return hash
}

/**
 * The rounds of a run: [{ type, difficulty, country }] (a GeoJSON feature) or [{ type: QUIZ, difficulty, question }].
 * Each cycle plays every chosen game once, in a shuffled order (never the same game twice in a row). The difficulty
 * rises with the round number, whatever the game, as the ramp `steps` says (survivalDifficulty).
 * A game whose countries are all used drops out; the run ends after SURVIVAL_MAX_ROUNDS.
 */
export function buildSurvivalRounds(types, seed, max = SURVIVAL_MAX_ROUNDS, steps = null) {
  const modes = normalizeSurvivalModes(types)
  if (modes.length === 0) return []
  const tiers = Object.fromEntries(
    modes.filter((type) => type !== GAME_TYPES.QUIZ).map((type) => [type, countryTiers(type, typeSeed(seed, type))])
  )
  const quizRandom = mulberry32(typeSeed(seed, GAME_TYPES.QUIZ))
  const quizKeys = new Set()
  const rounds = []

  for (let cycle = 0; rounds.length < max; cycle++) {
    const order = seededShuffle(modes, (seed * 31 + cycle * 1000003) >>> 0)
    // Not the same game twice in a row from one cycle to the next
    if (order.length > 1 && order[0] === rounds.at(-1)?.type) order.push(order.shift())
    let added = 0
    for (const type of order) {
      if (rounds.length >= max) break
      const difficulty = survivalDifficulty(rounds.length, steps)
      if (type === GAME_TYPES.QUIZ) {
        const question = generateQuestion(difficulty, quizKeys, quizRandom, ANSWER_MODES.CHOICES)
        if (!question) continue
        question.usedKeys.forEach((key) => quizKeys.add(key))
        rounds.push({ type, difficulty: question.difficulty, question })
      } else {
        const taken = takeCountry(tiers[type], TIERS.indexOf(difficulty))
        if (!taken) continue
        rounds.push({ type, ...taken })
      }
      added += 1
    }
    if (added === 0) break
  }
  return rounds
}

/** Typed answer of a Flags round: the country's name, in any language. */
export function checkCountryName(country, input) {
  const p = country.properties
  const aliases = p.aliases ?? []
  return Boolean(input.trim()) && Boolean(matchKnownAnswer(input, [p.ADMIN, ...aliases, ...getAllCountryNames(p.ISO_A2, p.ADMIN, aliases)]))
}

/** Typed answer of a Capitals round. */
export function checkCapitalName(country, input) {
  const p = country.properties
  const aliases = p.capitalAliases ?? []
  return Boolean(input.trim()) && Boolean(matchKnownAnswer(input, [p.capital, ...aliases, ...getAllCapitalNames(p.ISO_A2, p.capital, aliases)]))
}

/** Same check while the player types, so that a right answer validates itself. */
export function matchesWhileTyping(round, input) {
  if (!input.trim() || !round?.country) return false
  const p = round.country.properties
  if (round.type === GAME_TYPES.FLAGS) {
    return Boolean(matchKnownAnswer(input, getAllCountryNames(p.ISO_A2, p.ADMIN, p.aliases ?? []), { whileTyping: true }))
  }
  if (round.type === GAME_TYPES.CAPITALS) {
    return Boolean(matchKnownAnswer(input, getAllCapitalNames(p.ISO_A2, p.capital, p.capitalAliases ?? []), { whileTyping: true }))
  }
  return false
}
