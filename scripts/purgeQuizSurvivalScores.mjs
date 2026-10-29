// One-off purge of the survival leaderboard scores that had Geo Quiz rounds (`modes` contains QUIZ, e.g. 'FLAGS+QUIZ'),
// since the quiz is hidden (src/utils/gameAvailability.js) and the rules refuse new ones. The "all games" leaderboard
// and every combination with the quiz start again from zero. Each score is first copied to an archive collection
// (survival_scores_quiz_archive, same id; no rule opens it to clients), then deleted.
//
// Firestore rules forbid deleting scores, so this runs with the Admin SDK and a service account key (see
// purgeAnonymousScores.mjs). Dry run by default: it only prints the count and a sample.
//
//   node scripts/purgeQuizSurvivalScores.mjs --key path/to/serviceAccount.json           # dry run
//   node scripts/purgeQuizSurvivalScores.mjs --key path/to/serviceAccount.json --apply   # archive, then delete
import { readFileSync } from 'fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const COLLECTION = 'survival_scores'
const BATCH_SIZE = 400
const SAMPLE_SIZE = 5

const args = process.argv.slice(2)
const keyPath = args[args.indexOf('--key') + 1]
const apply = args.includes('--apply')
if (!args.includes('--key') || !keyPath) {
  console.error('Usage: node scripts/purgeQuizSurvivalScores.mjs --key <serviceAccount.json> [--dry-run | --apply]')
  process.exit(1)
}
if (apply && args.includes('--dry-run')) {
  console.error('Pick one of --dry-run and --apply.')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
const db = getFirestore()

// Runs `write(batch, doc)` for every document, in batches.
async function inBatches(docs, write) {
  for (let start = 0; start < docs.length; start += BATCH_SIZE) {
    const batch = db.batch()
    docs.slice(start, start + BATCH_SIZE).forEach((doc) => write(batch, doc))
    await batch.commit()
  }
}

const snapshot = await db.collection(COLLECTION).get()
const withQuiz = snapshot.docs.filter((doc) => String(doc.get('modes') ?? '').split('+').includes('QUIZ'))
console.log(`${COLLECTION}: ${snapshot.size} scores, ${withQuiz.length} with quiz rounds`)
for (const doc of withQuiz.slice(0, SAMPLE_SIZE)) {
  const { name, modes, lives, timer, ramp, score } = doc.data()
  console.log(`  ${doc.id}: ${name} · ${modes} · ${lives} lives · ${timer}s · ${ramp} · ${score}`)
}

if (!apply || withQuiz.length === 0) {
  console.log(apply ? 'Nothing to purge.' : 'Dry run: nothing changed. Add --apply to archive and delete.')
  process.exit(0)
}

const archive = db.collection(`${COLLECTION}_quiz_archive`)
await inBatches(withQuiz, (batch, doc) => batch.set(archive.doc(doc.id), doc.data()))

// Only delete what the archive really holds.
const archived = new Set((await archive.get()).docs.map((doc) => doc.id))
const missing = withQuiz.filter((doc) => !archived.has(doc.id))
if (missing.length > 0) {
  throw new Error(`${COLLECTION}: ${missing.length} scores missing from ${COLLECTION}_quiz_archive, nothing deleted`)
}
console.log(`  archived to ${COLLECTION}_quiz_archive`)

await inBatches(withQuiz, (batch, doc) => batch.delete(doc.ref))
console.log(`  deleted ${withQuiz.length} from ${COLLECTION}`)
