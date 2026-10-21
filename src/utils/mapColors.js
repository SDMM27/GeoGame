// Map colors of the "Atlas de nuit" palette. Spelled exactly like mobile/src/theme/index.ts: the app draws the shared
// hooks' Leaflet styles itself and compares some of them with its theme (mobile/src/components/map/WorldMap.tsx).
export const MAP_COLORS = {
  ocean: '#060E1F', // ocean
  land: '#2A3E66', // land
  stroke: '#6F88BD', // landStroke
  hover: '#7AA2FF', // highlight
  right: '#3DDC97', // accent
  wrong: '#FF7A6B', // danger
  missed: '#F5B83D', // warning
  hoverStroke: '#EEF1F8', // text
}

// The country under the mouse (website only: the app has no hover). A bright fill and a light outline, so it stands
// out from the land around it and the player knows which country the click will pick.
// A country in Hardcore (no borders): plain land. On the website each country is its own SVG path, and without an
// outline the anti-aliased edges of two neighbours let the ocean show through as a faint border: a thin outline in the
// land color closes those seams. The app draws the land as one path, without outline.
export const HARDCORE_COUNTRY_STYLE = { fillColor: MAP_COLORS.land, color: MAP_COLORS.land, fillOpacity: 1, weight: 1 }

export const HOVER_STYLE = { fillColor: MAP_COLORS.hover, color: MAP_COLORS.hoverStroke, weight: 2.5, fillOpacity: 0.5 }
