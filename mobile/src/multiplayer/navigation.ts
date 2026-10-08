import { router } from 'expo-router'

import type { GameDefinition } from '@/games'

// Placement / Flags / Capitals go through their setup sheet first (difficulty, continent, Ascension).
// `addTo`: the code of a room the host adds this game to, instead of creating a room (replaces the picker sheet).
export function startMultiGame(game: GameDefinition, addTo?: string) {
  const extra = addTo ? { add: addTo } : {}
  const route =
    game.kind === 'setup'
      ? { pathname: '/play/[game]' as const, params: { game: game.id, multi: '1', ...extra } }
      : { pathname: '/multi/create' as const, params: { game: game.id, ...extra } }
  if (addTo) router.replace(route)
  else router.push(route)
}
