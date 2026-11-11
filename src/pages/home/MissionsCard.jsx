// Home page: the player's level, the dailies played and the streak on one line, and the day's and week's missions
// (one tab each) with their progress. Visitors get an invitation.
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import {
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  DAILY_MISSIONS,
  WEEKLY_BONUS_XP,
  WEEKLY_MISSIONS,
  WEEKLY_TIERS,
  missionResetsIn,
} from '../../utils/missions'
import { DAILY_BONUS_FRAGMENTS, DAILY_MISSION_FRAGMENTS, WEEKLY_BONUS_FRAGMENTS } from '../../utils/flagCollection'
import { serverNow } from '../../utils/serverTime'
import { LevelChip } from '../../components/profile/LevelBadge'
import './MissionsCard.css'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const DAILY_REWARD = { xp: DAILY_MISSION_XP, fragments: DAILY_MISSION_FRAGMENTS }
const dailyReward = () => DAILY_REWARD
const weeklyReward = (mission) => WEEKLY_TIERS[mission.tier]

// "+60 XP" and, when there are some, "+150 XP · 1 ◆".
function Reward({ xp, fragments }) {
  const { t } = useTranslation()
  return (
    <span className="mission-reward">
      {t('missions.reward', { xp })}
      {fragments > 0 && ` · ${fragments} ◆`}
    </span>
  )
}

function MissionRow({ entry, reward }) {
  const { t } = useTranslation()
  const { mission, progress, done, paid } = entry
  const finished = done || paid
  const shown = Math.min(progress, mission.target)
  const { xp, fragments } = reward(mission)
  return (
    <li className={`mission-row${finished ? ' mission-row--done' : ''}`}>
      <div className="mission-line">
        <span className="mission-emoji" aria-hidden="true">{finished ? '✓' : mission.emoji}</span>
        <span className="mission-title">{t(`missions.${mission.id}`, { count: mission.target })}</span>
        <Reward xp={xp} fragments={fragments} />
      </div>
      <div className="mission-progress">
        <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={shown}>
          <div className="xp-bar-fill" style={{ width: `${Math.round((shown / mission.target) * 100)}%` }} />
        </div>
        <small>{shown} / {mission.target}</small>
      </div>
    </li>
  )
}

function MissionList({ entries, reward, bonusCount, bonusXp, bonusFragments, bonusDone }) {
  const { t } = useTranslation()
  const allDone = bonusDone || (entries.length > 0 && entries.every((entry) => entry.done || entry.paid))
  return (
    <div className="missions-group">
      <ul className="missions-list">
        {entries.map((entry) => (
          <MissionRow key={entry.mission.id} entry={entry} reward={reward} />
        ))}
      </ul>
      <p className={`missions-bonus${allDone ? ' missions-bonus--done' : ''}`}>
        <span>{allDone ? '✓ ' : ''}{t('missions.bonus', { count: bonusCount })}</span>
        <Reward xp={bonusXp} fragments={bonusFragments} />
      </p>
    </div>
  )
}

const doneCount = (entries) => entries.filter((entry) => entry.done).length

export default function MissionsCard({ missions }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const [selected, setSelected] = useState('daily')

  if (!account) {
    return (
      <Link to="/account" className="missions-card missions-card--visitor">
        <span className="home-icon" aria-hidden="true">🏆</span>
        <span className="missions-visitor-text">
          <strong>{t('missions.title')}</strong>
          <small>{t('missions.sign_in')}</small>
        </span>
      </Link>
    )
  }

  const { daily, weekly, dailies, streak } = missions
  const resets = missionResetsIn(serverNow())
  const dailyLeft = t('missions.resets_hours', { count: Math.max(1, Math.ceil(resets.daily / HOUR_MS)) })
  const weeklyLeft = resets.weekly >= DAY_MS
    ? t('missions.resets_days', { count: Math.max(1, Math.round(resets.weekly / DAY_MS)) })
    : t('missions.resets_hours', { count: Math.max(1, Math.ceil(resets.weekly / HOUR_MS)) })
  const tabs = [
    { id: 'daily', label: t('missions.tab_today'), entries: daily, left: dailyLeft },
    { id: 'weekly', label: t('missions.tab_week'), entries: weekly, left: weeklyLeft },
  ]

  return (
    <article className="missions-card">
      <div className="missions-head">
        <h3>{t('missions.title')}</h3>
        {missions.xp && <LevelChip level={missions.xp.level} />}
      </div>
      {(dailies || streak) && (
        <p className="missions-summary">
          {dailies && <span>{t('missions.dailies_short', { played: dailies.played, total: dailies.total })}</span>}
          {streak && <span className="missions-streak">🔥 {t('missions.streak_short', { count: streak.count })}</span>}
        </p>
      )}
      <div className="missions-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`missions-tab-${tab.id}`}
            aria-selected={selected === tab.id}
            aria-controls="missions-panel"
            className={`missions-tab${selected === tab.id ? ' missions-tab--active' : ''}`}
            onClick={() => setSelected(tab.id)}
          >
            <strong>{tab.label} {doneCount(tab.entries)}/{tab.entries.length}</strong>
            <small>{tab.left}</small>
          </button>
        ))}
      </div>
      <div id="missions-panel" role="tabpanel" aria-labelledby={`missions-tab-${selected}`}>
        {missions.loading && !daily.length ? (
          <p className="missions-loading">…</p>
        ) : selected === 'daily' ? (
          <MissionList
            entries={daily}
            reward={dailyReward}
            bonusCount={DAILY_MISSIONS}
            bonusXp={DAILY_BONUS_XP}
            bonusFragments={DAILY_BONUS_FRAGMENTS}
            bonusDone={missions.dailyBonus}
          />
        ) : (
          <MissionList
            entries={weekly}
            reward={weeklyReward}
            bonusCount={WEEKLY_MISSIONS}
            bonusXp={WEEKLY_BONUS_XP}
            bonusFragments={WEEKLY_BONUS_FRAGMENTS}
            bonusDone={missions.weeklyBonus}
          />
        )}
      </div>
    </article>
  )
}
