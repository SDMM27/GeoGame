// Games taken off every list (home, multiplayer, leaderboards, missions, badges, survival rounds) without removing their
// code, so that one line brings them back. Their metadata stays in the catalogs: old history, rooms and badges still
// show them. Plain module: read by the website, the app (@shared) and the API (Node).
import { GAME_TYPES } from './gameTypes.js'

// The Geo Quiz (history theme included), replaced by the Country of the Day on 2026-10-29
export const HIDDEN_GAME_TYPES = [GAME_TYPES.QUIZ]

export const isGameHidden = (type) => HIDDEN_GAME_TYPES.includes(type)
