import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ANSWER_MODES, QUIZ_DIFFICULTIES } from '../../utils/quizQuestions'
import { DIFFICULTY_COLORS } from './constants'

const MODE_STORAGE_KEY = 'geogame_quiz_mode'

function loadMode() {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY)
    return Object.values(ANSWER_MODES).includes(saved) ? saved : ANSWER_MODES.CHOICES
  } catch {
    return ANSWER_MODES.CHOICES
  }
}

export default function DifficultyPicker({ onPick }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState(loadMode)

  const changeMode = (next) => {
    setMode(next)
    try { localStorage.setItem(MODE_STORAGE_KEY, next) } catch { /* stockage indisponible */ }
  }

  return (
    <section className="quiz-card">
      <h2 className="quiz-card-title">{t('quiz.pick_mode')}</h2>
      <div className="quiz-mode-tabs">
        {Object.values(ANSWER_MODES).map((m) => (
          <button
            key={m}
            className={`quiz-mode-tab${mode === m ? ' quiz-mode-tab--active' : ''}`}
            onClick={() => changeMode(m)}
          >
            <strong>{t(`quiz.modes.${m}`)}</strong>
            <small>{t(`quiz.modes.${m}_hint`)}</small>
          </button>
        ))}
      </div>
      <h2 className="quiz-card-title">{t('quiz.pick_difficulty')}</h2>
      <p className="quiz-muted">{t('quiz.pick_difficulty_hint')}</p>
      <div className="quiz-difficulty-grid">
        {QUIZ_DIFFICULTIES.map((d) => (
          <button key={d} className="quiz-difficulty-btn" onClick={() => onPick(d, mode)}>
            <span style={{ color: DIFFICULTY_COLORS[d] }}>{t(`difficulties.${d}`)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
