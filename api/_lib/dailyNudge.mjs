// "Come beat me" push: a player who just finished a daily challenge nudges one of their friends to play it too
// (mobile/src/components/game/NudgeFriends.tsx). Sent to every device of the friend (api/_lib/push.mjs).
// The app calls POST /api/daily-nudge { friendUid, gameType } with the ID token of the player. What is sent is built here
// from the accounts, never from the request: the sender must be friends with the target (accepted friendship) and must
// have played that daily challenge today (users/{uid}/games/daily_{gameType}_{day}, written by the app at the end of the game).
// dailyNudges/{from}_{to}_{gameType} = { from, to, day, at }: last nudge, server only (no client access in
// firestore.rules), so a friend gets one nudge per game per day from the same player.
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

const BODY = {
  fr: '{{username}} a fini {{game}} du jour. Bah alors, viens me battre ! 😏',
  en: '{{username}} just finished today’s {{game}}. Come and beat me! 😏',
  ru: '{{username}} прошёл(а) {{game}} дня. Ну что, приходи побеждать! 😏',
  es: '{{username}} ha terminado {{game}} de hoy. ¿Y bien? ¡Ven a ganarme! 😏',
  pt: '{{username}} terminou {{game}} de hoje. E aí, vem me vencer! 😏',
  de: '{{username}} hat {{game}} von heute geschafft. Na, komm und schlag mich! 😏',
  it: '{{username}} ha finito {{game}} di oggi. Allora, vieni a battermi! 😏',
}

export function nudgeMessage(lang, username, gameType) {
  const locale = LOCALES[lang] ? lang : 'en'
  const game = LOCALES[locale].games?.[NUDGE_GAMES[gameType]]?.title ?? gameType
  return BODY[locale].replace('{{username}}', username).replace('{{game}}', game)
}

export const friendshipOf = (a, b) => [a, b].sort().join('_')

// `db` and `auth`: firebase-admin Firestore and Auth; `webPush`: see pushToAccount. Returns { status, body } for the HTTP response.
export async function sendDailyNudge({ db, auth, idToken, friendUid, gameType, fetchImpl = fetch, now = Date.now(), accessToken, webPush = null }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  if (typeof friendUid !== 'string' || !friendUid || friendUid.includes('/') || !Object.hasOwn(NUDGE_GAMES, gameType)) {
    return reply(400, { error: 'bad_request' })
  }
  const uid = await callerUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthenticated' })
  if (friendUid === uid) return reply(400, { error: 'bad_request' })

  const day = dailyKeyAt(now)
  const friendshipRef = db.doc(`friendships/${friendshipOf(uid, friendUid)}`)
  const gameRef = db.doc(`users/${uid}/games/daily_${gameType}_${day}`)
  const nudgeRef = db.doc(`dailyNudges/${uid}_${friendUid}_${gameType}`)
  const limitRef = db.doc(`invitePushLimits/${uid}`)
  // Claims the nudge in a transaction, so a double tap can't send it twice.
  let username
  try {
    username = await db.runTransaction(async (transaction) => {
      const [friendship, game, lastNudge, limit] = await Promise.all([
        transaction.get(friendshipRef),
        transaction.get(gameRef),
        transaction.get(nudgeRef),
        transaction.get(limitRef),
      ])
      if (!friendship.exists || friendship.data().status !== 'accepted' || !friendship.data().users?.includes(uid)) {
        throw reply(403, { error: 'not_friends' })
      }
      if (!game.exists || game.data().mode !== 'daily') throw reply(409, { error: 'not_played' })
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
      body: nudgeMessage(lang, username, gameType),
      data: { type: 'daily_nudge', uid, gameType },
    }),
    channelId: 'daily',
    fetchImpl,
    accessToken,
    webPush,
  })
}
