// Survival leaderboard: one per number of lives, timer and preset ramp, for a set of games or all of them.
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSurvivalScores } from '../../utils/saveScore'
import { formatTime } from '../../utils/formatTime'
import { useAccount } from '../../auth'
import PlayerName, { mineClass } from '../../components/PlayerName'
import { SURVIVAL_RAMP_ICONS, SURVIVAL_ROUND_ICONS, timerLabel } from '../../components/SurvivalOptions'
import {
  DEFAULT_SURVIVAL_LIVES,
  DEFAULT_SURVIVAL_RAMP,
  DEFAULT_SURVIVAL_TIMER,
  SURVIVAL_RAMP_NAMES,
  SURVIVAL_LIVES,
  SURVIVAL_TIMERS,
  SURVIVAL_ROUND_TYPES,
  parseSurvivalModes,
  survivalModesKey,
} from '../../utils/survivalConfig'
import '../scoreboard.css'

const MEDAL = ['🥇', '🥈', '🥉']
const ALL = 'all'
const ALL_SIX = survivalModesKey(SURVIVAL_ROUND_TYPES)

const modesIcons = (key) => parseSurvivalModes(key).map((type) => SURVIVAL_ROUND_ICONS[type]).join(' ')

export default function SurvivalScoreboard({ initialLives = null, initialTimer = null, initialRamp = null, initialModes = null }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const startLives = SURVIVAL_LIVES.includes(initialLives) ? initialLives : DEFAULT_SURVIVAL_LIVES
  const startModes = initialModes && survivalModesKey(parseSurvivalModes(initialModes)) ? survivalModesKey(parseSurvivalModes(initialModes)) : ALL
  const [lives, setLives] = useState(startLives)
  const [timer, setTimer] = useState(SURVIVAL_TIMERS.includes(initialTimer) ? initialTimer : DEFAULT_SURVIVAL_TIMER)
  const [ramp, setRamp] = useState(SURVIVAL_RAMP_NAMES.includes(initialRamp) ? initialRamp : DEFAULT_SURVIVAL_RAMP)
  const [modes, setModes] = useState(startModes)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // The games filter: all of them mixed, each one alone, and the set of the game just played
  const modeOptions = useMemo(() => {
    const options = [
      { value: ALL, label: t('survival.all_combinations') },
      { value: ALL_SIX, label: `${modesIcons(ALL_SIX)} ${t('survival.all_six')}` },
      ...SURVIVAL_ROUND_TYPES.map((type) => ({ value: type, label: `${SURVIVAL_ROUND_ICONS[type]} ${t(`survival.round_type.${type}`)}` })),
    ]
    if (!options.some((option) => option.value === startModes)) options.push({ value: startModes, label: modesIcons(startModes) })
    return options
  }, [t, startModes])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchSurvivalScores({ lives, timer, ramp, modes: modes === ALL ? null : modes })
      .then((result) => { if (!cancelled) setScores(result) })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setScores([])
          setFailed(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lives, timer, ramp, modes])

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">{t('survival.leaderboard_title')}</h1>

      <div className="scoreboard-filters">
        <select className="scoreboard-select" value={lives} onChange={(event) => setLives(Number(event.target.value))}>
          {SURVIVAL_LIVES.map((count) => (
            <option key={count} value={count}>{t('survival.lives_count', { count })}</option>
          ))}
        </select>
        <select className="scoreboard-select" value={timer} onChange={(event) => setTimer(Number(event.target.value))}>
          {SURVIVAL_TIMERS.map((seconds) => (
            <option key={seconds} value={seconds}>⏱ {timerLabel(seconds, t)}</option>
          ))}
        </select>
        <select className="scoreboard-select" value={ramp} onChange={(event) => setRamp(event.target.value)}>
          {SURVIVAL_RAMP_NAMES.map((name) => (
            <option key={name} value={name}>{SURVIVAL_RAMP_ICONS[name]} {t(`survival.ramp.${name}`)}</option>
          ))}
        </select>
        <select className="scoreboard-select" value={modes} onChange={(event) => setModes(event.target.value)}>
          {modeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="scoreboard-loading">{t('messages.loading')}</p>
      ) : failed ? (
        <p className="scoreboard-empty">{t('messages.page_load_error')}</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">{t('survival.no_scores')}</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header">
            <span>#</span>
            <span>{t('survival.col_player')}</span>
            <span>{t('survival.col_rounds')}</span>
            <span>{t('survival.time')}</span>
            <span>{t('survival.col_games')}</span>
          </div>
          {scores.map((score, index) => (
            <div key={score.id} className={`scoreboard-row ${index < 3 ? 'scoreboard-row--top' : ''}${mineClass(score, account)}`}>
              <span className="scoreboard-rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
              <span className="scoreboard-name"><PlayerName entry={score} account={account} reportIn="survival_scores" /></span>
              <span className="scoreboard-score">{score.score}</span>
              <span className="scoreboard-time">{score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}</span>
              <span className="scoreboard-difficulty" title={score.modes}>{modesIcons(score.modes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
