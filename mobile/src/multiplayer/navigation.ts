import { router } from 'expo-router'

import type { GameDefinition } from '@/games'

// Placement / Flags / Capitals go through their setup sheet first (difficulty, continent, Ascension).
export function startMultiGame(game: GameDefinition) {
  if (game.kind === 'setup') router.push({ pathname: '/play/[game]', params: { game: game.id, multi: '1' } })
  else router.push({ pathname: '/multi/create', params: { game: game.id } })
}
