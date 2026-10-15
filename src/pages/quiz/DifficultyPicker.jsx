import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ANSWER_MODES, QUIZ_DIFFICULTIES, QUIZ_THEMES } from '../../utils/quizQuestions'
import { getCountryName } from '../../utils/getCountryName'
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

// `country` : quiz d'histoire sur un seul pays (depuis l'atlas), sans choix de thème ni de difficulté
export default function DifficultyPicker({ onPick, initialTheme = QUIZ_THEMES.GEO, country = null }) {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState(loadMode)
  const [theme, setTheme] = useState(country ? QUIZ_THEMES.HISTORY : initialTheme)

  const changeMode = (next) => {
    setMode(next)
    try { localStorage.setItem(MODE_STORAGE_KEY, next) } catch { /* stockage indisponible */ }
  }

  return (
    <section className="quiz-card">
      {country ? (
        <h2 className="quiz-card-title quiz-country-title">
          <img src={`/flags/${country.toLowerCase()}.png`} alt="" />
          {t('quiz.history.country_title', { country: getCountryName(country, i18n.language) ?? country })}
        </h2>
      ) : (
        <>
          <h2 className="quiz-card-title">{t('quiz.pick_theme')}</h2>
          <div className="quiz-mode-tabs">
            {Object.values(QUIZ_THEMES).map((th) => (
              <button
                key={th}
                className={`quiz-mode-tab${theme === th ? ' quiz-mode-tab--active' : ''}`}
                onClick={() => setTheme(th)}
              >
                <strong>{t(`quiz.themes.${th}`)}</strong>
                <small>{t(`quiz.themes.${th}_hint`)}</small>
              </button>
            ))}
          </div>
        </>
      )}
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
      {country ? (
        <>
          <p className="quiz-muted">{t('quiz.history.country_hint')}</p>
          <div className="quiz-actions">
            <button className="quiz-btn quiz-btn--primary" onClick={() => onPick('Impossible', mode, { theme, country })}>
              {t('buttons.play')}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="quiz-card-title">{t('quiz.pick_difficulty')}</h2>
          <p className="quiz-muted">{t('quiz.pick_difficulty_hint')}</p>
          <div className="quiz-difficulty-grid">
            {QUIZ_DIFFICULTIES.map((d) => (
              <button key={d} className="quiz-difficulty-btn" onClick={() => onPick(d, mode, { theme })}>
                <span style={{ color: DIFFICULTY_COLORS[d] }}>{t(`difficulties.${d}`)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
