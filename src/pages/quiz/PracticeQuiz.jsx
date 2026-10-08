import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NavBar from '../../components/NavBar'
import useQuizState from '../../hooks/useQuizState'
import { ANSWER_MODES, getQuestionHints, localizeQuestion } from '../../utils/quizQuestions'
import DifficultyPicker from './DifficultyPicker'
import Summary from './Summary'
import { DIFFICULTY_COLORS } from './constants'

// In a multiplayer room (`room`): its difficulty and answer mode, the same questions for everyone,
// a fixed number of them. `room`: { seed, difficulty, answerMode, total, onAnswered(count), onFinished(result) }
export default function PracticeQuiz({ room = null }) {
  const { t, i18n } = useTranslation()
  const {
    maxDifficulty, answerMode, question, selectedId, freeResult, isAnswered, isCorrect, stats, isFinished,
    hintsUsed, maxHints, canUseHint, hiddenChoiceIds, points,
    start, answer, submitFree, takeHint, next, quit, backToDifficulty,
  } = useQuizState({ seed: room?.seed ?? null })
  const isFree = answerMode === ANSWER_MODES.FREE
  const isLastQuestion = !!room && stats.answered >= room.total
  const goNext = isLastQuestion ? quit : next
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    if (room) start(room.difficulty, room.answerMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onAnswered = room?.onAnswered
  useEffect(() => {
    if (onAnswered && stats.answered > 0) onAnswered(stats.answered)
  }, [onAnswered, stats.answered])

  const onFinished = room?.onFinished
  useEffect(() => {
    if (isFinished && onFinished) {
      onFinished({
        weightedScore: stats.score,
        countriesSolved: stats.correct,
        attempts: stats.answered - stats.correct,
        elapsedTime: Date.now() - startedAt,
      })
    }
  }, [isFinished, onFinished, stats, startedAt])
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
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [localized, isAnswered, isFinished, isFree, answer, goNext])

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
    <div className={room ? 'quiz-page quiz-page--room' : 'quiz-page'}>
      {!room && <NavBar />}
      <main className="quiz-main">
        <header className="quiz-header">
          <h1>
            {t('games.quiz.title')}
            {room && (
              <small className="quiz-room-count">
                {t('mp_room.question', { n: Math.min(stats.answered + (isAnswered ? 0 : 1), room.total), total: room.total })}
              </small>
            )}
          </h1>
          {maxDifficulty && !isFinished && (
            <div className="quiz-hud">
              <div><strong>{stats.score}</strong><small>{t('quiz.score')}</small></div>
              <div><strong>{stats.correct}/{stats.answered}</strong><small>{t('quiz.correct_answers')}</small></div>
              <div><strong>{stats.streak}</strong><small>{t('quiz.streak')}</small></div>
            </div>
          )}
        </header>

        {!maxDifficulty && !room && <DifficultyPicker onPick={start} />}

        {maxDifficulty && isFinished && !room && (
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
              {!room && <button className="quiz-btn" onClick={quit}>{t('quiz.quit')}</button>}
              {!isAnswered && maxHints > 0 && (
                <button className="quiz-btn" onClick={takeHint} disabled={!canUseHint} title={t('quiz.hint_cost')}>
                  {t('quiz.hint_button', { used: hintsUsed, max: maxHints })}
                </button>
              )}
              {(isAnswered || !isFree) && (
                <button className="quiz-btn quiz-btn--primary" onClick={goNext} disabled={!isAnswered}>
                  {isLastQuestion ? t('mp_room.see_results') : t('quiz.next')}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
