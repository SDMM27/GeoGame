import React, { useMemo, useRef, useState } from 'react'
import { CircleMarker, useMapEvents } from 'react-leaflet'
import { MAP_COLORS } from '../../utils/mapColors'
import countries from '../../data/countriesWithDifficulty_FR.json'
import { getSmallCountryCircleDescriptors } from '../../utils/largestLandmass'

// Computed on first use: the geometries are loaded after this module is evaluated.
// The map draws the world three times (shiftedFeatures): a dot on each copy, or the Pacific islands seen across the
// dateline would have none. The centers are built once: a new array on a render would move every dot again.
let smallCountriesCache = null
const getSmallCountries = () => smallCountriesCache ??= getSmallCountryCircleDescriptors(countries.features)

const CIRCLE_DEFAULT = { fillColor: '#ffffff', fillOpacity: 0.15, color: MAP_COLORS.stroke, weight: 2 }
const CIRCLE_HOVER = { fillColor: MAP_COLORS.hover, fillOpacity: 0.5, color: MAP_COLORS.hover, weight: 2 }

// The same center and handlers on every render: the game's clock re-renders its page ten times a second, and new
// props moved and re-bound the ~300 dots each time, redrawing the whole map on iPhone.
export default function SmallCountryCircles({ onCountryNameClick, foundCountriesRef, shownCountriesRef }) {
  const [zoom, setZoom] = useState(3)
  useMapEvents({ zoomend: (e) => setZoom(e.target.getZoom()) })

  const onClickRef = useRef(onCountryNameClick)
  onClickRef.current = onCountryNameClick
  const handlers = useMemo(() => new Map(getSmallCountries().map((c) => [c.key, {
    click: () => onClickRef.current(c.name),
    mouseover: (e) => e.target.setStyle(CIRCLE_HOVER),
    mouseout: (e) => e.target.setStyle(CIRCLE_DEFAULT),
  }])), [])

  return getSmallCountries()
    .filter(c => zoom < c.zoomThreshold)
    .filter(c => !foundCountriesRef.current.has(c.name) && !shownCountriesRef.current.has(c.name))
    .map(c => (
      <CircleMarker
        key={c.key}
        center={c.center}
        radius={c.radius}
        pathOptions={CIRCLE_DEFAULT}
        eventHandlers={handlers.get(c.key)}
      />
    ))
}

