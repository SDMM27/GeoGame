// Home page: the day's and week's missions with their progress, and the player's level. Visitors get an invitation.
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { useMissions } from '../../hooks/useMissions'
import {
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  DAILY_MISSIONS,
  GAMES_PER_DAY,
  GAME_XP,
  WEEKLY_BONUS_XP,
  WEEKLY_MISSIONS,
  WEEKLY_TIERS,
} from '../../utils/missions'
import { DAILY_BONUS_FRAGMENTS, DAILY_MISSION_FRAGMENTS, WEEKLY_BONUS_FRAGMENTS } from '../../utils/flagCollection'
import { LevelChip, XpBar } from '../../components/profile/LevelBadge'
import './MissionsCard.css'

const DAILY_REWARD = { xp: DAILY_MISSION_XP, fragments: DAILY_MISSION_FRAGMENTS }
const dailyReward = () => DAILY_REWARD
const weeklyReward = (mission) => WEEKLY_TIERS[mission.tier]

// "+60 XP" and, when there are some, "+2 fragments".
function Reward({ xp, fragments }) {
  const { t } = useTranslation()
  return (
    <span className="mission-reward">
      {t('missions.reward', { xp })}
      {fragments > 0 && <small className="mission-fragments">{t('missions.fragments', { count: fragments })}</small>}
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
      <span className="mission-emoji" aria-hidden="true">{finished ? '✓' : mission.emoji}</span>
      <div className="mission-text">
        <span className="mission-title">{t(`missions.${mission.id}`, { count: mission.target })}</span>
        {mission.tier && <small className={`mission-tier mission-tier--${mission.tier}`}>{t(`missions.tier_${mission.tier}`)}</small>}
        <div className="mission-progress">
          <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={shown}>
            <div className="xp-bar-fill" style={{ width: `${Math.round((shown / mission.target) * 100)}%` }} />
          </div>
          <small>{shown} / {mission.target}</small>
        </div>
      </div>
      <Reward xp={xp} fragments={fragments} />
    </li>
  )
}

function MissionList({ title, entries, reward, bonusCount, bonusXp, bonusFragments, bonusDone, hint }) {
  const { t } = useTranslation()
  const allDone = bonusDone || (entries.length > 0 && entries.every((entry) => entry.done || entry.paid))
  return (
    <div className="missions-group">
      <div className="missions-group-head">
        <h3>{title}</h3>
        <small>{hint}</small>
      </div>
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

export default function MissionsCard() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const missions = useMissions(account?.uid ?? null)

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

  return (
    <article className="missions-card">
      <div className="missions-head">
        <h3>{t('missions.title')}</h3>
        {missions.xp && (
          <div className="missions-level">
            <LevelChip level={missions.xp.level} />
            <XpBar xp={missions.xp} />
            <small>{t('level.progress', { into: missions.xp.into, needed: missions.xp.needed })}</small>
          </div>
        )}
      </div>
      {missions.loading && !missions.daily.length ? (
        <p className="missions-loading">…</p>
      ) : (
        <div className="missions-groups">
          <MissionList
            title={t('missions.daily')}
            entries={missions.daily}
            reward={dailyReward}
            bonusCount={DAILY_MISSIONS}
            bonusXp={DAILY_BONUS_XP}
            bonusFragments={DAILY_BONUS_FRAGMENTS}
            bonusDone={missions.dailyBonus}
            hint={t('missions.resets_daily')}
          />
          <MissionList
            title={t('missions.weekly')}
            entries={missions.weekly}
            reward={weeklyReward}
            bonusCount={WEEKLY_MISSIONS}
            bonusXp={WEEKLY_BONUS_XP}
            bonusFragments={WEEKLY_BONUS_FRAGMENTS}
            bonusDone={missions.weeklyBonus}
            hint={t('missions.resets_weekly')}
          />
        </div>
      )}
      <p className="missions-hint">{t('missions.per_game', { xp: GAME_XP, count: GAMES_PER_DAY })}</p>
    </article>
  )
}
