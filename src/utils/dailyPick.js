// src/utils/dailyPick.js
// Tirage du pays du jour qui ne dépend pas de la taille de la liste : chaque pays reçoit un score
// hash(seed + nom) et le plus haut l'emporte. Retirer ou ajouter un autre pays ne change donc pas le
// pays du jour, alors qu'un `hash % liste.length` le changeait pour tout le monde (et pour les appareils
// encore sur l'ancienne liste).

// Ancien tirage (`hash % length`) gardé pour les jours d'avant, déjà joués : leur pays ne change pas.
export const STABLE_DAILY_PICK_SINCE = '2026-10-10'

function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// Mélange final de MurmurHash3 : deux clés voisines donnent des scores sans rapport.
function mix(hash) {
  let h = hash
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** L'élément de `items` choisi pour `seed` (« border-guess:2026-10-10 »), `nameOf` donnant son nom stable. */
export function pickDaily(items, seed, nameOf) {
  let best = null
  let bestScore = -1
  for (const item of items) {
    const score = mix(fnv1a(`${seed}|${nameOf(item)}`))
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return best
}
