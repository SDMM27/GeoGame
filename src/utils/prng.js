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
