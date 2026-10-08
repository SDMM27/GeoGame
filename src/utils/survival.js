// src/utils/survival.js
// Survival mode, shared by the website and the app: rounds of the chosen games one after another
// (a flag, then a border, then a capital…), getting harder, until the player runs out of lives.
// Every wrong answer costs a life; giving up a round too. Pure: no DOM, no Firestore.
//
// The rounds come from a seed, so every player of a multiplayer room gets the same ones.
import countries from '../data/countriesWithDifficulty_FR.json'
import { BORDER_GUESS_COUNTRIES } from '../hooks/useBorderGuessState'
import { COUNTRY_CLUE_COUNTRIES } from '../hooks/useCountryClueState'
import { GAME_TYPES } from './gameTypes'
import { matchKnownAnswer } from './answerLexicon'
import { getAllCapitalNames, getAllCountryNames } from './getCountryName'
import { ANSWER_MODES, generateQuestion } from './quizQuestions'
import { mulberry32, seededShuffle } from './prng'
import { SURVIVAL_MAX_ROUNDS, normalizeSurvivalModes } from './survivalConfig'

export * from './survivalConfig'

const TIERS = ['Facile', 'Moyen', 'Difficile', 'Impossible']

// Difficulty field of each game, used to serve easy countries first.
const DIFFICULTY_FIELD = {
  [GAME_TYPES.PLACEMENT]: 'Difficulty',
  [GAME_TYPES.FLAGS]: 'DifficultyFlag',
  [GAME_TYPES.CAPITALS]: 'DifficultyCapitals',
  [GAME_TYPES.BORDER_GUESS]: 'Difficulty',
  [GAME_TYPES.COUNTRY_CLUE]: 'Difficulty',
}

// Quiz: the quiz rounds from which each harder difficulty is asked.
const QUIZ_TIER_STARTS = [0, 8, 20, 40]

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
    case GAME_TYPES.COUNTRY_CLUE:
      return COUNTRY_CLUE_COUNTRIES
    default:
      return []
  }
}

const tierOf = (feature, type) => {
  const index = TIERS.indexOf(feature.properties[DIFFICULTY_FIELD[type]])
  return index === -1 ? TIERS.length - 1 : index
}

/** The countries of a game, easiest tier first, shuffled within each tier. */
function countryQueue(type, seed) {
  const features = pool(type)
  return TIERS.flatMap((_, tier) =>
    seededShuffle(features.filter((feature) => tierOf(feature, type) === tier), (seed + tier * 7919) >>> 0)
  )
}

function quizDifficulty(quizIndex) {
  let tier = 0
  QUIZ_TIER_STARTS.forEach((start, index) => {
    if (quizIndex >= start) tier = index
  })
  return TIERS[tier]
}

const typeSeed = (seed, type) => {
  let hash = seed >>> 0
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) >>> 0
  return hash
}

/**
 * The rounds of a run: [{ type, country }] (a GeoJSON feature) or [{ type: QUIZ, question }].
 * Each cycle plays every chosen game once, in a shuffled order (never the same game twice in a row); each game
 * serves its easy countries first.
 * A game whose countries are all used drops out; the run ends after SURVIVAL_MAX_ROUNDS.
 */
export function buildSurvivalRounds(types, seed, max = SURVIVAL_MAX_ROUNDS) {
  const modes = normalizeSurvivalModes(types)
  if (modes.length === 0) return []
  const queues = Object.fromEntries(
    modes.filter((type) => type !== GAME_TYPES.QUIZ).map((type) => [type, countryQueue(type, typeSeed(seed, type))])
  )
  const quizRandom = mulberry32(typeSeed(seed, GAME_TYPES.QUIZ))
  const quizKeys = new Set()
  const taken = Object.fromEntries(modes.map((type) => [type, 0]))
  const rounds = []

  for (let cycle = 0; rounds.length < max; cycle++) {
    const order = seededShuffle(modes, (seed * 31 + cycle * 1000003) >>> 0)
    // Not the same game twice in a row from one cycle to the next
    if (order.length > 1 && order[0] === rounds.at(-1)?.type) order.push(order.shift())
    let added = 0
    for (const type of order) {
      if (rounds.length >= max) break
      if (type === GAME_TYPES.QUIZ) {
        const question = generateQuestion(quizDifficulty(taken[type]), quizKeys, quizRandom, ANSWER_MODES.CHOICES)
        if (!question) continue
        question.usedKeys.forEach((key) => quizKeys.add(key))
        rounds.push({ type, question })
      } else {
        const country = queues[type][taken[type]]
        if (!country) continue
        rounds.push({ type, country })
      }
      taken[type] += 1
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
