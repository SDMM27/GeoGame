import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../auth'
import PlayerName, { mineClass } from '../components/PlayerName'
import { currentSeason, fetchEloLeaderboard, formatSeason } from '../utils/elo'
import { ELO_MODES } from '../utils/eloRating'

const MEDAL = ['🥇', '🥈', '🥉']
const GAME_TITLE_KEYS = {
  PLACEMENT: 'games.placement.title',
  HARDCORE: 'games.hardcore.title',
  FLAGS: 'games.flags.title',
  MISSING_FLAG: 'games.missing_flag.title',
  CAPITALS: 'games.capitals.title',
  BORDER_GUESS: 'games.border_guess.title',
  SURVIVAL: 'games.survival.title',
}

export default function EloScoreboard() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const [key, setKey] = useState('duel')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // The season's best players for the selected key, fetched again whenever it changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchEloLeaderboard(key)
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setRows([])
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  const detail = (row) =>
    key === 'duel' ? t('elo.duel_detail', { games: row.games, wins: row.wins }) : t('elo.found_count', { count: row.found })

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">{t('elo.title')}</h1>
      <p className="scoreboard-note">{formatSeason(currentSeason(), t)}</p>
      <p className="scoreboard-note">{t('elo.explain')}</p>

      <div className="scoreboard-filters">
        <select className="scoreboard-select" value={key} onChange={(event) => setKey(event.target.value)}>
          <option value="duel">{t('elo.duel')}</option>
          {ELO_MODES.map((mode) => (
            <option key={mode} value={mode}>{t(GAME_TITLE_KEYS[mode])}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="scoreboard-loading">{t('messages.loading')}</p>
      ) : failed ? (
        <p className="scoreboard-empty">{t('messages.page_load_error')}</p>
      ) : rows.length === 0 ? (
        <p className="scoreboard-empty">{t('elo.empty')}</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header scoreboard-header--elo">
            <span>#</span>
            <span>{t('labels.player')}</span>
            <span>{t('elo.rating')}</span>
            <span>{t(key === 'duel' ? 'elo.col_duel' : 'elo.col_found')}</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={`scoreboard-row scoreboard-row--elo ${index < 3 ? 'scoreboard-row--top' : ''}${mineClass(row, account)}`}
            >
              <span className="scoreboard-rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
              <span className="scoreboard-name"><PlayerName entry={row} account={account} /></span>
              <span className="scoreboard-score">{row.rating}</span>
              <span className="scoreboard-time">{detail(row)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
