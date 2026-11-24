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
// The claim also pays scroll seals (the weekly bonus, every 5th level) into users/{uid}.scrolls (scrollCollection.js),
// and grants the starter scroll to any account on its first claim.
//
// The claim also pays the solo records (src/utils/recordRewards.js): XP when a best score of the grid beats the one the
// server last saw, more XP and fragments the first time a cell reaches its perfect score. The bests come from the player's
// `scores` documents; users/{uid}.records = { best, perfect, day, dayPaid } keeps what was seen and paid. The first claim
// only seeds it (and pays the perfect cells already held, once). The records' XP counts toward the levels of the same claim.
import countriesMeta from '../../src/data/countries.meta.json' with { type: 'json' }
import { flagPool } from '../../src/utils/flagCollection.js'
import { awardFlagFragments, isHistoricalFlag, readHistoricalFlags } from '../../src/utils/historicalFlagCollection.js'
import { SCROLLS } from '../../src/data/scrolls.js'
import { grantXp, missionDayAt, readXp, seedStreak, weekKeyOf } from '../../src/utils/missions.js'
import { payScrolls } from '../../src/utils/scrollCollection.js'
import { bestScoresOf, grantRecords, readRecords } from '../../src/utils/recordRewards.js'

const DAY_MS = 24 * 60 * 60 * 1000
// The games of the current week (Paris) are within the last 8 days whatever the time zone offset.
const HISTORY_WINDOW_MS = 8 * DAY_MS
const MAX_GAMES = 1000
// The history read once to build the streak of a player who has none (any game, filtered on mode 'daily' here: a query
// on mode would need a composite index), and its cap.
const STREAK_SEED_DAYS = 100
const MAX_SEED_GAMES = 5000
// The solo scores read to find the player's records (one document per cell at most: 5 games x 10 modes).
const MAX_SCORES = 200

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

/** Pays what the player's recent games and records earn: { xp, gained, levelUp, flags, fragments, rewards, records,
 *  unlockedFlags, historicalFlags, unlockedHistoricalFlags, classicFragments, historicalFragments, seals, scrolls,
 *  unlockedScrolls }: `records` details the record rewards (grantRecords); the fragments (missions, levels, dailies, streak) go to the selected flag collection and the seals
 *  (weekly bonus, levels) to the scroll collection in the same transaction as the XP; `rewards` details the fragments of
 *  the dailies and the streak (grantXp); `unlockedScrolls` includes the starter scroll when it was just granted. */
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
  const scores = await db.collection('scores').where('uid', '==', uid).limit(MAX_SCORES).get()
  const bests = bestScoresOf(scores.docs.map((document) => document.data()))
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
    const records = grantRecords(readRecords(user.data(), day), bests, day)
    const grant = grantXp({ ...before, total: before.total + records.gained }, games, now)
    const { seals, rewards, levelUp, state } = grant
    const gained = records.gained + grant.gained
    const fragments = records.fragments + grant.fragments
    const collection = awardFlagFragments(user.data(), fragments, POOL, uid)
    const paid = payScrolls(user.data(), seals, SCROLLS, uid)
    const changes = {}
    const stored = user.data().xp
    if (gained > 0 || fragments > 0 || stored?.day !== day || stored?.week !== week || JSON.stringify(stored?.streak) !== JSON.stringify(state.streak)) changes.xp = state
    if (records.changed) changes.records = records.state
    if (collection.classicFragments > 0) changes.flags = collection.flags
    if (collection.historicalFlags) changes.historicalFlags = collection.historicalFlags
    if (paid.changed) changes.scrolls = paid.state
    if (Object.keys(changes).length > 0) transaction.update(userRef, changes)
    return reply(200, {
      xp: state, gained, levelUp, fragments, rewards, records: records.rewards,
      ...collection, seals, scrolls: paid.state, unlockedScrolls: paid.unlocked,
    })
  })
}

async function selectHistoricalFlag({ db, uid, id }) {
  if (id !== null && !isHistoricalFlag(id)) return reply(400, { error: 'unknown_historical_flag' })
  const userRef = db.doc(`users/${uid}`)
  return db.runTransaction(async (transaction) => {
    const user = await transaction.get(userRef)
    if (!user.exists || !user.data().username) return reply(403, { error: 'no_account' })
    const historicalFlags = readHistoricalFlags(user.data())
    if (historicalFlags.unlocked.includes(id)) return reply(409, { error: 'already_unlocked' })
    if (historicalFlags.active !== id) {
      historicalFlags.active = id
      transaction.update(userRef, { historicalFlags })
    }
    return reply(200, { historicalFlags })
  })
}

/** POST /api/xp: an empty body claims XP; the historical flag action selects the next reward target. */
export async function handleXp({ db, auth, idToken, body, now = Date.now(), Timestamp }) {
  const uid = await verifiedUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthorized' })
  if (body?.action === 'selectHistoricalFlag') {
    if (body.uid !== uid) return reply(403, { error: 'account_mismatch' })
    return selectHistoricalFlag({ db, uid, id: body.id })
  }
  return claimXp({ db, uid, now, Timestamp })
}
