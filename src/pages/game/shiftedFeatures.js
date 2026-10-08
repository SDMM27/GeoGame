import countries from '../../data/countriesWithDifficulty_FR.json'

function shiftLng(coords, offset) {
  if (typeof coords[0] === 'number') return [coords[0] + offset, coords[1]]
  return coords.map(c => shiftLng(c, offset))
}
function offsetFeatures(features, lngOffset) {
  return features.map(f => ({
    ...f,
    geometry: { ...f.geometry, coordinates: shiftLng(f.geometry.coordinates, lngOffset) }
  }))
}
let shiftedFeaturesCache = null
export const getShiftedFeatures = () => shiftedFeaturesCache ??= {
  left: offsetFeatures(countries.features, -360),
  right: offsetFeatures(countries.features, 360),
}
