// src/utils/prng.js

/**
 * mulberry32 — PRNG 32-bit déterministe.
 * Retourne une fonction générant des floats dans [0, 1).
 */
export function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

/**
 * Fisher-Yates shuffle avec PRNG seedé.
 * Ne mute pas le tableau original.
 */
export function seededShuffle(array, seed) {
  const arr = [...array]
  const random = mulberry32(seed)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Hash 32 bits d'une chaîne, dépendant du seed (FNV-1a puis mélange final de murmur3). */
function hashKey(key, seed) {
  let h = (0x811c9dc5 ^ seed) >>> 0
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * Ordre aléatoire seedé où chaque élément a son propre rang, tiré de sa clé `keyOf(item)` :
 * retirer ou ajouter un élément à la liste ne change pas l'ordre des autres (contrairement à seededShuffle).
 * Deux versions de l'appli dont les listes diffèrent un peu tirent donc toujours les mêmes pays.
 * Ne mute pas le tableau original.
 */
export function seededOrder(array, seed, keyOf) {
  const ranked = array.map((item) => ({ item, key: String(keyOf(item)), rank: hashKey(String(keyOf(item)), seed >>> 0) }))
  ranked.sort((a, b) => a.rank - b.rank || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  return ranked.map(({ item }) => item)
}
