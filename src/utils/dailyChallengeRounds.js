// src/utils/dailyChallengeRounds.js
// The 12 rounds of the Daily Challenge of a day: [{ type, difficulty, country }]. Apart from dailyChallenge.js because it
// loads the countries; useDailyChallengeState gets the same rounds from useSurvivalState with the same settings.
import { CHALLENGE_ROUNDS, CHALLENGE_ROUND_TYPES, challengeRamp, challengeSeed } from './dailyChallenge'
import { buildSurvivalRounds } from './survival'

export const challengeRounds = (dailyKey) =>
  buildSurvivalRounds(CHALLENGE_ROUND_TYPES, challengeSeed(dailyKey), CHALLENGE_ROUNDS, challengeRamp(dailyKey), { distinctCountries: true })
