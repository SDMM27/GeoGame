import L from 'leaflet'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getPolygonArea(ring = []) {
  let area = 0

  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[(index + 1) % ring.length]
    area += x1 * y2 - x2 * y1
  }

  return Math.abs(area / 2)
}

function collectLongitudes(coordinates, values = []) {
  if (!Array.isArray(coordinates)) {
    return values
  }

  if (typeof coordinates[0] === 'number') {
    values.push(coordinates[0])
    return values
  }

  coordinates.forEach((entry) => collectLongitudes(entry, values))
  return values
}

function remapLongitudes(coordinates, mapper) {
  if (!Array.isArray(coordinates)) {
    return coordinates
  }

  if (typeof coordinates[0] === 'number') {
    const [lng, lat, ...rest] = coordinates
    return [mapper(lng), lat, ...rest]
  }

  return coordinates.map((entry) => remapLongitudes(entry, mapper))
}

export function normalizeWrappedCountry(country) {
  if (!country?.geometry?.coordinates) {
    return country
  }

  const longitudes = collectLongitudes(country.geometry.coordinates)
  if (longitudes.length === 0) {
    return country
  }

  const rawMin = Math.min(...longitudes)
  const rawMax = Math.max(...longitudes)
  const rawSpan = rawMax - rawMin

  const negativeShifted = longitudes.map((lng) => (lng < 0 ? lng + 360 : lng))
  const negativeShiftedSpan = Math.max(...negativeShifted) - Math.min(...negativeShifted)

  const positiveShifted = longitudes.map((lng) => (lng > 0 ? lng - 360 : lng))
  const positiveShiftedSpan = Math.max(...positiveShifted) - Math.min(...positiveShifted)

  if (negativeShiftedSpan < rawSpan && negativeShiftedSpan <= positiveShiftedSpan) {
    return {
      ...country,
      geometry: {
        ...country.geometry,
        coordinates: remapLongitudes(country.geometry.coordinates, (lng) => (lng < 0 ? lng + 360 : lng)),
      },
    }
  }

  if (positiveShiftedSpan < rawSpan) {
    return {
      ...country,
      geometry: {
        ...country.geometry,
        coordinates: remapLongitudes(country.geometry.coordinates, (lng) => (lng > 0 ? lng - 360 : lng)),
      },
    }
  }

  return country
}

export function getFocusCountry(country) {
  const normalizedCountry = normalizeWrappedCountry(country)

  if (!normalizedCountry || normalizedCountry.geometry?.type !== 'MultiPolygon') {
    return normalizedCountry
  }

  const polygons = normalizedCountry.geometry.coordinates
  if (polygons.length <= 1) {
    return normalizedCountry
  }

  const largestPolygon = polygons.reduce((bestPolygon, polygon) => {
    const bestArea = getPolygonArea(bestPolygon?.[0] ?? [])
    const currentArea = getPolygonArea(polygon?.[0] ?? [])
    return currentArea > bestArea ? polygon : bestPolygon
  }, polygons[0])
  const totalArea = polygons.reduce((sum, polygon) => sum + getPolygonArea(polygon?.[0] ?? []), 0)
  const largestArea = getPolygonArea(largestPolygon?.[0] ?? [])

  const fullBounds = L.geoJSON(normalizedCountry).getBounds()
  const fullSpan = Math.max(
    Math.abs(fullBounds.getNorth() - fullBounds.getSouth()),
    Math.abs(fullBounds.getEast() - fullBounds.getWest())
  )

  const primaryFeature = {
    ...normalizedCountry,
    geometry: {
      type: 'Polygon',
      coordinates: largestPolygon,
    },
  }

  const primaryBounds = L.geoJSON(primaryFeature).getBounds()
  const primarySpan = Math.max(
    Math.abs(primaryBounds.getNorth() - primaryBounds.getSouth()),
    Math.abs(primaryBounds.getEast() - primaryBounds.getWest())
  )

  if (primarySpan <= 0) {
    return normalizedCountry
  }

  const spreadRatio = fullSpan / primarySpan
  const dominanceRatio = totalArea > 0 ? largestArea / totalArea : 1
  const hasDominantMainland = dominanceRatio >= 0.60
  const isWidelyDispersed = spreadRatio > 1.35
  const shouldFocusPrimaryPolygon =
    hasDominantMainland &&
    (
      (primarySpan < 1.2 && (isWidelyDispersed || fullSpan < 1.2)) ||
      (isWidelyDispersed && spreadRatio > 2.2)
    )

  return shouldFocusPrimaryPolygon ? primaryFeature : normalizedCountry
}

export function getCountryMetrics(country) {
  const focusCountry = getFocusCountry(country)
  const bounds = L.geoJSON(focusCountry).getBounds()
  const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth())
  const lngSpan = Math.abs(bounds.getEast() - bounds.getWest())
  const maxSpan = Math.max(latSpan, lngSpan)
  const minSpan = Math.min(latSpan, lngSpan)
  const aspectRatio = minSpan > 0 ? maxSpan / minSpan : Number.POSITIVE_INFINITY
  const compactness = maxSpan > 0 ? minSpan / maxSpan : 1
  const isFragmented = country?.geometry?.type === 'MultiPolygon'
  const isFocused = focusCountry !== country

  return {
    bounds,
    latSpan,
    lngSpan,
    maxSpan,
    minSpan,
    aspectRatio,
    compactness,
    focusCountry,
    isFragmented,
    isFocused,
  }
}

export function getCountryStyle(country) {
  const { maxSpan } = getCountryMetrics(country)

  return {
    fillColor: 'rgba(0, 212, 255, 0.16)',
    color: '#7dd3fc',
    fillOpacity: maxSpan < 0.35 ? 0.78 : maxSpan < 1 ? 0.68 : 0.55,
    weight: maxSpan < 0.35 ? 5 : maxSpan < 1 ? 4 : maxSpan < 3 ? 3 : 2,
  }
}

export function getAdjustedZoom({ maxSpan, compactness, isFragmented, isFocused }) {
  const safeSpan = Math.max(maxSpan, 0.01)
  let zoom = 9.2 - Math.log2(safeSpan)

  if (compactness < 0.14) {
    zoom -= 0.9
  } else if (compactness < 0.25) {
    zoom -= 0.45
  } else if (compactness > 0.62 && safeSpan < 1.1) {
    zoom += 0.35
  }

  if (isFragmented && !isFocused) {
    zoom -= 0.9
  } else if (isFragmented && isFocused && safeSpan < 0.2) {
    zoom -= 0.5
  }

  return clamp(zoom, 5, 14.5)
}

export function getAdjustedPadding({ maxSpan, compactness, isFragmented, isFocused }) {
  let padding = maxSpan < 0.12 ? 12 : maxSpan < 0.35 ? 10 : maxSpan < 1.2 ? 12 : 18

  if (compactness < 0.14) {
    padding = Math.max(4, padding - 6)
  } else if (compactness < 0.25) {
    padding = Math.max(6, padding - 4)
  }

  if (isFragmented && !isFocused) {
    padding = Math.max(padding, 16)
  } else if (isFragmented && isFocused && maxSpan < 0.2) {
    padding = Math.max(padding, 14)
  }

  return [padding, padding]
}

export function getViewportSettings(country) {
  const metrics = getCountryMetrics(country)

  return {
    ...metrics,
    zoom: getAdjustedZoom(metrics),
    padding: getAdjustedPadding(metrics),
  }
}
