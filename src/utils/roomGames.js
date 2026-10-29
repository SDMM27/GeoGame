// The games a multiplayer room can hold. Same games and ids as the app (mobile/src/games.ts), same icons as the home page.
import { GAME_TYPES } from './gameTypes'
import { isGameHidden } from './gameAvailability'

export const ROOM_GAMES = [
  { id: 'placement', type: GAME_TYPES.PLACEMENT, icon: '🌍' },
  { id: 'flags', type: GAME_TYPES.FLAGS, icon: '🚩' },
  { id: 'capitals', type: GAME_TYPES.CAPITALS, icon: '🏛️' },
  { id: 'border_guess', type: GAME_TYPES.BORDER_GUESS, icon: '🧭' },
  { id: 'country_clue', type: GAME_TYPES.COUNTRY_CLUE, icon: '🔎' },
  { id: 'quiz', type: GAME_TYPES.QUIZ, icon: '🧠' },
  { id: 'survival', type: GAME_TYPES.SURVIVAL, icon: '❤️' },
]

// What the pickers offer: ROOM_GAMES stays whole so that rooms already created with a hidden game keep working
export const LISTED_ROOM_GAMES = ROOM_GAMES.filter((game) => !isGameHidden(game.type))

export const roomGameIcon = (gameId) => ROOM_GAMES.find((game) => game.id === gameId)?.icon ?? '🎮'

// A game's own color, as in the app (--game-placement, --game-border-guess... in styles/theme.css).
// `id`: a room game id ('border_guess') or a GAME_TYPES value ('BORDER_GUESS').
export const gameColor = (id) => `var(--game-${id.toLowerCase().replace(/_/g, '-')})`
