export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    // Typographic and Ukrainian apostrophes ("Мʼянма") read like the one on the keyboard
    .replace(/[-'’ʼ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkAnswer(input, target, aliases = [], extraNames = []) {
  const normalizedInput = normalize(input)
  const candidates = [target, ...aliases, ...extraNames].map(normalize)
  return candidates.includes(normalizedInput)
}

// Fautes tolérées selon la longueur du nom attendu : les noms courts (Iran, Irak, Mali…) restent stricts
export function getTypoTolerance(length) {
  if (length <= 4) return 0
  if (length <= 8) return 1
  return 2
}

// Distance de Damerau-Levenshtein (variante OSA) : une inversion de deux lettres adjacentes compte pour 1.
// Renvoie max + 1 dès que la distance dépasse max, pour éviter des calculs inutiles.
export function typoDistance(a, b, max = Infinity) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1

  let prevPrev = null
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (prevPrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1)
      }
      curr.push(value)
      if (value < rowMin) rowMin = value
    }
    if (rowMin > max) return max + 1
    prevPrev = prev
    prev = curr
  }
  return prev[b.length]
}

/**
 * Compare une réponse en tolérant les fautes de frappe.
 * @param {string} input - saisie du joueur
 * @param {string[]} accepted - noms acceptés pour la bonne réponse (cible + alias + traductions)
 * @param {Iterable<string>} [knownAnswers] - toutes les réponses possibles du jeu ; une saisie
 *   aussi proche (ou plus) d'une autre réponse est refusée (ex. « Zambie » pour la Gambie)
 * @param {{ whileTyping?: boolean, coreOf?: (name: string) => string }} [options]
 *   whileTyping : pendant la frappe, une faute n'est tolérée que si la saisie est au moins aussi longue que le nom (évite de valider « Gambi »).
 *   coreOf : partie distinctive d'un nom, sur laquelle se mesure la tolérance (« Kenya » pour
 *   « le mont Kenya » : sinon « mont konoa », à deux fautes, passerait)
 * @returns {{ match: 'exact' | 'typo', name: string } | null} name = orthographe correcte la plus proche
 */
export function matchAnswer(input, accepted, knownAnswers = [], { whileTyping = false, coreOf = (name) => name } = {}) {
  const normalizedInput = normalize(input ?? '')
  if (!normalizedInput) return null

  const candidates = accepted.filter(Boolean).map((name) => ({ name, key: normalize(name) }))
  const exact = candidates.find((c) => c.key === normalizedInput)
  if (exact) return { match: 'exact', name: exact.name }

  let best = null
  for (const c of candidates) {
    const tolerance = Math.min(getTypoTolerance(c.key.length), getTypoTolerance(normalize(coreOf(c.name)).length))
    if (tolerance === 0) continue
    if (whileTyping && normalizedInput.length < c.key.length) continue
    const distance = typoDistance(normalizedInput, c.key, tolerance)
    if (distance <= tolerance && (!best || distance < best.distance)) best = { ...c, distance }
  }
  if (!best) return null

  const acceptedKeys = new Set(candidates.map((c) => c.key))
  for (const other of knownAnswers) {
    const key = normalize(other)
    if (acceptedKeys.has(key)) continue
    if (typoDistance(normalizedInput, key, best.distance) <= best.distance) return null
  }

  return { match: 'typo', name: best.name }
}
