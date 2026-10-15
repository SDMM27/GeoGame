// "Come beat me" push: a player who just finished a game nudges one of their friends to play it too
// (mobile/src/components/game/NudgeFriends.tsx). Sent to every device of the friend (api/_lib/push.mjs).
// The app calls POST /api/daily-nudge { friendUid, gameType, mode? } with the ID token of the player. What is sent is built
// here from the accounts, never from the request: the sender must be friends with the target (accepted friendship) and must
// have played the game (written by the app at the end of the game):
//   daily (default): that daily challenge today (users/{uid}/games/daily_{gameType}_{day})
//   mode 'recent':   a game of that type in the last RECENT_MS, its score goes in the message
// dailyNudges/{from}_{to}_{gameType}[_recent] = { from, to, day, at }: last nudge, server only (no client access in
// firestore.rules), so a friend gets one nudge per game, per day and per kind from the same player.
import { createRequire } from 'module'

import { dailyKeyAt } from './dailyReminder.mjs'
import { callerUid, countSenderPush, pushToAccount, reply } from './push.mjs'

const require = createRequire(import.meta.url)
const LOCALES = {
  fr: require('../../src/i18n/locales/fr.json'),
  en: require('../../src/i18n/locales/en.json'),
  ru: require('../../src/i18n/locales/ru.json'),
  es: require('../../src/i18n/locales/es.json'),
  pt: require('../../src/i18n/locales/pt.json'),
  de: require('../../src/i18n/locales/de.json'),
  it: require('../../src/i18n/locales/it.json'),
}

// Games with a daily challenge (src/utils/gameTypes.js) → id of their title in the locales (games.{id}.title).
export const NUDGE_GAMES = {
  BORDER_GUESS: 'border_guess',
  COUNTRY_CLUE: 'country_clue',
  VOYAGE_VOYAGE: 'voyage_voyage',
  RANKING: 'ranking',
  QUIZ: 'quiz',
}

// Games that can be nudged after a regular game (no daily challenge needed).
export const RECENT_GAMES = { ...NUDGE_GAMES, FLAGS: 'flags', CAPITALS: 'capitals', PLACEMENT: 'placement' }
// How long after the end of a game it can be nudged.
export const RECENT_MS = 3 * 60 * 60 * 1000

const BODY = {
  fr: '{{username}} a fini {{game}} du jour. Bah alors, viens me battre ! 😏',
  en: '{{username}} just finished today’s {{game}}. Come and beat me! 😏',
  ru: '{{username}} прошёл(а) {{game}} дня. Ну что, приходи побеждать! 😏',
  es: '{{username}} ha terminado {{game}} de hoy. ¿Y bien? ¡Ven a ganarme! 😏',
  pt: '{{username}} terminou {{game}} de hoje. E aí, vem me vencer! 😏',
  de: '{{username}} hat {{game}} von heute geschafft. Na, komm und schlag mich! 😏',
  it: '{{username}} ha finito {{game}} di oggi. Allora, vieni a battermi! 😏',
}

const RECENT_BODY = {
  fr: '{{username}} vient de jouer à {{game}}{{score}}. Viens me battre ! 😏',
  en: '{{username}} just played {{game}}{{score}}. Come and beat me! 😏',
  ru: '{{username}} только что сыграл(а) в {{game}}{{score}}. Приходи побеждать! 😏',
  es: '{{username}} acaba de jugar a {{game}}{{score}}. ¡Ven a ganarme! 😏',
  pt: '{{username}} acabou de jogar {{game}}{{score}}. Vem me vencer! 😏',
  de: '{{username}} hat gerade {{game}} gespielt{{score}}. Komm und schlag mich! 😏',
  it: '{{username}} ha appena giocato a {{game}}{{score}}. Vieni a battermi! 😏',
}

// `score`: points of the game just played, when it has some (mode 'recent' only).
export function nudgeMessage(lang, username, gameType, { recent = false, score = null } = {}) {
  const locale = LOCALES[lang] ? lang : 'en'
  const game = LOCALES[locale].games?.[RECENT_GAMES[gameType]]?.title ?? gameType
  const points = recent && Number.isFinite(score) ? ` (${Math.round(score)} pts)` : ''
  return (recent ? RECENT_BODY : BODY)[locale]
    .replace('{{username}}', username)
    .replace('{{game}}', game)
    .replace('{{score}}', points)
}

export const friendshipOf = (a, b) => [a, b].sort().join('_')

// `db` and `auth`: firebase-admin Firestore and Auth; `webPush`: see pushToAccount. Returns { status, body } for the HTTP response.
export async function sendDailyNudge({ db, auth, idToken, friendUid, gameType, mode, fetchImpl = fetch, now = Date.now(), accessToken, webPush = null }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  const recent = mode === 'recent'
  if (mode != null && !recent) return reply(400, { error: 'bad_request' })
  if (typeof friendUid !== 'string' || !friendUid || friendUid.includes('/') || !Object.hasOwn(recent ? RECENT_GAMES : NUDGE_GAMES, gameType)) {
    return reply(400, { error: 'bad_request' })
  }
  const uid = await callerUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthenticated' })
  if (friendUid === uid) return reply(400, { error: 'bad_request' })

  const day = dailyKeyAt(now)
  const friendshipRef = db.doc(`friendships/${friendshipOf(uid, friendUid)}`)
  const gameRef = db.doc(`users/${uid}/games/daily_${gameType}_${day}`)
  const nudgeRef = db.doc(`dailyNudges/${uid}_${friendUid}_${gameType}${recent ? '_recent' : ''}`)
  // Ordered on playedAt alone (no composite index): the game type is filtered below.
  const recentGamesQuery = db.collection(`users/${uid}/games`).orderBy('playedAt', 'desc').limit(10)
  const limitRef = db.doc(`invitePushLimits/${uid}`)
  // Claims the nudge in a transaction, so a double tap can't send it twice.
  let username
  let score = null
  try {
    username = await db.runTransaction(async (transaction) => {
      const [friendship, game, lastNudge, limit, lastGames] = await Promise.all([
        transaction.get(friendshipRef),
        recent ? null : transaction.get(gameRef),
        transaction.get(nudgeRef),
        transaction.get(limitRef),
        recent ? transaction.get(recentGamesQuery) : null,
      ])
      if (!friendship.exists || friendship.data().status !== 'accepted' || !friendship.data().users?.includes(uid)) {
        throw reply(403, { error: 'not_friends' })
      }
      if (recent) {
        const played = lastGames.docs
          .map((snapshot) => snapshot.data())
          .find((data) => data.gameType === gameType && now - (data.playedAt?.toMillis?.() ?? 0) < RECENT_MS)
        if (!played) throw reply(409, { error: 'not_played' })
        score = typeof played.score === 'number' ? played.score : null
      } else if (!game.exists || game.data().mode !== 'daily') {
        throw reply(409, { error: 'not_played' })
      }
      if (lastNudge.exists && lastNudge.data().day === day) throw reply(429, { error: 'already_sent' })
      countSenderPush(transaction, limitRef, limit, now)
      transaction.set(nudgeRef, { from: uid, to: friendUid, day, at: now })
      return friendship.data().usernames?.[uid] ?? '?'
    })
  } catch (error) {
    if (error?.status) return error
    throw error
  }

  return pushToAccount({
    db,
    uid: friendUid,
    message: (lang) => ({
      body: nudgeMessage(lang, username, gameType, { recent, score }),
      data: { type: 'daily_nudge', uid, gameType, ...(recent && { mode: 'recent' }) },
    }),
    channelId: 'daily',
    fetchImpl,
    accessToken,
    webPush,
  })
}
