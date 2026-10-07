// Liens de défi pour les jeux journaliers : un joueur partage son score du jour
// via une URL, l'ami qui l'ouvre joue le même daily et voit la comparaison.

const LOWER_IS_BETTER = new Set(['BORDER_GUESS', 'COUNTRY_CLUE', 'QUIZ'])
const VALID_MODES = new Set(['daily', 'infinite'])
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isAttemptsGame(gameType) {
  return LOWER_IS_BETTER.has(gameType)
}

export function buildChallengeUrl({ route, pseudo, score, dailyKey, solved, origin }) {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const params = new URLSearchParams({ mode: 'daily' })
  const name = pseudo?.trim()
  if (name) params.set('challenger', name.slice(0, 30))
  params.set('score', String(Math.round((score ?? 0) * 10) / 10))
  if (dailyKey) params.set('day', dailyKey)
  if (solved === false) params.set('solved', '0')
  return `${base}${route}?${params.toString()}`
}

export function parseChallenge(search) {
  const params = new URLSearchParams(search ?? '')
  const rawScore = params.get('score')
  if (rawScore === null) return null
  const score = Number(rawScore)
  if (!Number.isFinite(score) || score < 0) return null
  const day = params.get('day')
  return {
    challenger: params.get('challenger')?.trim().slice(0, 30) || null,
    score,
    day: day && DAY_PATTERN.test(day) ? day : null,
    solved: params.get('solved') !== '0',
  }
}

// Mode du jeu : state de navigation (depuis l'accueil), sinon ?mode= dans l'URL,
// sinon le défaut de la page. Un lien de défi force toujours le daily.
export function resolveMode(location, fallback) {
  if (VALID_MODES.has(location.state?.mode)) return location.state.mode
  if (parseChallenge(location.search)) return 'daily'
  const fromQuery = new URLSearchParams(location.search ?? '').get('mode')
  if (VALID_MODES.has(fromQuery)) return fromQuery
  return fallback
}

// Résultat du point de vue du joueur courant : 'win' | 'lose' | 'tie'
export function compareToChallenge(gameType, mine, theirs) {
  if (isAttemptsGame(gameType)) {
    if (mine.solved !== theirs.solved) return mine.solved ? 'win' : 'lose'
    if (!mine.solved) return 'tie'
    if (mine.score === theirs.score) return 'tie'
    return mine.score < theirs.score ? 'win' : 'lose'
  }
  const a = Math.round(mine.score * 10)
  const b = Math.round(theirs.score * 10)
  if (a === b) return 'tie'
  return a > b ? 'win' : 'lose'
}
