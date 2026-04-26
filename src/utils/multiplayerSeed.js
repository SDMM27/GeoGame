// src/utils/multiplayerSeed.js
import { seededShuffle } from './prng'
import { GAME_TYPES } from './gameTypes'
import { BORDER_GUESS_COUNTRIES } from '../hooks/useBorderGuessState'
import { COUNTRY_CLUE_COUNTRIES } from '../hooks/useCountryClueState'
import countries from '../data/countriesWithDifficulty_FR.json'

/** Dérive un seed différent par jeu pour éviter toute corrélation entre parties */
function gameSeed(seed, gameIndex) {
  return ((seed * 7919 + gameIndex * 1000003) >>> 0)
}

function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return [difficulty]
}

/** PLACEMENT — retourne un tableau de noms (strings ADMIN) */
export function getSeededPlacementCountries(difficulty, seed, gameIndex) {
  const available = getAvailableDifficulties(difficulty)
  const pool = countries.features
    .filter(c => available.includes(c.properties.Difficulty))
    .map(c => c.properties.ADMIN)
  return seededShuffle(pool, gameSeed(seed, gameIndex))
}

/** FLAGS — retourne un tableau de features GeoJSON */
export function getSeededFlagCountries(difficulty, seed, gameIndex) {
  const available = getAvailableDifficulties(difficulty)
  const pool = countries.features.filter(c =>
    available.includes(c.properties.DifficultyFlag) && c.properties.ISO_A2
  )
  return seededShuffle(pool, gameSeed(seed, gameIndex))
}

/** CAPITALS — retourne un tableau de features GeoJSON */
export function getSeededCapitalCountries(difficulty, seed, gameIndex) {
  const available = getAvailableDifficulties(difficulty)
  const pool = countries.features.filter(c =>
    available.includes(c.properties.DifficultyCapitals) && c.properties.ISO_A2 && c.properties.capital
  )
  return seededShuffle(pool, gameSeed(seed, gameIndex))
}

/**
 * Ascension — retourne { [difficulty]: feature[] } pour chaque palier non nul.
 * Chaque palier a sa propre sous-seed pour garantir l'indépendance des pools.
 */
export function getSeededAscensionOverrides(phases, gameType, seed, gameIndex) {
  const DIFFICULTY_PROP = {
    [GAME_TYPES.PLACEMENT]: 'Difficulty',
    [GAME_TYPES.FLAGS]: 'DifficultyFlag',
    [GAME_TYPES.CAPITALS]: 'DifficultyCapitals',
  }
  const diffProp = DIFFICULTY_PROP[gameType] ?? 'Difficulty'
  const extraFilter =
    gameType === GAME_TYPES.PLACEMENT ? () => true :
      gameType === GAME_TYPES.CAPITALS ? c => c.properties.ISO_A2 && c.properties.capital :
        c => !!c.properties.ISO_A2

  const result = {}
  let derivedSeed = gameSeed(seed, gameIndex)

  // FIX : Ordre déterministe absolu et incontestable
  const DIFFICULTIES_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore'];

  DIFFICULTIES_ORDER.forEach(difficulty => {
    const count = phases[difficulty];
    if (!count) return;

    const pool = countries.features.filter(c =>
      c.properties[diffProp] === difficulty && extraFilter(c)
    )
    // La seed est maintenant mutée de façon strictement identique pour tous
    derivedSeed = ((derivedSeed * 6271 + 1009) >>> 0)
    result[difficulty] = seededShuffle(pool, derivedSeed).slice(0, count)
  })

  return result
}

/** BORDER_GUESS — retourne `countryCount` features dans un ordre déterministe */
export function getSeededBorderGuessCountries(countryCount, seed, gameIndex) {
  const shuffled = seededShuffle(BORDER_GUESS_COUNTRIES, gameSeed(seed, gameIndex))
  return shuffled.slice(0, Math.min(countryCount, shuffled.length))
}

/** COUNTRY_CLUE — retourne `countryCount` features dans un ordre déterministe */
export function getSeededCountryClueCountries(countryCount, seed, gameIndex) {
  const shuffled = seededShuffle(COUNTRY_CLUE_COUNTRIES, gameSeed(seed, gameIndex))
  return shuffled.slice(0, Math.min(countryCount, shuffled.length))
}

/**
 * Dispatcher principal : retourne la liste de pays pour un gameConfig donné.
 */
export function getSeededCountriesForGame(gameConfig, seed, gameIndex) {
  const { type, mode, difficulty, phases, countryCount } = gameConfig
  if (type === GAME_TYPES.PLACEMENT) {
    if (mode === 'ascension') return getSeededAscensionOverrides(phases, type, seed, gameIndex)
    return getSeededPlacementCountries(difficulty, seed, gameIndex)
  }
  if (type === GAME_TYPES.FLAGS) {
    if (mode === 'ascension') return getSeededAscensionOverrides(phases, type, seed, gameIndex)
    return getSeededFlagCountries(difficulty, seed, gameIndex)
  }
  if (type === GAME_TYPES.CAPITALS) {
    if (mode === 'ascension') return getSeededAscensionOverrides(phases, type, seed, gameIndex)
    return getSeededCapitalCountries(difficulty, seed, gameIndex)
  }
  if (type === GAME_TYPES.BORDER_GUESS) return getSeededBorderGuessCountries(countryCount, seed, gameIndex)
  if (type === GAME_TYPES.COUNTRY_CLUE) return getSeededCountryClueCountries(countryCount, seed, gameIndex)
  return []
}
