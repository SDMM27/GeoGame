// A stable missing band keeps the same flag puzzle visible after rerenders.
export function getMissingFlagBand(iso) {
  const key = String(iso ?? '')
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 3
}
