// One-off purge of the leaderboard scores that don't belong to an account (no `uid`), from the time
// leaderboards had no accounts. Each one is first copied to an archive collection (<name>_v2, same id,
// read only in firestore.rules), then deleted.
//
// Firestore rules forbid deleting scores, so this runs with the Admin SDK and a service account key:
// Firebase console > Project settings > Service accounts > Generate new private key.
// Keep the key out of the repository (serviceAccount*.json is git-ignored).
//
//   node scripts/purgeAnonymousScores.mjs --key path/to/serviceAccount.json           # dry run: counts only
//   node scripts/purgeAnonymousScores.mjs --key path/to/serviceAccount.json --apply   # archive, then delete
import { readFileSync } from 'fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const COLLECTIONS = ['scores', 'ascension_scores', 'daily_scores']
const BATCH_SIZE = 400

const args = process.argv.slice(2)
const keyPath = args[args.indexOf('--key') + 1]
const apply = args.includes('--apply')
if (!args.includes('--key') || !keyPath) {
  console.error('Usage: node scripts/purgeAnonymousScores.mjs --key <serviceAccount.json> [--apply]')
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

async function purge(name) {
  const snapshot = await db.collection(name).get()
  const anonymous = snapshot.docs.filter((doc) => !doc.get('uid'))
  console.log(`${name}: ${snapshot.size} scores, ${anonymous.length} without an account`)
  if (!apply || anonymous.length === 0) return

  const archive = db.collection(`${name}_v2`)
  await inBatches(anonymous, (batch, doc) => batch.set(archive.doc(doc.id), doc.data()))

  // Only delete what the archive really holds.
  const archived = await archive.get()
  const archivedIds = new Set(archived.docs.map((doc) => doc.id))
  const missing = anonymous.filter((doc) => !archivedIds.has(doc.id))
  if (missing.length > 0) {
    throw new Error(`${name}: ${missing.length} scores missing from ${name}_v2, nothing deleted`)
  }
  console.log(`  archived to ${name}_v2`)

  await inBatches(anonymous, (batch, doc) => batch.delete(doc.ref))
  console.log(`  deleted ${anonymous.length} from ${name}`)
}

for (const name of COLLECTIONS) await purge(name)
console.log(apply ? 'Done.' : 'Dry run: nothing changed. Add --apply to archive and delete.')
