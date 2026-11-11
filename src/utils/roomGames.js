// The games a multiplayer room can hold. Same games and ids as the app (mobile/src/games.ts); their emblems are in gameEmblems.js.
import { GAME_TYPES } from './gameTypes'
import { isGameHidden } from './gameAvailability'

export const ROOM_GAMES = [
  { id: 'placement', type: GAME_TYPES.PLACEMENT },
  { id: 'flags', type: GAME_TYPES.FLAGS },
  { id: 'capitals', type: GAME_TYPES.CAPITALS },
  { id: 'border_guess', type: GAME_TYPES.BORDER_GUESS },
  { id: 'country_clue', type: GAME_TYPES.COUNTRY_CLUE },
  { id: 'quiz', type: GAME_TYPES.QUIZ },
  { id: 'survival', type: GAME_TYPES.SURVIVAL },
]

// What the pickers offer: ROOM_GAMES stays whole so that rooms already created with a hidden game keep working
export const LISTED_ROOM_GAMES = ROOM_GAMES.filter((game) => !isGameHidden(game.type))

// A game's own color, as in the app (--game-placement, --game-border-guess... in styles/theme.css).
// `id`: a room game id ('border_guess') or a GAME_TYPES value ('BORDER_GUESS').
export const gameColor = (id) => `var(--game-${id.toLowerCase().replace(/_/g, '-')})`
