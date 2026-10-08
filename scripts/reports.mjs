// Reports of leaderboard entries (collection reports, written by the site and the app: src/utils/reports.js),
// for the admin. Firestore rules forbid reading reports and deleting scores from a client, so this runs with the
// Admin SDK. It never changes anything unless --apply is given, and then asks for a confirmation.
//
//   node scripts/reports.mjs                                  list the reports, grouped by reported entry
//   node scripts/reports.mjs --delete-score scores/<id>       dry run: shows the entry and its reports
//   node scripts/reports.mjs --delete-score scores/<id> --apply
//                                                             deletes the entry and its reports (asks first)
//   node scripts/reports.mjs --dismiss scores/<id> --apply    deletes the reports of an entry, keeps the entry
//
// <collection> is scores, ascension_scores, daily_scores or survival_scores; the id is the document id (in the list below, and in
// Firebase console > Firestore). Add --yes to skip the question (scripts, tests on the emulator).
//
// Credentials, in this order:
//   - FIRESTORE_EMULATOR_HOST set (npm run emulators): the emulator, no key, project geogame-sdmm;
//   - --key path/to/serviceAccount.json, or the FIREBASE_SERVICE_ACCOUNT variable (the JSON itself), as for api/;
//   - else the application default credentials (gcloud auth application-default login).
// A service account key is generated in Firebase console > Project settings > Service accounts. Keep it out of the
// repository (serviceAccount*.json is git-ignored).
import { readFileSync } from 'fs'
import { createInterface } from 'readline/promises'
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const COLLECTIONS = ['scores', 'ascension_scores', 'daily_scores', 'survival_scores']
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'geogame-sdmm'
const BATCH_SIZE = 400

const args = process.argv.slice(2)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const apply = args.includes('--apply')
const yes = args.includes('--yes')
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

function credentials() {
  const keyPath = option('--key')
  if (keyPath) return cert(JSON.parse(readFileSync(keyPath, 'utf8')))
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  return applicationDefault()
}

initializeApp(emulator ? { projectId: PROJECT_ID } : { credential: credentials(), projectId: PROJECT_ID })
const db = getFirestore()

// 'scores/abc123' -> { collection, id }
function parseTarget(value) {
  const [collection, id, ...rest] = String(value ?? '').split('/')
  if (!COLLECTIONS.includes(collection) || !id || rest.length > 0) {
    console.error(`Expected <collection>/<id> with a collection among ${COLLECTIONS.join(', ')}, got "${value}".`)
    process.exit(1)
  }
  return { collection, id }
}

const when = (timestamp) => timestamp?.toDate?.().toISOString().slice(0, 16).replace('T', ' ') ?? '?'
const summary = (data) =>
  data
    ? Object.entries(data)
        .filter(([key]) => !['phaseStats', 'guesses', 'playerOrder'].includes(key))
        .map(([key, value]) => `${key}=${value?.toDate ? when(value) : JSON.stringify(value)}`)
        .join(' ')
    : '(entry already deleted)'

async function reportsOf({ collection, id }) {
  const snapshot = await db.collection('reports').where('targetCollection', '==', collection).where('targetId', '==', id).get()
  return snapshot.docs
}

async function deleteAll(refs) {
  for (let start = 0; start < refs.length; start += BATCH_SIZE) {
    const batch = db.batch()
    refs.slice(start, start + BATCH_SIZE).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

async function confirm(question) {
  if (yes) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`${question} Type "delete" to confirm: `)
    return answer.trim().toLowerCase() === 'delete'
  } finally {
    rl.close()
  }
}

async function list() {
  const snapshot = await db.collection('reports').get()
  if (snapshot.empty) return console.log('No reports.')
  const groups = new Map()
  for (const doc of snapshot.docs) {
    const { targetCollection, targetId } = doc.data()
    const key = `${targetCollection}/${targetId}`
    groups.set(key, [...(groups.get(key) ?? []), doc])
  }
  console.log(`${snapshot.size} reports on ${groups.size} entries (most reported first)\n`)
  const sorted = [...groups].sort((a, b) => b[1].length - a[1].length)
  for (const [key, docs] of sorted) {
    const { collection, id } = parseTarget(key)
    const entry = await db.collection(collection).doc(id).get()
    console.log(`${key}  ${docs.length} report(s)`)
    console.log(`  entry:  ${summary(entry.data())}`)
    for (const doc of docs) {
      const { reporter, reason, note, createdAt } = doc.data()
      console.log(`  - ${when(createdAt)}  ${reason}  by ${reporter}${note ? `  "${note}"` : ''}`)
    }
    console.log()
  }
  console.log('Delete an entry:   node scripts/reports.mjs --delete-score <collection>/<id> --apply')
  console.log('Dismiss reports:   node scripts/reports.mjs --dismiss <collection>/<id> --apply')
}

async function removeEntry(target, { deleteEntry }) {
  const entry = await db.collection(target.collection).doc(target.id).get()
  const reports = await reportsOf(target)
  console.log(`entry ${target.collection}/${target.id}: ${summary(entry.data())}`)
  reports.forEach((doc) => console.log(`  report ${doc.id}: ${doc.get('reason')}`))
  const what = [deleteEntry && entry.exists && 'the entry', `${reports.length} report(s)`].filter(Boolean).join(' and ')
  if (!apply) return console.log(`Dry run: nothing changed. Add --apply to delete ${what}.`)
  if (!emulator) console.log(`!! Project ${PROJECT_ID}: this is the real database.`)
  if (!(await confirm(`Delete ${what}?`))) return console.log('Cancelled, nothing changed.')
  await deleteAll([...(deleteEntry && entry.exists ? [entry.ref] : []), ...reports.map((doc) => doc.ref)])
  console.log(`Deleted ${what}.`)
}

if (args.includes('--delete-score')) await removeEntry(parseTarget(option('--delete-score')), { deleteEntry: true })
else if (args.includes('--dismiss')) await removeEntry(parseTarget(option('--dismiss')), { deleteEntry: false })
else await list()
