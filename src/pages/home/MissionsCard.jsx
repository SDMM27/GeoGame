// Home page: the day's and week's missions with their progress, and the player's level. Visitors get an invitation.
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { useMissions } from '../../hooks/useMissions'
import { DAILY_BONUS_XP, DAILY_MISSION_XP, GAMES_PER_DAY, GAME_XP, WEEKLY_BONUS_XP, WEEKLY_MISSION_XP } from '../../utils/missions'
import { DAILY_BONUS_FRAGMENTS, DAILY_MISSION_FRAGMENTS, WEEKLY_BONUS_FRAGMENTS, WEEKLY_MISSION_FRAGMENTS } from '../../utils/flagCollection'
import { LevelChip, XpBar } from '../../components/profile/LevelBadge'
import './MissionsCard.css'

function MissionRow({ entry, xp, fragments }) {
  const { t } = useTranslation()
  const { mission, progress, done, paid } = entry
  const finished = done || paid
  const shown = Math.min(progress, mission.target)
  return (
    <li className={`mission-row${finished ? ' mission-row--done' : ''}`}>
      <span className="mission-emoji" aria-hidden="true">{finished ? '✓' : mission.emoji}</span>
      <div className="mission-text">
        <span className="mission-title">{t(`missions.${mission.id}`, { count: mission.target })}</span>
        <div className="mission-progress">
          <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={shown}>
            <div className="xp-bar-fill" style={{ width: `${Math.round((shown / mission.target) * 100)}%` }} />
          </div>
          <small>{shown} / {mission.target}</small>
        </div>
      </div>
      <span className="mission-reward">{t('missions.reward', { xp })}<small className="mission-fragments">{t('missions.fragments', { count: fragments })}</small></span>
    </li>
  )
}

function MissionList({ title, entries, xp, fragments, bonusXp, bonusFragments, bonusDone, hint }) {
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
          <MissionRow key={entry.mission.id} entry={entry} xp={xp} fragments={fragments} />
        ))}
      </ul>
      <p className={`missions-bonus${allDone ? ' missions-bonus--done' : ''}`}>
        <span>{allDone ? '✓ ' : ''}{t('missions.bonus')}</span>
        <span className="mission-reward">{t('missions.reward', { xp: bonusXp })}<small className="mission-fragments">{t('missions.fragments', { count: bonusFragments })}</small></span>
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
            xp={DAILY_MISSION_XP}
            fragments={DAILY_MISSION_FRAGMENTS}
            bonusXp={DAILY_BONUS_XP}
            bonusFragments={DAILY_BONUS_FRAGMENTS}
            bonusDone={missions.dailyBonus}
            hint={t('missions.resets_daily')}
          />
          <MissionList
            title={t('missions.weekly')}
            entries={missions.weekly}
            xp={WEEKLY_MISSION_XP}
            fragments={WEEKLY_MISSION_FRAGMENTS}
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
