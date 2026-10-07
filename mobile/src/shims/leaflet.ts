// Mobile stand-in for Leaflet, used by shared helpers in ../src (e.g. utils/borderGuessMap).
// Only L.geoJSON(feature).getBounds() is implemented: plain lat/lng min/max, like Leaflet.
import type { Feature, Geometry, Position } from 'geojson'

class LatLngBounds {
  constructor(
    private south: number,
    private west: number,
    private north: number,
    private east: number
  ) {}
  getSouth() {
    return this.south
  }
  getWest() {
    return this.west
  }
  getNorth() {
    return this.north
  }
  getEast() {
    return this.east
  }
  isValid() {
    return this.south <= this.north && this.west <= this.east
  }
}

function forEachPosition(coordinates: unknown, fn: (position: Position) => void) {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number') fn(coordinates as Position)
  else coordinates.forEach((entry) => forEachPosition(entry, fn))
}

function geoJSON(feature: Feature<Geometry>) {
  return {
    getBounds() {
      let south = Infinity
      let west = Infinity
      let north = -Infinity
      let east = -Infinity
      forEachPosition((feature.geometry as { coordinates?: unknown })?.coordinates, ([lng, lat]) => {
        south = Math.min(south, lat)
        north = Math.max(north, lat)
        west = Math.min(west, lng)
        east = Math.max(east, lng)
      })
      return new LatLngBounds(south, west, north, east)
    },
  }
}

const L = { geoJSON }

export default L
