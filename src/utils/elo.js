import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { ELO_KEYS, ratingOf, ratingsForSeason, seasonKeyAt } from './eloRating'
import { LEADERBOARD_SIZE } from './leaderboards'
import { serverNow } from './serverTime'

// Elo display (ratings are written by the server only, see api/elo.mjs): leaderboards and player ratings.
// A key is 'duel' or a solo mode (ELO_MODES).

export const currentSeason = () => seasonKeyAt(new Date(serverNow()))

// "Season 4 · 2026" from '2026-Q4'; anything else is shown as is.
export function formatSeason(season, t) {
  const match = /^(\d{4})-Q([1-4])$/.exec(season ?? '')
  return match ? t('elo.season', { quarter: match[2], year: match[1] }) : String(season ?? '')
}

// Leaderboard row of an elo/{id} document for a key, ratings rounded for display.
export function eloRow(id, data, key) {
  const entry = key === 'duel' ? data.duel : data.solo?.[key]
  const row = { id, uid: data.uid ?? id, name: data.name ?? '', rating: Math.round(entry?.rating ?? 0) }
  if (key === 'duel') return { ...row, games: entry?.games ?? 0, wins: entry?.wins ?? 0 }
  return { ...row, found: entry?.found ?? 0 }
}

// The best players of the current season for a key, best first. Only the players who played it this season.
export async function fetchEloLeaderboard(key) {
  const field = key === 'duel' ? 'duel.rating' : `solo.${key}.rating`
  const snapshot = await getDocs(
    query(collection(firestore, 'elo'), where('season', '==', currentSeason()), orderBy(field, 'desc'), limit(LEADERBOARD_SIZE))
  )
  return snapshot.docs.map((item) => eloRow(item.id, item.data(), key))
}

// The player's elo/{uid} document, or null before their first rated game.
export async function fetchPlayerElo(uid) {
  const snapshot = await getDoc(doc(firestore, 'elo', uid))
  return snapshot.exists() ? snapshot.data() : null
}

// A player's ratings in `season`, one per key (duel first): { key, rating, played, games?, wins?, found? }.
// `rating` is carried over or the starting rating when not played this season (`played` false).
export function playerEloEntries(data, season) {
  const state = ratingsForSeason(data, season)
  return ELO_KEYS.map((key) => {
    const entry = key === 'duel' ? state.duel : state.solo[key]
    const base = { key, rating: Math.round(ratingOf(state, key)), played: Boolean(entry) }
    if (!entry) return base
    return key === 'duel' ? { ...base, games: entry.games ?? 0, wins: entry.wins ?? 0 } : { ...base, found: entry.found ?? 0 }
  })
}
