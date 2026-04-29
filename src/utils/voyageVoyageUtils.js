import { mulberry32 } from './prng'

/**
 * Trouve le chemin le plus court entre deux pays (BFS).
 * @param {string} startISO - Code ISO A2 du pays de départ
 * @param {string} targetISO - Code ISO A2 du pays d'arrivée
 * @param {Record<string, string[]>} borders - Objet d'adjacence
 * @returns {string[] | null} Tableau de codes ISO du chemin, ou null si aucun chemin
 */
export function findShortestPath(startISO, targetISO, borders) {
  if (startISO === targetISO) return [startISO]
  const queue = [[startISO]]
  const visited = new Set([startISO])
  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]
    for (const neighbor of (borders[current] ?? [])) {
      if (neighbor === targetISO) return [...path, neighbor]
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return null
}

/**
 * Retourne le nombre minimal de frontières à traverser entre deux pays.
 * @returns {number | null}
 */
export function getOptimalLength(startISO, targetISO, borders) {
  const path = findShortestPath(startISO, targetISO, borders)
  return path ? path.length - 1 : null
}

/**
 * Vérifie si deux pays partagent une frontière terrestre.
 */
export function isNeighbor(isoA, isoB, borders) {
  return (borders[isoA] ?? []).includes(isoB)
}

/**
 * BFS depuis un pays — retourne un objet { iso: distance }.
 */
export function bfsDistances(startISO, borders) {
  const dist = { [startISO]: 0 }
  const queue = [startISO]
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of (borders[cur] ?? [])) {
      if (!(nb in dist)) {
        dist[nb] = dist[cur] + 1
        queue.push(nb)
      }
    }
  }
  return dist
}

/**
 * Vérifie si la liste d'ISOs forme un chemin connecté de start à target
 * (chaque pays adjacent au suivant dans la chaîne).
 */
export function isPathComplete(chainISOs, startISO, targetISO, borders) {
  if (!chainISOs.includes(targetISO)) return false
  const chainSet = new Set(chainISOs)
  const visited = new Set([startISO])
  const queue = [startISO]
  while (queue.length) {
    const cur = queue.shift()
    if (cur === targetISO) return true
    for (const nb of (borders[cur] ?? [])) {
      if (chainSet.has(nb) && !visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
  }
  return false
}

/**
 * Retourne la liste des pays éligibles (au moins une frontière).
 */
export function getEligibleCountries(borders) {
  return Object.entries(borders)
    .filter(([, neighbors]) => neighbors.length > 0)
    .map(([iso]) => iso)
}

/**
 * Calcule le score final.
 * score = max(1, optimalLength × 2 - stepsUsed - wrongGuesses × 0.5)
 */
export function computeScore(optimalLength, stepsUsed, wrongGuessCount) {
  return Math.max(1, optimalLength * 2 - stepsUsed - wrongGuessCount * 0.5)
}

/**
 * Sélectionne une paire aléatoire de pays avec un chemin d'au moins minPathLength étapes.
 * @param {Record<string, string[]>} borders
 * @param {number} minPathLength - Nombre minimum d'étapes (défaut : 3)
 * @param {() => number} rng - Générateur de nombres aléatoires (défaut : Math.random)
 * @returns {{ startISO: string, targetISO: string, optimalLength: number }}
 */
export function selectRandomPair(borders, minPathLength = 3, rng = Math.random) {
  const eligible = getEligibleCountries(borders)
  for (let attempt = 0; attempt < 2000; attempt++) {
    const startISO = eligible[Math.floor(rng() * eligible.length)]
    const targetISO = eligible[Math.floor(rng() * eligible.length)]
    if (startISO === targetISO) continue
    const length = getOptimalLength(startISO, targetISO, borders)
    if (length !== null && length >= minPathLength) {
      return { startISO, targetISO, optimalLength: length }
    }
  }
  throw new Error('Impossible de trouver une paire valide après 2000 tentatives.')
}

/**
 * Converts a date string (YYYY-MM-DD) to a numeric seed.
 */
function dateToSeed(dateString) {
  return dateString.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0) >>> 0
}

/**
 * Retourne la paire du jour (identique pour tous les joueurs).
 * @param {Record<string, string[]>} borders
 * @param {string} dateString - Format YYYY-MM-DD
 */
export function getDailyPair(borders, dateString) {
  const rng = mulberry32(dateToSeed(dateString))
  return selectRandomPair(borders, 3, rng)
}
