// Best solo score of each game by difficulty or continent: perfect ones in gold, the others with how close they are.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerRecords } from '../../hooks/usePlayerRecords'
import { GAME_TYPES } from '../../utils/gameTypes'

const RECORD_META = {
  [GAME_TYPES.PLACEMENT]: { emoji: '🌍', titleKey: 'games.placement.title', color: '#7AA2FF' },
  [GAME_TYPES.HARDCORE]: { emoji: '💀', titleKey: 'games.hardcore.title', color: '#FF9F45' },
  [GAME_TYPES.FLAGS]: { emoji: '🚩', titleKey: 'games.flags.title', color: '#FF7A6B' },
  [GAME_TYPES.MISSING_FLAG]: { emoji: '🧩', titleKey: 'games.missing_flag.title', color: '#C792FF' },
  [GAME_TYPES.CAPITALS]: { emoji: '🏛️', titleKey: 'games.capitals.title', color: '#F5B83D' },
}

export default function RecordsSection({ uid }) {
  const { t } = useTranslation()
  const { loading, error, grid } = usePlayerRecords(uid)
  const [by, setBy] = useState('difficulties')
  if (loading || error || !grid) return null
  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <h2>{t('profile.records_title')}</h2>
        <strong className={`profile-records-count${grid.perfectCount > 0 ? ' perfect' : ''}`}>
          {t('profile.records_perfect', { count: grid.perfectCount, total: grid.total })}
        </strong>
      </div>
      <div className="profile-filters">
        {['difficulties', 'continents'].map((value) => (
          <button key={value} type="button" className={by === value ? 'active' : ''} onClick={() => setBy(value)}>
            {t(value === 'difficulties' ? 'selection.by_difficulty' : 'selection.by_continent')}
          </button>
        ))}
      </div>
      <div className="profile-card profile-records">
        <div className="profile-records-row">
          {grid.rows[0][by].map((cell) => (
            <small key={cell.mode} className="profile-records-header" title={t(`${by}.${cell.mode}`)}>
              {t(`${by}.${cell.mode}`)}
            </small>
          ))}
        </div>
        {grid.rows.map((row) => {
          const meta = RECORD_META[row.game]
          if (!meta) return null
          return (
            <div key={row.game} className="profile-records-game">
              <small className="profile-records-title">
                {meta.emoji} {t(meta.titleKey)}
              </small>
              <div className="profile-records-row">
                {row[by].map((cell) => (
                  <div key={cell.key} className={`profile-record-cell${cell.isPerfect ? ' perfect' : ''}`}>
                    {cell.score == null ? (
                      <span className="profile-record-empty">—</span>
                    ) : (
                      <>
                        <strong>
                          {cell.isPerfect && '★ '}
                          {cell.score}
                        </strong>
                        {!cell.isPerfect && (
                          <div className="profile-progress profile-record-bar">
                            <span style={{ width: `${cell.ratio * 100}%`, background: meta.color }} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
