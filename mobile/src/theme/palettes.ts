// The two palettes. Same keys in both, so a style written once works in either theme.

// "Atlas de nuit"
export const darkColors = {
  bg: '#0B1020',
  surface: '#141B30',
  surfaceHigh: '#1B2440',
  border: '#232C48',
  borderStrong: '#34406A',
  text: '#EEF1F8',
  textMuted: '#A3ACC6',
  textFaint: '#6B7596',

  accent: '#3DDC97',
  onAccent: '#06281A',
  // Correct / found / won: stays green whatever skin recolors the accent
  success: '#3DDC97',
  onSuccess: '#06281A',
  danger: '#FF7A6B',
  onDanger: '#3A0D07',
  warning: '#F5B83D',
  onWarning: '#2A1C02',
  // « Warmer / colder » hints that point the other way than the accent (Border Guess, Country Clue)
  info: '#60A5FA',
  // Text on a game color (theme.gameColors)
  onGame: '#0B1020',

  ocean: '#060E1F',
  land: '#2A3E66',
  landStroke: '#6F88BD',
  highlight: '#7AA2FF',

  // « Carnet de vol »: departures board, ticket stub, gold flight codes
  board: '#060A16',
  boardLine: '#141C33',
  gold: '#F5C84B',
  stub: '#26324F',
  accent2: '#C792FF',

  // The home globe: light land on navy
  globeOcean: '#1B2A4D',
  globeOceanDeep: '#0E1630',
  globeLand: '#9AA9CC',
  globeLandEdge: 'rgba(11,16,32,0.4)',
  globeGraticule: 'rgba(138,147,176,0.25)',

  // Faint fills over a surface, a modal's backdrop
  tint: 'rgba(255,255,255,0.04)',
  tintStrong: 'rgba(255,255,255,0.08)',
  scrim: 'rgba(3,6,14,0.7)',
} as const

export type Palette = { [K in keyof typeof darkColors]: string }

// The website's light theme. Every text color is AA on bg, surface and surfaceHigh.
export const lightColors: Palette = {
  bg: '#F3F5FA',
  surface: '#FFFFFF',
  surfaceHigh: '#E6EAF3',
  border: '#D5DBE8',
  borderStrong: '#B8C1D6',
  text: '#0B1020',
  textMuted: '#5A6380',
  textFaint: '#5F6885',

  accent: '#0B7A4C',
  onAccent: '#FFFFFF',
  success: '#0B7A4C',
  onSuccess: '#FFFFFF',
  danger: '#C62828',
  onDanger: '#FFFFFF',
  warning: '#8A5A00',
  onWarning: '#FFFFFF',
  info: '#2563EB',
  onGame: '#FFFFFF',

  ocean: '#D3DEF1',
  land: '#FFFFFF',
  landStroke: '#94A3C4',
  highlight: '#3557C9',

  board: '#FFFFFF',
  boardLine: '#E3E8F2',
  gold: '#8A5A00',
  stub: '#DDE3EF',
  accent2: '#6B3FD4',

  // Dark land on a pale ocean, as on the website
  globeOcean: '#DFE7F5',
  globeOceanDeep: '#C4D1EA',
  globeLand: '#0B1020',
  globeLandEdge: 'rgba(255,255,255,0.4)',
  globeGraticule: 'rgba(90,99,128,0.22)',

  tint: 'rgba(11,16,32,0.04)',
  tintStrong: 'rgba(11,16,32,0.08)',
  scrim: 'rgba(11,16,32,0.45)',
}

// One color per game, the same in both themes where a game is only named by its color (data, tests, game ids).
export const gameFills = {
  daily_challenge: '#FF9F45',
  country_of_day: '#2EC4B6',
  placement: '#7AA2FF',
  hardcore: '#FF7A6B',
  flags: '#FF7A6B',
  missing_flag: '#C792FF',
  capitals: '#F5B83D',
  border_guess: '#C792FF',
  country_clue: '#3DDC97',
  voyage_voyage: '#5FD4F4',
  ranking: '#FF9EC7',
  quiz: '#B4E05A',
  survival: '#FF5C7A',
} as const

export type GameColors = { [K in keyof typeof gameFills]: string }

// On screen the games use theme.gameColors: the bright fills on the dark theme, and in the light one their darker
// « ink » shades (the website's --game-*-ink), readable as text on white and under white text (theme.colors.onGame).
export const darkGameColors: GameColors = gameFills
export const lightGameColors: GameColors = {
  daily_challenge: '#A8520A',
  country_of_day: '#0D7A70',
  placement: '#3557C9',
  hardcore: '#B42318',
  flags: '#C0392B',
  missing_flag: '#6B3FD4',
  capitals: '#8A5A00',
  border_guess: '#7C4DFF',
  country_clue: '#0B7A4C',
  voyage_voyage: '#08617A',
  ranking: '#B8306F',
  quiz: '#4D6B0E',
  survival: '#C2213F',
}
