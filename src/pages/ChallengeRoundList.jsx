// src/pages/ChallengeRoundList.jsx
// The 12 rounds of a Daily Challenge run, each with what it asked and whether it was right: the result screen and the
// leaderboard rows show the same list.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TYPES } from '../utils/gameTypes'
import { CHALLENGE_ROUND_EMOJI } from '../utils/dailyChallenge'
import { getCountryName } from '../utils/getCountryName'
import { roundAnswer } from './survival/SurvivalRounds'
import './ChallengeRoundList.css'

// What a round asked and its answer: "🏛️ Paris (France)"
function answerLabel(round, lang, t) {
  const answer = roundAnswer(round, lang, t)
  if (round.type !== GAME_TYPES.CAPITALS) return answer
  const p = round.country.properties
  return `${answer} (${getCountryName(p.ISO_A2, lang) || p.ADMIN})`
}

// rights: one boolean per round
export default function ChallengeRoundList({ rounds, rights }) {
  const { t, i18n } = useTranslation()
  return (
    <ol className="challenge-rounds">
      {rounds.map((round, index) => (
        <li key={index} className={`challenge-round challenge-round--${rights[index] ? 'correct' : 'failed'}`}>
          <span className="challenge-round-icon" title={t(`survival.round_type.${round.type}`)}>{CHALLENGE_ROUND_EMOJI[round.type]}</span>
          <span className="challenge-round-answer" title={answerLabel(round, i18n.language, t)}>{answerLabel(round, i18n.language, t)}</span>
          <span className="challenge-round-result">{rights[index] ? '✅' : '❌'}</span>
        </li>
      ))}
    </ol>
  )
}
