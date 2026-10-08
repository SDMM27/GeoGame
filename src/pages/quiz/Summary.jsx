import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ShareScoreButton from '../../components/ShareScoreButton'
import { GAME_TYPES } from '../../utils/gameTypes'
import { useRecordGame } from '../../auth'

export default function Summary({ stats, maxDifficulty, onRestart, onChangeDifficulty }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  useRecordGame(
    stats.answered > 0
      ? {
          gameType: GAME_TYPES.QUIZ,
          mode: 'infinite',
          score: stats.score,
          correct: stats.correct,
          answered: stats.answered,
          bestStreak: stats.bestStreak,
          difficulty: maxDifficulty,
        }
      : null
  )
  return (
    <section className="quiz-card quiz-summary">
      <h2 className="quiz-card-title">{t('quiz.summary_title')}</h2>
      <div className="quiz-summary-stats">
        <div><strong>{stats.score}</strong><small>{t('quiz.score')}</small></div>
        <div><strong>{stats.correct}/{stats.answered}</strong><small>{t('quiz.correct_answers')}</small></div>
        <div><strong>{stats.bestStreak}</strong><small>{t('quiz.best_streak')}</small></div>
      </div>
      {stats.answered > 0 && (
        <ShareScoreButton
          score={stats.score}
          gameType={GAME_TYPES.QUIZ}
          difficulty={maxDifficulty}
          scoreLabel={t('quiz.share_label')}
          details={t('quiz.share_details', { correct: stats.correct, answered: stats.answered, streak: stats.bestStreak })}
        />
      )}
      <div className="quiz-actions">
        <button className="quiz-btn quiz-btn--primary" onClick={onRestart}>{t('buttons.new_game')}</button>
        <button className="quiz-btn" onClick={onChangeDifficulty}>{t('quiz.change_difficulty')}</button>
        <button className="quiz-btn" onClick={() => navigate('/')}>{t('buttons.return_home')}</button>
      </div>
    </section>
  )
}
