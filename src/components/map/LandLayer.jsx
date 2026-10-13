import { useMemo } from 'react'
import L from 'leaflet'
import { GeoJSON } from 'react-leaflet'
import countries from '../../data/countriesWithDifficulty_FR.json'
import { getShiftedFeatures } from '../../pages/game/shiftedFeatures'
import { MAP_COLORS } from '../../utils/mapColors'

const LAND_STYLE = { fillColor: MAP_COLORS.land, fillOpacity: 1, stroke: false }
const LAND_WITH_BORDERS_STYLE = { ...LAND_STYLE, stroke: true, color: MAP_COLORS.stroke, weight: 0.5, opacity: 0.7 }

// The land under every game map, drawn like the app's (mobile/src/components/map/WorldMap.tsx): filled countries on
// the ocean color, instead of a tile basemap. Not clickable, drawn on a canvas, and placed first so it stays below
// the game's own layers. The map container gets the ocean color from the `map-night` class. `borders` draws the
// countries' outlines too, for maps whose own layers only show a few countries.
export default function LandLayer({ borders = false }) {
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), [])
  const { left, right } = getShiftedFeatures()
  const style = borders ? LAND_WITH_BORDERS_STYLE : LAND_STYLE

  return (
    <>
      <GeoJSON data={left} style={style} interactive={false} renderer={renderer} />
      <GeoJSON data={countries.features} style={style} interactive={false} renderer={renderer} />
      <GeoJSON data={right} style={style} interactive={false} renderer={renderer} />
    </>
  )
}
