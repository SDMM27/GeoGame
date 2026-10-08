import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../../components/NavBar'
import ChallengeBanner from '../../components/ChallengeBanner'
import ShareScoreButton from '../../components/ShareScoreButton'
import useDailyQuizState from '../../hooks/useDailyQuizState'
import DailyForm from '../DailyForm'
import DailyLeaderboard from '../DailyLeaderboard'
import { GAME_TYPES } from '../../utils/gameTypes'
import { useRecordGame } from '../../auth'
import { formatTime } from '../../utils/formatTime'
import { MAX_HINTS, getQuestionHints, localizeQuestion } from '../../utils/quizQuestions'
import { DIFFICULTY_COLORS } from './constants'

export default function DailyQuiz() {
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
  useRecordGame(
    isComplete
      ? { gameType: GAME_TYPES.QUIZ, mode: 'daily', dailyKey, solved: isSolved, attempts, hints: hintsUsed, elapsedTime }
      : null
  )
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
