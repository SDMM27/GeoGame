// Country Ranking daily scores: same Firestore documents and save rules as the website
// (best score first, then the smallest total error), see src/utils/saveScore.js.
import { fetchRankingScores as fetchShared } from '@shared/utils/saveScore'

export type RankingScore = {
  name: string
  uid?: string
  dailyKey: string
  score: number
  totalError: number
  attemptsUsed?: number
  playerOrder?: string[]
}

export const fetchRankingScores = (dailyKey: string): Promise<RankingScore[]> => fetchShared(dailyKey)
