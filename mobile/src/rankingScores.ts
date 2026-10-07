// Country Ranking daily scores: same Firestore documents as the website's RankingGamePage
// (best score first, then the smallest total error).
import { addDoc, collection, deleteDoc, getDocs, query, where } from 'firebase/firestore'

import { firestore } from '@shared/Firebase'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { sortRankingScores } from '@shared/utils/rankingScores'

export type RankingScore = {
  name: string
  dailyKey: string
  score: number
  totalError: number
  attemptsUsed?: number
  playerOrder?: string[]
}

type NewRankingScore = Omit<RankingScore, 'attemptsUsed'> & { attemptsUsed: number; playerOrder: string[] }

export async function saveRankingScore(entry: NewRankingScore) {
  const ref = collection(firestore, 'daily_scores')
  const existing = await getDocs(
    query(ref, where('name', '==', entry.name), where('gameType', '==', GAME_TYPES.RANKING), where('dailyKey', '==', entry.dailyKey))
  )

  if (!existing.empty) {
    const prev = existing.docs[0].data() as RankingScore
    const better = entry.score > prev.score || (entry.score === prev.score && entry.totalError < (prev.totalError ?? Infinity))
    if (!better) return { status: 'blocked' as const, existing: prev }
    await deleteDoc(existing.docs[0].ref)
  }

  await addDoc(ref, { ...entry, gameType: GAME_TYPES.RANKING })
  return { status: existing.empty ? ('saved' as const) : ('updated' as const) }
}

export async function fetchRankingScores(dailyKey: string): Promise<RankingScore[]> {
  const snapshot = await getDocs(
    query(collection(firestore, 'daily_scores'), where('gameType', '==', GAME_TYPES.RANKING), where('dailyKey', '==', dailyKey))
  )
  return sortRankingScores(snapshot.docs.map((doc) => doc.data()))
}
