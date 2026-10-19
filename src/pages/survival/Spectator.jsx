// Out of lives in a live room: the round the others are playing (read-only), who is still in, and the answer once they all answered.
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TYPES } from '../../utils/gameTypes'
import { SURVIVAL_ROUND_ICONS } from '../../components/SurvivalOptions'
import { localizeQuestion } from '../../utils/quizQuestions'
import { DIFFICULTY_COLORS } from '../quiz/constants'
import { BorderSilhouette, countryLabel, roundAnswer } from './SurvivalRounds'
import './Survival.css'

// What the players still in the game are asked in this round
function SpectatorQuestion({ round, revealed }) {
  const { t, i18n } = useTranslation()
  const localized = useMemo(
    () => (round.type === GAME_TYPES.QUIZ ? localizeQuestion(round.question, i18n.language, t) : null),
    [round, i18n.language, t]
  )
  const iso = round.country?.properties?.ISO_A2
  const flag = iso && <img src={`/flags/${iso.toLowerCase()}.png`} alt="" className="survival-flag survival-flag--small" />

  switch (round.type) {
    case GAME_TYPES.PLACEMENT:
      return <p className="survival-country-name">{countryLabel(round.country, i18n.language)}</p>
    case GAME_TYPES.FLAGS:
      return <img src={`/flags/${iso.toLowerCase()}.png`} alt="" className="survival-flag" />
    case GAME_TYPES.CAPITALS:
      return (
        <div className="survival-capital-country">
          {flag}
          <p className="survival-country-name">{countryLabel(round.country, i18n.language)}</p>
        </div>
      )
    case GAME_TYPES.BORDER_GUESS:
      return <BorderSilhouette country={round.country} />
    case GAME_TYPES.QUIZ:
      return (
        <div className="survival-spectator-quiz">
          <strong>{localized.prompt}</strong>
          <div className="quiz-choices">
            {localized.choices.map((choice, index) => (
              <div
                key={choice.id}
                className={`quiz-choice${revealed ? (choice.id === round.question.correctId ? ' quiz-choice--correct' : ' quiz-choice--dim') : ''}`}
              >
                <span className="quiz-choice-key">{index + 1}</span>
                {choice.label}
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function Spectator({ round, roundIndex, rows, waiting, maxLives, onExit }) {
  const { t, i18n } = useTranslation()
  const revealed = waiting.total > 0 && waiting.done === waiting.total
  return (
    <div className="survival-spectator">
      <p className="survival-spectator-title">👀 {t('survival.spectating')}</p>
      {round && (
        <div className="survival-spectator-round">
          <span className="survival-hud-label">
            {t('survival.round', { n: roundIndex + 1 })} · {SURVIVAL_ROUND_ICONS[round.type]} {t(`survival.prompt.${round.type}`)}
            {round.difficulty && (
              <span className="survival-hud-difficulty" style={{ color: DIFFICULTY_COLORS[round.difficulty] }}>
                {' · '}{t(`difficulties.${round.difficulty}`)}
              </span>
            )}
          </span>
          <SpectatorQuestion key={roundIndex} round={round} revealed={revealed} />
          <span className={revealed ? 'survival-spectator-answer' : 'survival-muted'}>
            {revealed ? t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) }) : t('survival.waiting_players', waiting)}
          </span>
        </div>
      )}
      <ul className="survival-spectator-list">
        {rows.map((row) => (
          <li key={row.id} className={row.out ? 'survival-spectator-row survival-spectator-row--out' : 'survival-spectator-row'}>
            <span className="survival-spectator-name">{row.pseudo}</span>
            {row.out ? (
              <span>💀 {t('survival.out_round', { n: row.outRound + 1 })}</span>
            ) : (
              <>
                <span>{maxLives > 5 ? `❤️ × ${row.lives}` : '❤️'.repeat(row.lives)}</span>
                <span className="survival-spectator-status">{row.answered ? '✓' : '…'}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <button className="survival-btn" onClick={onExit}>{t('survival.back_to_room')}</button>
    </div>
  )
}
