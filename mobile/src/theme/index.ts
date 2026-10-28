// "Atlas de nuit" design tokens.
export const colors = {
  bg: '#0B1020',
  surface: '#141B30',
  surfaceHigh: '#1B2440',
  border: '#232C48',
  borderStrong: '#34406A',
  text: '#EEF1F8',
  textMuted: '#8892B0',
  textFaint: '#6B7596',

  accent: '#3DDC97',
  onAccent: '#06281A',
  danger: '#FF7A6B',
  onDanger: '#3A0D07',
  warning: '#F5B83D',
  onWarning: '#2A1C02',

  ocean: '#060E1F',
  land: '#2A3E66',
  landStroke: '#6F88BD',
  highlight: '#7AA2FF',
} as const

// One color per game, used for icons and accents.
export const gameColors = {
  daily_challenge: '#FF9F45',
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

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
} as const

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
