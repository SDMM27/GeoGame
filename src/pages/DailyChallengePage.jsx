// src/pages/DailyChallengePage.jsx
// Daily Challenge: 12 rounds the same for everyone (a country to click, a flag to name, a capital to name), one try each,
// 20 s per round, no lives. Rules → rounds (the survival rounds, SurvivalRounds.jsx) → result, leaderboard and sharing.
// The run itself is hooks/useDailyChallengeState.js, shared with the app.
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import ChallengeBanner from '../components/ChallengeBanner'
import ShareScoreButton from '../components/ShareScoreButton'
import DailyPlayedElsewhere from '../components/DailyPlayedElsewhere'
import useDailyChallengeState from '../hooks/useDailyChallengeState'
import { useDailyPlayedElsewhere } from '../hooks/useDailyPlayedElsewhere'
import { useAccount, useRecordGame } from '../auth'
import { GAME_TYPES } from '../utils/gameTypes'
import { CHALLENGE_ROUND_EMOJI, CHALLENGE_TIMER, challengeShareGrid } from '../utils/dailyChallenge'
import { formatTime } from '../utils/formatTime'
import { getCapitalName, getCountryName } from '../utils/getCountryName'
import { SURVIVAL_ROUND_ICONS } from '../components/SurvivalOptions'
import { DIFFICULTY_COLORS } from './quiz/constants'
import { PlacementRound, TypedRound, roundAnswer } from './survival/SurvivalRounds'
import ChallengeForm from './ChallengeForm'
import ChallengeLeaderboard from './ChallengeLeaderboard'
import 'leaflet/dist/leaflet.css'
import './GamePage.css'
import './QuizPage.css'
import './survival/Survival.css'
import './DailyChallengePage.css'

// One dot per round: right, missed, the one being played, or still to come
function Progress({ results, current }) {
  return (
    <span className="challenge-dots" aria-hidden="true">
      {results.map((result, index) => (
        <span
          key={index}
          className={`challenge-dot${result ? ` challenge-dot--${result}` : ''}${index === current ? ' challenge-dot--current' : ''}`}
        />
      ))}
    </span>
  )
}

// What a round asked and its answer, for the result: "🏛️ Paris (France)"
function answerLabel(round, lang, t) {
  const answer = roundAnswer(round, lang, t)
  if (round.type !== GAME_TYPES.CAPITALS) return answer
  const p = round.country.properties
  return `${answer} (${getCountryName(p.ISO_A2, lang) || p.ADMIN})`
}

function Playing({ challenge }) {
  const { t, i18n } = useTranslation()
  const { round, roundIndex, total, results, score, timeLeftMs, outcome, timedOut, next, giveUp, submitText } = challenge
  const secondsLeft = timeLeftMs == null ? null : Math.ceil(timeLeftMs / 1000)
  const last = roundIndex === total - 1
  if (!round) return null

  return (
    <div className="survival-page">
      <NavBar />
      <div className={`survival-game${round.type === GAME_TYPES.PLACEMENT ? ' survival-game--map' : ''}`}>
        <header className="survival-hud">
          <Progress results={results} current={roundIndex} />
          <div className="survival-hud-round">
            <span className="survival-hud-label">
              {t('daily_challenge.round', { n: roundIndex + 1, total })}
              <span className="survival-hud-difficulty" style={{ color: DIFFICULTY_COLORS[round.difficulty] }}>
                {' · '}{t(`difficulties.${round.difficulty}`)}
              </span>
            </span>
            <strong>{SURVIVAL_ROUND_ICONS[round.type]} {t(`survival.prompt.${round.type}`)}</strong>
          </div>
          <div className="survival-hud-stats">
            <span><strong>{score}</strong> {t('daily_challenge.correct_short')}</span>
            {secondsLeft != null && !outcome ? (
              <span className={`survival-countdown${secondsLeft <= 5 ? ' survival-countdown--low' : ''}`}>⏱ {secondsLeft} s</span>
            ) : (
              <span>⏱ {CHALLENGE_TIMER} s</span>
            )}
          </div>
        </header>

        <main className="survival-round">
          {round.type === GAME_TYPES.PLACEMENT
            ? <PlacementRound survival={challenge} />
            : <TypedRound key={roundIndex} survival={challenge} onSubmit={submitText} />}
        </main>

        <footer className="survival-footer">
          {outcome ? (
            <div className={`survival-outcome survival-outcome--${outcome}`}>
              <span>
                {outcome === 'correct'
                  ? t('survival.correct')
                  : `${timedOut ? `${t('survival.time_up')} ` : ''}${t('survival.answer_was', { answer: roundAnswer(round, i18n.language, t) })}`}
              </span>
              <button className="survival-btn" onClick={next}>{t(last ? 'buttons.see_results' : 'survival.next')}</button>
            </div>
          ) : (
            <button className="survival-btn survival-btn--danger" onClick={giveUp}>{t('daily_challenge.skip')}</button>
          )}
        </footer>
      </div>
    </div>
  )
}

// Difficulty of the day: 7 bars, Monday one, Sunday all of them
function ChallengeLevel({ level }) {
  const { t } = useTranslation()
  return (
    <div className="challenge-level">
      <div className="challenge-level__head">
        <span className="challenge-level__bars" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => <span key={i} className={i < level ? 'is-on' : ''} />)}
        </span>
        <strong>{t('daily_challenge.level', { label: t(`daily_challenge.levels.${level}`), n: level })}</strong>
      </div>
      <p className="quiz-muted">{t('daily_challenge.week_note')}</p>
    </div>
  )
}

export default function DailyChallengePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const challenge = useDailyChallengeState()
  const { dailyKey, phase, rounds, results, score, elapsedTime, total } = challenge
  const elsewhere = useDailyPlayedElsewhere(useAccount(), {
    gameType: GAME_TYPES.DAILY_CHALLENGE,
    dailyKey,
    started: phase === 'playing' || phase === 'done' || challenge.resumed,
  })
  const done = phase === 'done'

  useRecordGame(
    done
      ? {
        gameType: GAME_TYPES.DAILY_CHALLENGE,
        mode: 'daily',
        dailyKey,
        score,
        correct: score,
        answered: total,
        total,
        errors: total - score,
        elapsedTime: Math.round(elapsedTime),
        solved: true,
      }
      : null
  )

  const grid = useMemo(() => (done ? challengeShareGrid(rounds, results) : ''), [done, rounds, results])

  if (elsewhere.checking || elsewhere.game) {
    return (
      <DailyPlayedElsewhere title={t('games.daily_challenge.title')} game={elsewhere.game}>
        <ChallengeLeaderboard dailyKey={dailyKey} />
      </DailyPlayedElsewhere>
    )
  }

  if (phase === 'playing') return <Playing challenge={challenge} />

  return (
    <div className="quiz-page">
      <NavBar />
      <main className="quiz-main">
        <ChallengeBanner
          gameType={GAME_TYPES.DAILY_CHALLENGE}
          dailyKey={dailyKey}
          result={done ? { score, solved: true } : null}
        />
        <header className="quiz-header">
          <h1>{t('games.daily_challenge.title')}</h1>
        </header>

        {phase === 'loading' && <p className="quiz-muted">{t('messages.loading')}</p>}

        {phase === 'ready' && (
          <section className="quiz-card">
            <p className="quiz-daily-rules">{t('daily_challenge.rules', { seconds: CHALLENGE_TIMER })}</p>
            {challenge.level && <ChallengeLevel level={challenge.level} />}
            {challenge.resumed && <p className="challenge-resumed">{t('daily_challenge.resumed_note')}</p>}
            <button className="daily-start-btn" onClick={challenge.start}>
              {t(challenge.resumed ? 'daily_challenge.continue' : 'daily_challenge.start')}
            </button>
          </section>
        )}

        {done && (
          <>
            <section className="quiz-card challenge-result">
              <h2 className="quiz-card-title">{t('daily_challenge.result_title')}</h2>
              <div className="challenge-score">
                <strong>{score}</strong>
                <span>/{total}</span>
              </div>
              <p className="challenge-score-label">{t('daily_challenge.score_label')}</p>
              <p className="challenge-time">{t('daily_challenge.time_label')} : <strong>{formatTime(elapsedTime)}</strong></p>

              <h3 className="challenge-rounds-title">{t('daily_challenge.rounds_title')}</h3>
              <ol className="challenge-rounds">
                {rounds.map((round, index) => (
                  <li key={index} className={`challenge-round challenge-round--${results[index] === 'correct' ? 'correct' : 'failed'}`}>
                    <span className="challenge-round-icon" title={t(`survival.round_type.${round.type}`)}>{CHALLENGE_ROUND_EMOJI[round.type]}</span>
                    <span className="challenge-round-answer">{answerLabel(round, i18n.language, t)}</span>
                    <span className="challenge-round-result">{results[index] === 'correct' ? '✅' : '❌'}</span>
                  </li>
                ))}
              </ol>
              <p className="quiz-muted challenge-come-back">{t('daily_challenge.come_back')}</p>
            </section>

            <ShareScoreButton
              score={score}
              gameType={GAME_TYPES.DAILY_CHALLENGE}
              difficulty="Daily"
              scoreLabel={t('daily_challenge.share_label')}
              scoreText={`${score}/${total}`}
              details={t('daily_challenge.share_time', { time: formatTime(elapsedTime) })}
              grid={grid}
              challenge={{ route: '/challenge', dailyKey, solved: true }}
            />
            <ChallengeForm score={score} elapsedTime={elapsedTime} results={results} dailyKey={dailyKey} />
            <ChallengeLeaderboard dailyKey={dailyKey} />
          </>
        )}

        <div className="quiz-actions">
          <button className="quiz-btn" onClick={() => navigate('/')}>{t('buttons.return_home')}</button>
        </div>
      </main>
    </div>
  )
}
