// Brings the solo scores back under the highest score a game can reach today. When countries leave a difficulty
// (Oct 2026: Guantánamo, Baïkonour, Siachen and the Cyprus buffer zone out of Impossible), the scores made with the
// old list can be higher than any new game, so nobody can beat them, their owner included (a save must be better).
// Each such score becomes the new maximum, a perfect game, and keeps its time: a perfect game played faster passes it.
//
// Firestore rules only let a score grow, so this runs with the Admin SDK and a service account key
// (see purgeAnonymousScores.mjs). A dry run lists the scores it would change; --apply also writes a backup of them
// next to the key (clampSoloScores-backup-<date>.json) before updating them.
//
//   node scripts/clampSoloScores.mjs --key path/to/serviceAccount.json           # dry run
//   node scripts/clampSoloScores.mjs --key path/to/serviceAccount.json --apply   # backup, then update
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { computeLimits } from './scoreCaps.mjs'

const BATCH_SIZE = 400

const args = process.argv.slice(2)
const keyPath = args[args.indexOf('--key') + 1]
const apply = args.includes('--apply')
if (!args.includes('--key') || !keyPath) {
  console.error('Usage: node scripts/clampSoloScores.mjs --key <serviceAccount.json> [--apply]')
  process.exit(1)
}

// Highest score of each "GAME_difficulty" with the current data (no margin, unlike the rules' caps).
const maxByMode = Object.fromEntries(computeLimits().solo.rows.map(({ game, mode, max }) => [`${game}_${mode}`, max]))

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
const db = getFirestore()

const snapshot = await db.collection('scores').get()
const stale = snapshot.docs
  .map((doc) => ({ doc, max: maxByMode[`${doc.get('gameType')}_${doc.get('difficulty')}`] }))
  .filter(({ doc, max }) => max != null && doc.get('score') > max)

console.log(`scores: ${snapshot.size} documents, ${stale.length} above the current maximum`)
for (const { doc, max } of stale) {
  const { name, gameType, difficulty, score, elapsedTime } = doc.data()
  console.log(`  ${doc.id}  ${gameType}_${difficulty}  ${name}: ${score} -> ${max} (time ${elapsedTime ?? '-'} ms)`)
}

if (apply && stale.length > 0) {
  const backup = join(dirname(keyPath), `clampSoloScores-backup-${new Date().toISOString().slice(0, 10)}.json`)
  writeFileSync(backup, JSON.stringify(stale.map(({ doc }) => ({ id: doc.id, ...doc.data() })), null, 2))
  console.log(`backup: ${backup}`)

  for (let start = 0; start < stale.length; start += BATCH_SIZE) {
    const batch = db.batch()
    stale.slice(start, start + BATCH_SIZE).forEach(({ doc, max }) => batch.update(doc.ref, { score: max }))
    await batch.commit()
  }
  console.log(`updated ${stale.length} scores`)
}
console.log(apply ? 'Done.' : 'Dry run: nothing changed. Add --apply to update.')
