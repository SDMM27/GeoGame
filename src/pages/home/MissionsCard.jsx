// Home page: the day's and week's missions with their progress, the dailies of the day with their fragments, the streak,
// and the player's level. Visitors get an invitation.
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
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

// Today's dailies (played, won, the 3 tiers of fragments) and the streak with its next milestone.
function DailiesRow({ dailies, streak }) {
  const { t } = useTranslation()
  return (
    <div className="missions-dailies">
      <div className="missions-dailies-line">
        <strong>{t('missions.dailies_title')}</strong>
        <small>
          {t('missions.dailies_played', { played: dailies.played, total: dailies.total })} · {t('missions.dailies_won', { won: dailies.won, total: dailies.total })}
        </small>
      </div>
      <ul className="missions-dailies-tiers">
        {dailies.tiers.map((tier) => {
          const finished = tier.done || tier.paid
          return (
            <li key={tier.id} className={`missions-dailies-tier${finished ? ' missions-dailies-tier--done' : ''}`}>
              <span>{finished ? '✓ ' : ''}{t(`missions.${tier.id}`)}</span>
              <small>{t('missions.fragments', { count: tier.fragments })}</small>
            </li>
          )
        })}
      </ul>
      {streak && (
        <div className="missions-dailies-line missions-streak">
          <strong>{t('missions.streak_title')}</strong>
          <span>{streak.count > 0 ? t('missions.streak_days', { count: streak.count }) : t('missions.streak_none')}</span>
          <small>
            {t('missions.streak_next', { day: streak.next.count })} · {t('missions.fragments', { count: streak.next.fragments })}
          </small>
        </div>
      )}
    </div>
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

// `missions`: useMissions of the signed-in player (the home page loads it, it also marks the dailies played).
export default function MissionsCard({ missions }) {
  const { t } = useTranslation()
  const { account } = useAccount()

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
      {missions.dailies && <DailiesRow dailies={missions.dailies} streak={missions.streak} />}
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
