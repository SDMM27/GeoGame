// POST /api/challenge-result  with  Authorization: Bearer <Firebase ID token of the player who just finished a game>.
// Environment: see api/_lib/pushHandler.mjs.
import { sendChallengeResult } from './_lib/challengeResult.mjs'
import { pushHandler } from './_lib/pushHandler.mjs'

export default pushHandler('challenge-result', (context) => sendChallengeResult(context))
