// The country geometries are not part of the main bundle: src/data/countries.meta.json (imported
// everywhere as countriesWithDifficulty_FR.json, see vite.config.mjs) holds the properties, and the
// simplified geometries sit in countries.geo.json, a separate asset (hashed file name, cached by the
// browser). loadCountryGeometries() fetches it once and fills in `feature.geometry` on the shared
// feature objects, so the games keep using `countries.features` as before.
//
// Regenerate both files with `node scripts/build-geo-data.mjs`.
import countries from './countriesWithDifficulty_FR.json'
import geometriesUrl from './countries.geo.json?url'

let loaded = false
let pending = null

export function loadCountryGeometries() {
  if (loaded) return Promise.resolve()
  pending ??= fetch(geometriesUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Country geometries: HTTP ${response.status}`)
      return response.json()
    })
    .then((geometries) => {
      if (geometries.length !== countries.features.length) {
        throw new Error('Country geometries do not match the country list')
      }
      countries.features.forEach((feature, index) => {
        feature.geometry = geometries[index]
      })
      loaded = true
    })
    .catch((error) => {
      pending = null // allow a retry
      throw error
    })
  return pending
}
