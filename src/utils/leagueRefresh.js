// Asks the server to recompute the weekly league (api/league-refresh) after a daily score, so the League page doesn't wait
// for the daily cron. Best effort like xp.js: a failure never breaks anything. The server refreshes at most once per
// window and answers { skipped, retryIn } otherwise: one retry then picks up the score.
let pushApi = null

export async function refreshLeague(retry = true) {
  try {
    pushApi ??= import('./pushApi')
    const response = await (await pushApi).callPush('league-refresh', {})
    if (retry && response?.status === 200 && response.body?.skipped && response.body.retryIn) {
      setTimeout(() => refreshLeague(false), response.body.retryIn + 1000)
    }
  } catch (error) {
    console.warn('[league]', error)
  }
}
