import type { ComponentProps } from 'react'
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

import { GAME_TYPES } from '@shared/utils/gameTypes'
import { gameColors } from '@/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type GameId = keyof typeof gameColors

export type GameDefinition = {
  id: GameId
  // Value used by the shared code (scores, share texts)
  type: string
  titleKey: string
  descKey: string
  icon: IconName
  color: string
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
    color: gameColors.daily_challenge,
    route: '/game/challenge',
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
    color: gameColors.placement,
    route: '/game/placement',
    kind: 'setup',
    multi: true,
  },
  {
    id: 'hardcore',
    type: GAME_TYPES.HARDCORE,
    titleKey: 'games.hardcore.title',
    descKey: 'games.hardcore.description',
    icon: 'skull-outline',
    color: gameColors.hardcore,
    route: '/game/placement',
    kind: 'setup',
    multi: false,
    noAscension: true,
  },
  {
    id: 'flags',
    type: GAME_TYPES.FLAGS,
    titleKey: 'games.flags.title',
    descKey: 'games.flags.description',
    icon: 'flag-variant-outline',
    color: gameColors.flags,
    route: '/game/flags',
    kind: 'setup',
    multi: true,
  },
  {
    id: 'missing_flag',
    type: GAME_TYPES.MISSING_FLAG,
    titleKey: 'games.missing_flag.title',
    descKey: 'games.missing_flag.description',
    icon: 'puzzle-outline',
    color: gameColors.missing_flag,
    route: '/game/missing-flag',
    kind: 'setup',
    multi: false,
    noAscension: true,
  },
  {
    id: 'capitals',
    type: GAME_TYPES.CAPITALS,
    titleKey: 'games.capitals.title',
    descKey: 'games.capitals.description',
    icon: 'bank-outline',
    color: gameColors.capitals,
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
    color: gameColors.border_guess,
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
    color: gameColors.country_clue,
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
    color: gameColors.voyage_voyage,
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
    color: gameColors.ranking,
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
    color: gameColors.quiz,
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
    color: gameColors.survival,
    route: '/game/survival',
    kind: 'survival',
    multi: true,
  },
]

export const MULTI_GAMES = GAMES.filter((game) => game.multi)

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

// Game of a GAME_TYPES value (history, scores).
export function getGameByType(type: string) {
  return GAMES.find((game) => game.type === type)
}
