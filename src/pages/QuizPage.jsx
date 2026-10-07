// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import ChallengeBanner from '../components/ChallengeBanner'
import ShareScoreButton from '../components/ShareScoreButton'
import useQuizState from '../hooks/useQuizState'
import useDailyQuizState from '../hooks/useDailyQuizState'
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
import { resolveMode } from '../utils/challenge'
import { formatTime } from '../utils/formatTime'
import { ANSWER_MODES, MAX_HINTS, QUIZ_DIFFICULTIES, getQuestionHints, localizeQuestion } from '../utils/quizQuestions'
import './QuizPage.css'

const DIFFICULTY_COLORS = {
  Facile: '#4ade80',
  Moyen: '#00d4ff',
  Difficile: '#fbbf24',
  Impossible: '#f97316',
}

const MODE_STORAGE_KEY = 'geogame_quiz_mode'

function loadMode() {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY)
    return Object.values(ANSWER_MODES).includes(saved) ? saved : ANSWER_MODES.CHOICES
  } catch {
    return ANSWER_MODES.CHOICES
  }
}

function DifficultyPicker({ onPick }) {
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

function Summary({ stats, maxDifficulty, onRestart, onChangeDifficulty }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
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

function PracticeQuiz() {
  const { t, i18n } = useTranslation()
  const {
    maxDifficulty, answerMode, question, selectedId, freeResult, isAnswered, isCorrect, stats, isFinished,
    hintsUsed, maxHints, canUseHint, hiddenChoiceIds, points,
    start, answer, submitFree, takeHint, next, quit, backToDifficulty,
  } = useQuizState()
  const isFree = answerMode === ANSWER_MODES.FREE
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const localized = useMemo(
    () => (question ? localizeQuestion(question, i18n.language, t) : null),
    [question, i18n.language, t]
  )
  const hints = useMemo(
    () => (question && isFree ? getQuestionHints(question, i18n.language, t) : []),
    [question, isFree, i18n.language, t]
  )

  useEffect(() => {
    setInputValue('')
    if (!isFree) return
    // Décalé d'un tick : au lancement, le clic sur la difficulté reprendrait sinon le focus
    const id = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [question, isFree])

  // Raccourcis clavier : 1-4 pour répondre (choix multiples), Entrée pour passer à la suivante
  useEffect(() => {
    if (!localized || isFinished) return
    const onKey = (e) => {
      if (!isAnswered) {
        if (isFree) return
        const idx = Number(e.key) - 1
        if (idx >= 0 && idx < localized.choices.length) answer(localized.choices[idx].id)
      } else if (e.key === 'Enter') {
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [localized, isAnswered, isFinished, isFree, answer, next])

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Évite que la même touche Entrée déclenche aussi « question suivante »
      e.preventDefault()
      e.stopPropagation()
      submitFree(inputValue)
    }
  }

  const choiceClass = (id) => {
    if (hiddenChoiceIds.includes(id)) return 'quiz-choice quiz-choice--removed'
    if (!isAnswered) return 'quiz-choice'
    if (id === question.correctId) return 'quiz-choice quiz-choice--correct'
    if (id === selectedId) return 'quiz-choice quiz-choice--wrong'
    return 'quiz-choice quiz-choice--dim'
  }

  return (
    <div className="quiz-page">
      <NavBar />
      <main className="quiz-main">
        <header className="quiz-header">
          <h1>{t('games.quiz.title')}</h1>
          {maxDifficulty && !isFinished && (
            <div className="quiz-hud">
              <div><strong>{stats.score}</strong><small>{t('quiz.score')}</small></div>
              <div><strong>{stats.correct}/{stats.answered}</strong><small>{t('quiz.correct_answers')}</small></div>
              <div><strong>{stats.streak}</strong><small>{t('quiz.streak')}</small></div>
            </div>
          )}
        </header>

        {!maxDifficulty && <DifficultyPicker onPick={start} />}

        {maxDifficulty && isFinished && (
          <Summary
            stats={stats}
            maxDifficulty={maxDifficulty}
            onRestart={() => start(maxDifficulty, answerMode)}
            onChangeDifficulty={backToDifficulty}
          />
        )}

        {maxDifficulty && !isFinished && localized && (
          <section className="quiz-card">
            <div className="quiz-badge-row">
              <span className="quiz-badge" style={{ color: DIFFICULTY_COLORS[question.difficulty] }}>
                {t(`difficulties.${question.difficulty}`)}
              </span>
              {!isAnswered && (
                <span className="quiz-points">+{points} {points === 1 ? t('units.pt') : t('units.pts')}</span>
              )}
            </div>
            <h2 className="quiz-question">{localized.prompt}</h2>

            {hintsUsed > 0 && hints.length > 0 && (
              <ol className="quiz-hints">
                {hints.slice(0, hintsUsed).map((hint, i) => (
                  <li key={i}><span className="quiz-hints-label">{t('quiz.hint_n', { n: i + 1 })}</span>{hint}</li>
                ))}
              </ol>
            )}

            {isFree ? (
              <div className="quiz-free">
                <input
                  ref={inputRef}
                  className={`quiz-input${isAnswered ? (isCorrect ? ' quiz-input--correct' : ' quiz-input--wrong') : ''}`}
                  type="text"
                  placeholder={t('quiz.input_placeholder')}
                  value={isAnswered ? freeResult.input : inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  disabled={isAnswered}
                  autoComplete="off"
                />
                {!isAnswered && (
                  <div className="quiz-free-actions">
                    <button className="quiz-btn" onClick={() => submitFree('')}>{t('quiz.dont_know')}</button>
                    <button className="quiz-btn quiz-btn--primary" onClick={() => submitFree(inputValue)} disabled={!inputValue.trim()}>
                      {t('buttons.validate')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="quiz-choices">
                {localized.choices.map((c, i) => (
                  <button key={c.id} className={choiceClass(c.id)} onClick={() => answer(c.id)} disabled={isAnswered || hiddenChoiceIds.includes(c.id)}>
                    <span className="quiz-choice-key">{i + 1}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {isAnswered && (
              <div className={`quiz-feedback${isCorrect ? ' quiz-feedback--correct' : ' quiz-feedback--wrong'}`}>
                <strong>{isCorrect ? t('quiz.correct') : t('quiz.wrong')}</strong>
                {isFree && freeResult.match?.match === 'typo' && (
                  <p>{t('quiz.typo_accepted', { name: freeResult.match.name })}</p>
                )}
                {isFree && (
                  <p>{t(localized.multipleAnswers ? 'quiz.accepted_answers' : 'quiz.answer_was', { answer: localized.answer })}</p>
                )}
                {localized.fact && <p>{localized.fact}</p>}
              </div>
            )}

            <div className="quiz-actions">
              <button className="quiz-btn" onClick={quit}>{t('quiz.quit')}</button>
              {!isAnswered && maxHints > 0 && (
                <button className="quiz-btn" onClick={takeHint} disabled={!canUseHint} title={t('quiz.hint_cost')}>
                  {t('quiz.hint_button', { used: hintsUsed, max: maxHints })}
                </button>
              )}
              {(isAnswered || !isFree) && (
                <button className="quiz-btn quiz-btn--primary" onClick={next} disabled={!isAnswered}>
                  {t('quiz.next')}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function DailyQuiz() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const {
    dailyKey, question, guesses, hintsUsed, elapsedTime, hasStarted, isComplete, isSolved, attemptsLeft, canUseHint,
    start, submit, takeHint, giveUp,
  } = useDailyQuizState()
  const [inputValue, setInputValue] = useState('')
  const [notice, setNotice] = useState(null)
  const inputRef = useRef(null)

  const localized = useMemo(
    () => (question ? localizeQuestion(question, i18n.language, t) : null),
    [question, i18n.language, t]
  )
  const hints = useMemo(
    () => (question ? getQuestionHints(question, i18n.language, t) : []),
    [question, i18n.language, t]
  )

  useEffect(() => {
    if (hasStarted && !isComplete) inputRef.current?.focus()
  }, [hasStarted, isComplete])

  const onSubmit = () => {
    const result = submit(inputValue)
    if (result === 'duplicate') {
      setNotice(t('quiz.already_tried'))
      return
    }
    if (result) {
      setInputValue('')
      setNotice(null)
      inputRef.current?.focus()
    }
  }

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) onSubmit()
  }

  const attempts = guesses.length
  const lastGuess = guesses[guesses.length - 1]
  const statText = t('quiz.daily_stat', {
    attempts: t('quiz.attempts_count', { count: attempts }),
    hints: t('quiz.hints_count', { count: hintsUsed }),
    time: elapsedTime != null ? formatTime(elapsedTime) : '—',
  })

  return (
    <div className="quiz-page">
      <NavBar />
      <main className="quiz-main">
        <ChallengeBanner
          gameType={GAME_TYPES.QUIZ}
          dailyKey={dailyKey}
          result={isComplete ? { score: attempts + hintsUsed, solved: isSolved } : null}
        />
        <header className="quiz-header">
          <h1>{t('quiz.daily_title')}</h1>
          {hasStarted && (
            <div className="quiz-hud">
              <div>
                <strong>{isComplete ? attempts : attemptsLeft}</strong>
                <small>{t(isComplete ? 'quiz.attempts_used' : 'quiz.attempts_left')}</small>
              </div>
              <div><strong>{hintsUsed}/{MAX_HINTS}</strong><small>{t('quiz.hints_label')}</small></div>
            </div>
          )}
        </header>

        {localized && (
          <section className="quiz-card">
            <span className="quiz-badge" style={{ color: DIFFICULTY_COLORS[question.difficulty] }}>
              {t(`difficulties.${question.difficulty}`)}
            </span>

            {!hasStarted ? (
              <>
                <p className="quiz-daily-rules">{t('quiz.daily_rules', { attempts: attemptsLeft, hints: MAX_HINTS })}</p>
                <button className="daily-start-btn" onClick={start}>{t('buttons.start_timer')}</button>
              </>
            ) : (
              <>
                <h2 className="quiz-question">{localized.prompt}</h2>

                {hintsUsed > 0 && (
                  <ol className="quiz-hints">
                    {hints.slice(0, hintsUsed).map((hint, i) => (
                      <li key={i}><span className="quiz-hints-label">{t('quiz.hint_n', { n: i + 1 })}</span>{hint}</li>
                    ))}
                  </ol>
                )}

                {guesses.some((g) => !g.correct) && (
                  <ul className="quiz-guesses">
                    {guesses.filter((g) => !g.correct).map((g) => <li key={g.input}>✗ {g.input}</li>)}
                  </ul>
                )}

                {!isComplete ? (
                  <div className="quiz-free">
                    <input
                      ref={inputRef}
                      className="quiz-input"
                      type="text"
                      placeholder={t('quiz.input_placeholder')}
                      value={inputValue}
                      onChange={(e) => { setInputValue(e.target.value); setNotice(null) }}
                      onKeyDown={onInputKeyDown}
                      autoComplete="off"
                    />
                    {notice && <p className="quiz-notice">{notice}</p>}
                    <div className="quiz-free-actions">
                      <button className="quiz-btn" onClick={takeHint} disabled={!canUseHint}>
                        {t('quiz.hint_button', { used: hintsUsed, max: MAX_HINTS })}
                      </button>
                      <button className="quiz-btn" onClick={giveUp}>{t('quiz.give_up')}</button>
                      <button className="quiz-btn quiz-btn--primary" onClick={onSubmit} disabled={!inputValue.trim()}>
                        {t('buttons.validate')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`quiz-feedback${isSolved ? ' quiz-feedback--correct' : ' quiz-feedback--wrong'}`}>
                    <strong>
                      {isSolved
                        ? t('quiz.daily_won', { attempts: t('quiz.attempts_count', { count: attempts }) })
                        : t('quiz.daily_lost')}
                    </strong>
                    {isSolved && lastGuess?.typo && <p>{t('quiz.typo_accepted', { name: lastGuess.typo })}</p>}
                    <p>{t(localized.multipleAnswers ? 'quiz.accepted_answers' : 'quiz.answer_was', { answer: localized.answer })}</p>
                    {localized.fact && <p>{localized.fact}</p>}
                    <p>{t('quiz.daily_come_back')}</p>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {isComplete && (
          <>
            <ShareScoreButton
              score={attempts + hintsUsed}
              gameType={GAME_TYPES.QUIZ}
              difficulty="Daily"
              scoreLabel={t('share.score_attempts')}
              details={isSolved ? statText : t('quiz.daily_lost')}
              challenge={{ route: '/quiz', dailyKey, solved: isSolved }}
            />
            {isSolved && (
              <DailyForm
                attempts={attempts}
                hints={hintsUsed}
                elapsedTime={elapsedTime}
                guesses={guesses.map((g) => g.input)}
                gameType={GAME_TYPES.QUIZ}
                dailyKey={dailyKey}
                statText={statText}
              />
            )}
            <DailyLeaderboard gameType={GAME_TYPES.QUIZ} dailyKey={dailyKey} guessesTitle={t('quiz.guesses_title')} />
          </>
        )}

        <div className="quiz-actions">
          <button className="quiz-btn" onClick={() => navigate('/')}>{t('buttons.return_home')}</button>
          <button className="quiz-btn" onClick={() => navigate('/quiz', { state: { mode: 'infinite' } })}>
            {t('quiz.play_infinite')}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function QuizPage() {
  const location = useLocation()
  // Comme les autres jeux du jour : sans mode explicite, on arrive sur la question du jour
  return resolveMode(location, 'daily') === 'infinite' ? <PracticeQuiz /> : <DailyQuiz />
}
