import type { ComponentProps } from 'react'
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

import { isGameHidden } from '@shared/utils/gameAvailability'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { gameEmblem } from '@shared/utils/gameEmblems'
import { gameFills, useTheme } from '@/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type GameId = keyof typeof gameFills

export type GameDefinition = {
  id: GameId
  // Value used by the shared code (scores, share texts)
  type: string
  titleKey: string
  descKey: string
  icon: IconName
  // Flight code (« VOL DRP »), from the shared emblems
  code: string
  route: string
  // 'setup': difficulty/continent/ascension sheet. 'daily': daily + infinite modes.
  // 'survival': games of the rounds and lives sheet.
  kind: 'setup' | 'daily' | 'survival'
  // Playable in a multiplayer room
  multi: boolean
  // Daily only: no infinite mode (Daily Challenge)
  dailyOnly?: boolean
  noAscension?: boolean
}

export const GAMES: GameDefinition[] = [
  {
    id: 'daily_challenge',
    type: GAME_TYPES.DAILY_CHALLENGE,
    titleKey: 'games.daily_challenge.title',
    descKey: 'games.daily_challenge.description',
    icon: 'target',
    code: gameEmblem('daily_challenge')?.code ?? '',
    route: '/game/challenge',
    kind: 'daily',
    multi: false,
    dailyOnly: true,
  },
  {
    id: 'country_of_day',
    type: GAME_TYPES.COUNTRY_OF_DAY,
    titleKey: 'games.country_of_day.title',
    descKey: 'games.country_of_day.description',
    icon: 'earth',
    code: gameEmblem('country_of_day')?.code ?? '',
    route: '/game/country-of-the-day',
    kind: 'daily',
    multi: false,
    dailyOnly: true,
  },
  {
    id: 'placement',
    type: GAME_TYPES.PLACEMENT,
    titleKey: 'games.placement.title',
    descKey: 'games.placement.description',
    icon: 'map-marker-radius-outline',
    code: gameEmblem('placement')?.code ?? '',
    route: '/game/placement',
    kind: 'setup',
    multi: true,
  },
  {
    id: 'flags',
    type: GAME_TYPES.FLAGS,
    titleKey: 'games.flags.title',
    descKey: 'games.flags.description',
    icon: 'flag-variant-outline',
    code: gameEmblem('flags')?.code ?? '',
    route: '/game/flags',
    kind: 'setup',
    multi: true,
  },
  {
    id: 'capitals',
    type: GAME_TYPES.CAPITALS,
    titleKey: 'games.capitals.title',
    descKey: 'games.capitals.description',
    icon: 'bank-outline',
    code: gameEmblem('capitals')?.code ?? '',
    route: '/game/capitals',
    kind: 'setup',
    multi: true,
  },
  {
    id: 'border_guess',
    type: GAME_TYPES.BORDER_GUESS,
    titleKey: 'games.border_guess.title',
    descKey: 'games.border_guess.description',
    icon: 'vector-polygon',
    code: gameEmblem('border_guess')?.code ?? '',
    route: '/game/border-guess',
    kind: 'daily',
    multi: true,
  },
  {
    id: 'country_clue',
    type: GAME_TYPES.COUNTRY_CLUE,
    titleKey: 'games.country_clue.title',
    descKey: 'games.country_clue.description',
    icon: 'compass-outline',
    code: gameEmblem('country_clue')?.code ?? '',
    route: '/game/country-clue',
    kind: 'daily',
    multi: true,
  },
  {
    id: 'voyage_voyage',
    type: GAME_TYPES.VOYAGE_VOYAGE,
    titleKey: 'games.voyage_voyage.title',
    descKey: 'games.voyage_voyage.description',
    icon: 'airplane-takeoff',
    code: gameEmblem('voyage_voyage')?.code ?? '',
    route: '/game/voyage',
    kind: 'daily',
    multi: false,
  },
  {
    id: 'ranking',
    type: GAME_TYPES.RANKING,
    titleKey: 'games.ranking.title',
    descKey: 'games.ranking.description',
    icon: 'sort-descending',
    code: gameEmblem('ranking')?.code ?? '',
    route: '/game/ranking',
    kind: 'daily',
    multi: false,
  },
  {
    id: 'quiz',
    type: GAME_TYPES.QUIZ,
    titleKey: 'games.quiz.title',
    descKey: 'games.quiz.description',
    icon: 'help-circle-outline',
    code: gameEmblem('quiz')?.code ?? '',
    route: '/game/quiz',
    kind: 'daily',
    multi: true,
  },
  {
    id: 'survival',
    type: GAME_TYPES.SURVIVAL,
    titleKey: 'games.survival.title',
    descKey: 'games.survival.description',
    icon: 'heart-pulse',
    code: gameEmblem('survival')?.code ?? '',
    route: '/game/survival',
    kind: 'survival',
    multi: true,
  },
  {
    id: 'hardcore',
    type: GAME_TYPES.HARDCORE,
    titleKey: 'games.hardcore.title',
    descKey: 'games.hardcore.description',
    icon: 'skull-outline',
    code: gameEmblem('hardcore')?.code ?? '',
    route: '/game/placement',
    kind: 'setup',
    multi: false,
  },
  {
    id: 'missing_flag',
    type: GAME_TYPES.MISSING_FLAG,
    titleKey: 'games.missing_flag.title',
    descKey: 'games.missing_flag.description',
    icon: 'puzzle-outline',
    code: gameEmblem('missing_flag')?.code ?? '',
    route: '/game/missing-flag',
    kind: 'setup',
    multi: false,
    noAscension: true,
  },
]

// The games the app lists: the hidden ones stay in GAMES for history, rooms and scores.
export const LISTED_GAMES = GAMES.filter((game) => !isGameHidden(game.type))

export const MULTI_GAMES = LISTED_GAMES.filter((game) => game.multi)

export function getGame(id: string) {
  return GAMES.find((game) => game.id === id)
}

export const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore'] as const

export const DIFFICULTY_COLORS: Record<string, string> = {
  Facile: '#3DDC97',
  Moyen: '#5FD4F4',
  Difficile: '#F5B83D',
  Impossible: '#FF9A4D',
  Hardcore: '#FF7A6B',
}

// The same levels in the light theme, readable on white (AA)
export const DIFFICULTY_COLORS_LIGHT: Record<string, string> = {
  Facile: '#0B7A4C',
  Moyen: '#08617A',
  Difficile: '#8A5A00',
  Impossible: '#A8520A',
  Hardcore: '#B42318',
}

/** The difficulty colors of the theme in use. */
export function useDifficultyColors(): Record<string, string> {
  return useTheme().scheme === 'light' ? DIFFICULTY_COLORS_LIGHT : DIFFICULTY_COLORS
}

// Game of a GAME_TYPES value (history, scores).
export function getGameByType(type: string) {
  return GAMES.find((game) => game.type === type)
}
