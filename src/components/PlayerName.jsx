import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReportButton from './ReportButton'
import './PlayerName.css'

// Whether a leaderboard entry belongs to the signed-in account.
export const isMine = (entry, account) => Boolean(account?.uid && entry.uid === account.uid)

// Row class for the signed-in player's own entries.
export const mineClass = (entry, account) => (isMine(entry, account) ? ' leaderboard-row--mine' : '')

// Name of a leaderboard entry: a link to the player's profile when it belongs to an account,
// with a "you" badge on the signed-in player's own entries. With `reportIn` (the leaderboard's collection, for
// entries that came with their id), the other players' entries get a discreet report button.
export default function PlayerName({ entry, account, reportIn }) {
  const { t } = useTranslation()
  return (
    <>
      {entry.uid ? (
        <Link to={`/player/${entry.uid}`} className="player-name__link" onClick={(event) => event.stopPropagation()}>
          {entry.name}
        </Link>
      ) : (
        entry.name
      )}
      {isMine(entry, account) && <span className="player-name__you">{t('score_save.you')}</span>}
      {reportIn && entry.id && !isMine(entry, account) && <ReportButton collection={reportIn} entry={entry} />}
    </>
  )
}
