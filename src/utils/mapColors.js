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
export const HOVER_STYLE = { fillColor: MAP_COLORS.hover, color: MAP_COLORS.hoverStroke, weight: 2.5, fillOpacity: 0.5 }
