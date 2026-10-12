// The games a multiplayer room can hold. Same games and ids as the app (mobile/src/games.ts).
import { GAME_TYPES } from './gameTypes'

export const ROOM_GAMES = [
  { id: 'placement', type: GAME_TYPES.PLACEMENT, icon: '🌍' },
  { id: 'flags', type: GAME_TYPES.FLAGS, icon: '🚩' },
  { id: 'capitals', type: GAME_TYPES.CAPITALS, icon: '🏛️' },
  { id: 'border_guess', type: GAME_TYPES.BORDER_GUESS, icon: '🧩' },
  { id: 'country_clue', type: GAME_TYPES.COUNTRY_CLUE, icon: '🧭' },
  { id: 'quiz', type: GAME_TYPES.QUIZ, icon: '❓' },
  { id: 'survival', type: GAME_TYPES.SURVIVAL, icon: '❤️' },
]

export const roomGameIcon = (gameId) => ROOM_GAMES.find((game) => game.id === gameId)?.icon ?? '🎮'
