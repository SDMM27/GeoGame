// Each game's emblem (« carnet de vol »): a three-letter flight code, like an airport, and a stroke glyph on a
// 24×24 grid. `d` is drawn solid, `d2` dashed (the part of a flag that is missing, a border...). Shared by the site
// (src/components/GameEmblem.jsx) and the app (mobile/src/components/GameEmblem.tsx); colors are the games' own
// (--game-* on the site, gameColors in the app).
import { GAME_TYPES } from './gameTypes'

export const GAME_EMBLEMS = {
  daily_challenge: {
    code: 'DEF',
    d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0M11.99 12h.02M12 1v4M12 19v4M1 12h4M19 12h4',
  },
  country_of_day: {
    code: 'PDJ',
    d: 'M2 13a8 8 0 1 0 16 0a8 8 0 1 0-16 0M10 5c-2.5 2.2-3.5 5-3.5 8s1 5.8 3.5 8M10 5c2.5 2.2 3.5 5 3.5 8s-1 5.8-3.5 8M2 13h16M19.5 1.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z',
  },
  placement: {
    code: 'PAY',
    d: 'M12 19s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10zM10 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    d2: 'M3 22h18',
  },
  hardcore: {
    code: 'HRD',
    d: 'M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4 3 5v3h8v-3c1.8-1 3-2.5 3-5a7 7 0 0 0-7-7zM9 10.5h.01M15 10.5h.01M10 18v3M14 18v3',
  },
  flags: { code: 'DRP', d: 'M5 22V3M5 4h13l-2.5 4.5L18 13H5' },
  missing_flag: { code: 'DRI', d: 'M5 22V3M5 4h7v9H5', d2: 'M12 4h6l-2.5 4.5L18 13h-6' },
  capitals: { code: 'CAP', d: 'M3 21h18M4 9h16M12 3l8 5H4zM6 9v9M10 9v9M14 9v9M18 9v9M4 18h16' },
  border_guess: { code: 'BRD', d: '', d2: 'M4 7l7-4 8 4 2 7-5 7-9-2-3-6z' },
  country_clue: {
    code: 'IND',
    d: 'M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0M15 15l6 6M8.2 8.2a1.9 1.9 0 1 1 2.5 1.8c-.6.2-.9.6-.9 1.2M9.8 13.3h.01',
  },
  voyage_voyage: { code: 'VOY', d: 'M21 3L3 10.5l7 2.5 2.5 7zM21 3L10 13', d2: 'M3 21c3-1 5-3 6-5' },
  ranking: {
    code: 'RNK',
    d: 'M3 21v-6h6v6M9 21V9h6v12M15 21v-4h6v4M2 21h20M12 3l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z',
  },
  quiz: { code: 'QIZ', d: 'M4 4h16v12H10l-5 4v-4H4zM10 8.2a2 2 0 1 1 2.6 1.9c-.6.2-.6.6-.6 1.2M12 13.3h.01' },
  survival: {
    code: 'SRV',
    d: 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11zM6 12h3l1.5-2.5 2 5 1.5-2.5h4',
  },
}

// Room game ids, app ids and GAME_TYPES values all lead to the same emblem ('border_guess', 'BORDER_GUESS').
const TYPE_TO_ID = Object.fromEntries(Object.entries(GAME_TYPES).map(([key, value]) => [value, key.toLowerCase()]))

export function emblemId(idOrType) {
  if (!idOrType) return null
  if (GAME_EMBLEMS[idOrType]) return idOrType
  const id = TYPE_TO_ID[idOrType] ?? String(idOrType).toLowerCase()
  return GAME_EMBLEMS[id] ? id : null
}

export const gameEmblem = (idOrType) => GAME_EMBLEMS[emblemId(idOrType)] ?? null
