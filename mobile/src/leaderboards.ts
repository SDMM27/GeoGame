// Pure helpers of the Rankings tab (no React, no Firestore, no @shared import: unit-testable on their own).

export type LoadErrorKind = 'index' | 'network' | 'other'

// Why a leaderboard query failed. 'index' = the composite index of the query isn't deployed yet
// (Firestore answers failed-precondition: "The query requires an index").
export function loadErrorKind(error: unknown): LoadErrorKind {
  const { code = '', message = '' } = (error ?? {}) as { code?: unknown; message?: unknown }
  const kind = String(code).toLowerCase()
  const text = String(message).toLowerCase()
  if (kind.endsWith('failed-precondition') || text.includes('requires an index')) return 'index'
  if (kind.endsWith('unavailable') || kind.endsWith('deadline-exceeded') || text.includes('network') || text.includes('offline')) return 'network'
  return 'other'
}

// Translation key of the message shown for a failed load.
export const loadErrorKey = (error: unknown) => `mobile.leaderboards.error_${loadErrorKind(error)}`

export const isMine = (entry: { uid?: string }, uid: string | undefined) => Boolean(uid) && entry.uid === uid

export type SoloScore = {
  id?: string
  name: string
  uid?: string
  score: number
  elapsedTime?: number | null
  difficulty: string
  continent?: string | null
  gameType?: string
}

// What a solo row says under the player's name: the game (only when several games are listed) and the
// difficulty or continent the score was made on.
export function soloDetailParts(
  score: Pick<SoloScore, 'difficulty' | 'continent' | 'gameType'>,
  {
    showGame,
    gameLabel,
    levelLabel,
  }: { showGame: boolean; gameLabel: (gameType: string) => string | undefined; levelLabel: (level: string) => string }
) {
  const parts: string[] = []
  if (showGame && score.gameType) {
    const label = gameLabel(score.gameType)
    if (label) parts.push(label)
  }
  parts.push(levelLabel(score.difficulty))
  if (score.continent && score.continent !== score.difficulty) parts.push(levelLabel(score.continent))
  return parts
}

export const rankLabel = (index: number) => ['🥇', '🥈', '🥉'][index] ?? `${index + 1}`
