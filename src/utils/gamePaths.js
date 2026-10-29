// The pages where a game is played: no invite banner nor bottom tab bar there, like in the app.
export const GAME_PATHS = ['/game', '/flag-game', '/capitals-game', '/border-guess', '/country-clue', '/voyage-voyage', '/ranking', '/quiz', '/challenge', '/survival', '/country-of-the-day']

export const isGamePath = (pathname) => GAME_PATHS.includes(pathname)
