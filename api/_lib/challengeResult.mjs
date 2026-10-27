// "How did your friend do?" push: once a challenged friend (api/_lib/dailyNudge.mjs) has played the game, the challenger
// learns whether the friend beat them, lost or tied. The app calls POST /api/challenge-result (no body) with the ID token
// of the friend after saving a game; every pending nudge sent to them (dailyNudges, resolved == false) whose game they have
// now played is resolved and pushed to its challenger. Nudges without `resolved` (sent before this existed) are ignored.
import { createRequire } from 'module'

import { compareToChallenge } from '../../src/utils/challenge.js'
import { friendshipOf, pickResult, ranksOnAttempts, RECENT_GAMES } from './dailyNudge.mjs'
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
  uk: require('../../src/i18n/locales/uk.json'),
}

// Keyed by the outcome from the friend's point of view: win = the friend beat the challenger.
const BODY = {
  win: {
    fr: '{{username}} t’a battu sur {{game}} 😤',
    en: '{{username}} beat you at {{game}} 😤',
    ru: '{{username}} победил(а) тебя в {{game}} 😤',
    es: '{{username}} te ha ganado en {{game}} 😤',
    pt: '{{username}} te venceu em {{game}} 😤',
    de: '{{username}} hat dich bei {{game}} geschlagen 😤',
    it: '{{username}} ti ha battuto a {{game}} 😤',
    uk: '{{username}} переміг(ла) тебе в {{game}} 😤',
  },
  lose: {
    fr: '{{username}} a perdu contre toi sur {{game}} 💪',
    en: '{{username}} lost to you at {{game}} 💪',
    ru: '{{username}} проиграл(а) тебе в {{game}} 💪',
    es: '{{username}} ha perdido contra ti en {{game}} 💪',
    pt: '{{username}} perdeu para você em {{game}} 💪',
    de: '{{username}} hat bei {{game}} gegen dich verloren 💪',
    it: '{{username}} ha perso contro di te a {{game}} 💪',
    uk: '{{username}} програв(ла) тобі в {{game}} 💪',
  },
  tie: {
    fr: '{{username}} a fait égalité avec toi sur {{game}} 🤝',
    en: '{{username}} tied with you at {{game}} 🤝',
    ru: '{{username}} сыграл(а) с тобой вничью в {{game}} 🤝',
    es: '{{username}} ha empatado contigo en {{game}} 🤝',
    pt: '{{username}} empatou com você em {{game}} 🤝',
    de: '{{username}} hat bei {{game}} unentschieden gegen dich gespielt 🤝',
    it: '{{username}} ha pareggiato con te a {{game}} 🤝',
    uk: '{{username}} зіграв(ла) з тобою внічию в {{game}} 🤝',
  },
}

// `username`: the friend who played, `outcome`: 'win' | 'lose' | 'tie' from their point of view.
export function challengeMessage(lang, { username, gameType, outcome }) {
  const locale = LOCALES[lang] ? lang : 'en'
  const game = LOCALES[locale].games?.[RECENT_GAMES[gameType]]?.title ?? gameType
  return BODY[outcome][locale].replace('{{username}}', username).replace('{{game}}', game)
}

// A score only means something against a game of the same mode, difficulty, continent and preset (an Ascension run
// against a standard game, or the daily Quiz's attempts against the infinite Quiz's points, would be meaningless).
const VARIANT = ['mode', 'difficulty', 'continent', 'presetName']
const sameVariant = (a, b) => VARIANT.every((field) => (a[field] ?? null) === (b[field] ?? null))

// Pure: the friend's game answering `nudge` among `games` ([{ id, data }], newest first, data.playedAt a Timestamp), or null.
// Pending nudges don't wait forever: api/cleanup-expired deletes them after a day.
export function findFriendGame(nudge, games) {
  if (nudge.mode === 'daily') return games.find((game) => game.id === `daily_${nudge.gameType}_${nudge.day}`)?.data ?? null
  return (
    games.find(
      (game) =>
        game.data.gameType === nudge.gameType &&
        (game.data.playedAt?.toMillis?.() ?? 0) >= nudge.at &&
        sameVariant(pickResult(nudge.gameType, game.data), nudge.challenger)
    )?.data ?? null
  )
}

// Pure: 'win' | 'lose' | 'tie' for the friend, or null while they haven't played the game.
export function challengeOutcome(nudge, games) {
  if (!nudge.challenger) return null
  const game = findFriendGame(nudge, games)
  if (!game) return null
  const mine = pickResult(nudge.gameType, game)
  // compareToChallenge ranks on attempts for the attempts games' types only: any other value ranks on points.
  const rankedAs = ranksOnAttempts(nudge.gameType, mine.mode) ? nudge.gameType : 'POINTS'
  return compareToChallenge(rankedAs, mine, nudge.challenger)
}

// `db` and `auth`: firebase-admin Firestore and Auth; `webPush`: see pushToAccount. Returns { status, body } for the HTTP response.
export async function sendChallengeResult({ db, auth, idToken, fetchImpl = fetch, now = Date.now(), accessToken, webPush = null }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  const uid = await callerUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthenticated' })

  const pending = await db.collection('dailyNudges').where('to', '==', uid).where('resolved', '==', false).get()
  if (pending.empty) return reply(200, { notified: 0 })
  // Ordered on playedAt alone (no composite index): the game type is matched in findFriendGame.
  const lastGames = await db.collection(`users/${uid}/games`).orderBy('playedAt', 'desc').limit(10).get()
  const games = lastGames.docs.map((snapshot) => ({ id: snapshot.id, data: snapshot.data() }))
  const limitRef = db.doc(`invitePushLimits/${uid}`)

  let notified = 0
  for (const snapshot of pending.docs) {
    try {
      const nudge = snapshot.data()
      const outcome = challengeOutcome(nudge, games)
      if (!outcome) continue
      const friendship = await db.doc(`friendships/${friendshipOf(nudge.from, uid)}`).get()
      // No longer friends: no push (the nudge stays pending until api/cleanup-expired drops it).
      if (friendship.data()?.status !== 'accepted') continue
      const username = friendship.data().usernames?.[uid] ?? '?'
      // Claims the nudge in a transaction, so two calls can't push the same result twice.
      const claimed = await db.runTransaction(async (transaction) => {
        const [fresh, limit] = await Promise.all([transaction.get(snapshot.ref), transaction.get(limitRef)])
        if (!fresh.exists || fresh.data().resolved !== false) return false
        countSenderPush(transaction, limitRef, limit, now)
        transaction.update(snapshot.ref, { resolved: true, resolvedAt: now })
        return true
      })
      if (!claimed) continue
      const result = await pushToAccount({
        db,
        uid: nudge.from,
        message: (lang) => ({
          body: challengeMessage(lang, { username, gameType: nudge.gameType, outcome }),
          data: { type: 'challenge_result', uid, gameType: nudge.gameType, outcome },
        }),
        channelId: 'daily',
        fetchImpl,
        accessToken,
        webPush,
      })
      if (result.status === 200 && result.body.sent > 0) notified++
    } catch (error) {
      // A rate limit (thrown reply) leaves the nudge pending for the next game.
      if (!error?.status) console.error('[challenge-result]', snapshot.id, error)
    }
  }
  return reply(200, { notified })
}
