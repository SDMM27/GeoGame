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
  kind: 'setup' | 'daily'
}

export const GAMES: GameDefinition[] = [
  {
    id: 'placement',
    type: GAME_TYPES.PLACEMENT,
    titleKey: 'games.placement.title',
    descKey: 'games.placement.description',
    icon: 'map-marker-radius-outline',
    color: gameColors.placement,
    route: '/game/placement',
    kind: 'setup',
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
  },
]

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
