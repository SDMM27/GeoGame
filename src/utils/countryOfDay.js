// src/utils/countryOfDay.js
// The Country of the Day (docs/superpowers/specs/2026-10-29-pays-du-jour-design.md): the same country for everyone,
// discovered in 4 steps (its borders, its flag, its capital, its place on the map), then its info sheet.
// Pure: the country of a day, the choices of each step, the score and the share text. The game itself:
// hooks/useCountryOfDayState.js.
import { BORDER_GUESS_COUNTRIES, getBorderGuessDailyCountry } from '../hooks/useBorderGuessState'
import { getCountryClueDailyCountry } from '../hooks/useCountryClueState'
import { getCountryAreaKm2 } from './countryArea'
import { pickDaily } from './dailyPick'
import { seededOrder } from './prng'

export const COUNTRY_OF_DAY_STEPS = ['borders', 'flag', 'capital', 'placement']
// Tries per step: after the last wrong one the answer is shown and the step gives nothing
export const COUNTRY_OF_DAY_TRIES = 3

// 'choice': multiple choice. 'free': typed country and capital, more flags to choose from, 1.5 times the points.
export const COUNTRY_OF_DAY_MODES = ['choice', 'free']
// Points of a step by the try it was found on (index 0: not found)
export const COUNTRY_OF_DAY_POINTS = {
  choice: [0, 100, 60, 30],
  free: [0, 150, 90, 45],
}
export const COUNTRY_OF_DAY_MAX_SCORE = {
  choice: COUNTRY_OF_DAY_POINTS.choice[1] * COUNTRY_OF_DAY_STEPS.length,
  free: COUNTRY_OF_DAY_POINTS.free[1] * COUNTRY_OF_DAY_STEPS.length,
}

// How many answers a step offers (the right one included); null: typed or clicked on the map
export const COUNTRY_OF_DAY_CHOICES = {
  choice: { borders: 4, flag: 4, capital: 4, placement: null },
  free: { borders: null, flag: 8, capital: null, placement: null },
}

// The countries it can be: readable as a silhouette (Border Guess's list), with a flag and a capital
export const COUNTRY_OF_DAY_COUNTRIES = BORDER_GUESS_COUNTRIES.filter(
  (country) => country.properties.ISO_A2 && country.properties.capital
)

const BY_ADMIN = new Map(COUNTRY_OF_DAY_COUNTRIES.map((country) => [country.properties.ADMIN, country]))
export const findCountryOfDay = (admin) => BY_ADMIN.get(admin) ?? null

// Stable 32-bit hash of a text, the seed of the day's choices (the same on the site and in the app)
function seedOf(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0
  return hash >>> 0
}

const adminOf = (country) => country.properties.ADMIN

/** The country of a day ('2026-10-29'): never the one of Border Guess or Country Clue that day. */
export function getCountryOfDay(dailyKey) {
  const taken = new Set([getBorderGuessDailyCountry(dailyKey), getCountryClueDailyCountry(dailyKey)].filter(Boolean).map(adminOf))
  return pickDaily(COUNTRY_OF_DAY_COUNTRIES.filter((country) => !taken.has(adminOf(country))), `country-of-day:${dailyKey}`, adminOf)
}

// Flags that look alike (ISO codes), offered first as the wrong answers of the flag step
const FLAG_TWINS = [
  ['TD', 'RO', 'AD', 'MD'],
  ['ID', 'MC', 'PL', 'SG'],
  ['IE', 'CI', 'IT', 'MX'],
  ['NL', 'LU', 'FR', 'RU', 'HR', 'PY'],
  ['AU', 'NZ', 'CK', 'FJ', 'TV'],
  ['NO', 'IS', 'DK', 'FI', 'SE', 'FO'],
  ['SN', 'ML', 'GN', 'CM', 'GH', 'BJ'],
  ['CO', 'EC', 'VE'],
  ['SI', 'SK', 'RS', 'RU'],
  ['US', 'LR', 'MY', 'PR', 'CU'],
  ['NE', 'IN', 'CI'],
  ['HN', 'SV', 'NI', 'GT', 'AR'],
  ['AT', 'LV', 'LB', 'PE', 'CA'],
  ['BE', 'DE', 'UG'],
  ['QA', 'BH'],
  ['YE', 'EG', 'SY', 'IQ', 'SD'],
  ['JO', 'PS', 'SD', 'KW', 'AE', 'EH'],
  ['BO', 'GH', 'LT', 'ET'],
  ['KR', 'JP', 'BD', 'PW'],
  ['DZ', 'PK', 'TM', 'MR'],
  ['TN', 'TR', 'MV'],
  ['ME', 'AL', 'MK'],
  ['GR', 'UY'],
  ['LK', 'BT'],
  ['KE', 'MW', 'SS'],
  ['CL', 'PR', 'CZ', 'PH'],
  ['VN', 'CN', 'MA'],
]

/**
 * The wrong answers offered for `country` among `pool`: `count` countries, in an order fixed by `seed`.
 * Those `preferred` first, then the ones of its continent (closest by `closeness`, a few kept at random among the
 * closest so that it isn't always the same ones), then any other.
 */
function pickDecoys(country, pool, count, seed, { preferred = new Set(), closeness = null } = {}) {
  const target = adminOf(country)
  const others = pool.filter((other) => adminOf(other) !== target)
  const ordered = seededOrder(others, seed, adminOf)
  const first = ordered.filter((other) => preferred.has(adminOf(other)))
  const continent = country.properties.continent
  let sameContinent = ordered.filter((other) => !preferred.has(adminOf(other)) && continent && other.properties.continent === continent)
  if (closeness) {
    const closest = [...sameContinent].sort((a, b) => closeness(a) - closeness(b)).slice(0, Math.max(count * 2, 6))
    const kept = new Set(closest.map(adminOf))
    sameContinent = sameContinent.filter((other) => kept.has(adminOf(other)))
  }
  const rest = ordered.filter((other) => !first.includes(other) && !sameContinent.includes(other))
  return [...first, ...sameContinent, ...rest].slice(0, count)
}

const flagTwinsOf = (iso) => new Set(FLAG_TWINS.filter((group) => group.includes(iso)).flat().filter((other) => other !== iso))

/**
 * The answers a step offers, the right one included, in the order to show them: country features (ADMIN, ISO_A2,
 * capital... in `properties`). null when the step is typed or played on the map.
 */
export function getStepChoices(country, step, mode, dailyKey) {
  const count = COUNTRY_OF_DAY_CHOICES[mode]?.[step]
  if (!country || !count) return null
  const seed = seedOf(`country-of-day:${dailyKey}:${step}`)
  let decoys
  if (step === 'borders') {
    const area = Math.log(getCountryAreaKm2(country) || 1)
    decoys = pickDecoys(country, COUNTRY_OF_DAY_COUNTRIES, count - 1, seed, {
      closeness: (other) => Math.abs(Math.log(getCountryAreaKm2(other) || 1) - area),
    })
  } else if (step === 'flag') {
    const twins = flagTwinsOf(country.properties.ISO_A2)
    const byIso = (other) => (twins.has(other.properties.ISO_A2) ? adminOf(other) : null)
    decoys = pickDecoys(country, COUNTRY_OF_DAY_COUNTRIES, count - 1, seed, {
      preferred: new Set(COUNTRY_OF_DAY_COUNTRIES.map(byIso).filter(Boolean)),
    })
  } else {
    decoys = pickDecoys(country, COUNTRY_OF_DAY_COUNTRIES, count - 1, seed)
  }
  return seededOrder([country, ...decoys], seed ^ 0x5bd1e995, adminOf)
}

/** Points of a step: `tries` is the try it was found on (1 to 3), 0 when it wasn't. */
export function stepPoints(tries, mode) {
  return COUNTRY_OF_DAY_POINTS[mode]?.[tries] ?? 0
}

/** Score of a game: `steps`, the try each step was found on (0: not found). */
export function countryOfDayScore(steps, mode) {
  return steps.reduce((total, tries) => total + stepPoints(tries, mode), 0)
}

const STEP_EMOJI = { borders: '🧭', flag: '🏳️', capital: '🏛️', placement: '📍' }

/** One line per game to share: "🧭 2/3 · 🏳️ 1/3 · 🏛️ 1/3 · 📍 ❌". */
export function countryOfDayShareLine(steps) {
  return COUNTRY_OF_DAY_STEPS.map((step, i) => `${STEP_EMOJI[step]} ${steps[i] ? `${steps[i]}/${COUNTRY_OF_DAY_TRIES}` : '❌'}`).join(' · ')
}
