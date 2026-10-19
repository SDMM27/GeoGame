import masks from '../data/missingFlagMasks.json'

// The hidden third of a flag: `axis` 'h' = horizontal band (band 0 = top), 'v' = vertical band (band 0 = left).
// Masks are chosen per flag (src/data/missingFlagMasks.json); an unknown flag gets a stable hashed horizontal band.
export function getMissingFlagMask(iso) {
  const key = String(iso ?? '')
  const mask = masks[key.toUpperCase()]
  if (mask) return { axis: mask.axis, band: mask.band }
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return { axis: 'h', band: Math.abs(hash) % 3 }
}
