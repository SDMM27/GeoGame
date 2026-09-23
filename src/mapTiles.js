// CARTO basemap tiles require an API key (https://carto.com/basemaps/apikey).
// Set VITE_CARTO_API_KEY in .env.local (and in the hosting provider's env vars).
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY

export const DARK_NOLABELS_TILE_URL =
  `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png${CARTO_KEY ? `?key=${CARTO_KEY}` : ''}`
