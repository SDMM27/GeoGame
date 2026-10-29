// XP and missions (src/utils/missions.js holds the rules and the data model). Called by POST /api/xp for the signed-in
// player, after each game and when the missions are shown; the server alone writes users/{uid}.xp (the rules refuse
// it to the player).
//
// The progress is read from the player's own history (users/{uid}/games), which the player writes: a game made up
// there can complete a mission. What bounds it is that a mission pays once per period, games pay for GAMES_PER_DAY
// a day at most, and the history's fields are bounded by the rules. Asking again pays nothing more (idempotent).
//
// users/{uid}.xp = { total, level, day, dayMissions, dayGames, dayRewards, week, weekMissions, streak } (readXp in
// missions.js). Besides the XP, the claim pays flag fragments for the weekly missions, the levels, the dailies of the day
// (dayRewards: the tiers paid today) and the streak of days with a daily ({ day, count }). A player who has no streak yet
// gets it built once from their last STREAK_SEED_DAYS days (nothing is paid for it), then the claims keep it up to date.
import countriesMeta from '../../src/data/countries.meta.json' with { type: 'json' }
import { addFragments, flagPool, readFlags } from '../../src/utils/flagCollection.js'
import { grantXp, missionDayAt, readXp, seedStreak, weekKeyOf } from '../../src/utils/missions.js'

const DAY_MS = 24 * 60 * 60 * 1000
// The games of the current week (Paris) are within the last 8 days whatever the time zone offset.
const HISTORY_WINDOW_MS = 8 * DAY_MS
const MAX_GAMES = 1000
// The history read once to build the streak of a player who has none (any game, filtered on mode 'daily' here: a query
// on mode would need a composite index), and its cap.
const STREAK_SEED_DAYS = 100
const MAX_SEED_GAMES = 5000

// The flags that fragments unlock.
const POOL = flagPool(countriesMeta.features)

const reply = (status, body) => ({ status, body })

async function verifiedUid(auth, idToken) {
  if (!idToken) return null
  try {
    return (await auth.verifyIdToken(idToken)).uid
  } catch {
    return null
  }
}

const toGame = (snapshot) => {
  const data = snapshot.data()
  return { ...data, playedAt: data.playedAt?.toMillis?.() }
}

/** Pays what the player's recent games earn: { xp, gained, levelUp, flags, fragments, rewards,
 *  unlockedFlags }: the fragments (missions, levels, dailies, streak) go to the flag collection in the same transaction
 *  as the XP; `rewards` details the ones of the dailies and the streak (grantXp). */
export async function claimXp({ db, uid, now = Date.now(), Timestamp }) {
  const userRef = db.doc(`users/${uid}`)
  const snapshot = await userRef
    .collection('games')
    .where('playedAt', '>=', Timestamp.fromMillis(now - HISTORY_WINDOW_MS))
    .orderBy('playedAt', 'desc')
    .limit(MAX_GAMES)
    .get()
  // A game written a moment ago has its server time; one "from the future" (impossible through the rules) is ignored.
  const games = snapshot.docs.map(toGame).filter((game) => Number.isFinite(game.playedAt) && game.playedAt <= now + 60000)
  const day = missionDayAt(now)
  const week = weekKeyOf(day)

  return db.runTransaction(async (transaction) => {
    const user = await transaction.get(userRef)
    if (!user.exists || !user.data().username) return reply(403, { error: 'no_account' })
    let before = readXp(user.data(), day, week)
    if (!before.streak) {
      const seed = await transaction.get(
        userRef
          .collection('games')
          .where('playedAt', '>=', Timestamp.fromMillis(now - STREAK_SEED_DAYS * DAY_MS))
          .orderBy('playedAt', 'desc')
          .limit(MAX_SEED_GAMES)
      )
      before = { ...before, streak: seedStreak(seed.docs.map(toGame), day) }
    }
    const { gained, fragments, rewards, levelUp, state } = grantXp(before, games, now)
    const collected = addFragments(readFlags(user.data(), POOL), fragments, POOL, uid)
    const changes = {}
    const stored = user.data().xp
    if (gained > 0 || fragments > 0 || stored?.day !== day || stored?.week !== week || JSON.stringify(stored?.streak) !== JSON.stringify(state.streak)) changes.xp = state
    if (fragments > 0) changes.flags = collected.state
    if (Object.keys(changes).length > 0) transaction.update(userRef, changes)
    return reply(200, { xp: state, gained, levelUp, flags: collected.state, fragments, rewards, unlockedFlags: collected.unlocked })
  })
}

/** POST /api/xp: no body. */
export async function handleXp({ db, auth, idToken, now = Date.now(), Timestamp }) {
  const uid = await verifiedUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthorized' })
  return claimXp({ db, uid, now, Timestamp })
}
