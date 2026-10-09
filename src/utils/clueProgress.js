// Country Clue: how each guess compares with the ones before it, to see whether the player is getting closer.
// Pure: guesses are the records of useCountryClueState ({ distanceKm, isCorrect }).

/**
 * One entry per guess, in the same order: { deltaKm, closest }.
 * `deltaKm`: distance compared with the previous guess (negative: closer), null for the first one or the right answer.
 * `closest`: the wrong guess that came nearest (only once there are at least two wrong guesses).
 */
export function clueProgress(guesses) {
  const wrong = guesses.filter((guess) => !guess.isCorrect && guess.distanceKm != null)
  const best = wrong.length > 1 ? Math.min(...wrong.map((guess) => guess.distanceKm)) : null
  let bestTaken = false
  return guesses.map((guess, index) => {
    const previous = guesses[index - 1]
    const comparable = index > 0 && !guess.isCorrect && guess.distanceKm != null && previous?.distanceKm != null
    const closest = best != null && !guess.isCorrect && guess.distanceKm === best && !bestTaken
    if (closest) bestTaken = true
    return { deltaKm: comparable ? guess.distanceKm - previous.distanceKm : null, closest }
  })
}
