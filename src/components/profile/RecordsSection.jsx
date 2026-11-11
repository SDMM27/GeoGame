// Best solo score of each game by difficulty or continent: perfect ones in gold, the others with how close they are.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayerRecords } from '../../hooks/usePlayerRecords'
import { GAME_TYPES } from '../../utils/gameTypes'
import GameEmblem from '../GameEmblem'
import CollapsibleSection from '../CollapsibleSection'

const RECORD_META = {
  [GAME_TYPES.PLACEMENT]: { titleKey: 'games.placement.title', color: 'var(--game-placement)', ink: 'var(--game-placement-ink)' },
  [GAME_TYPES.HARDCORE]: { titleKey: 'games.hardcore.title', color: 'var(--game-daily-challenge)', ink: 'var(--game-daily-challenge-ink)' },
  [GAME_TYPES.FLAGS]: { titleKey: 'games.flags.title', color: 'var(--game-flags)', ink: 'var(--game-flags-ink)' },
  [GAME_TYPES.MISSING_FLAG]: { titleKey: 'games.missing_flag.title', color: 'var(--game-border-guess)', ink: 'var(--game-border-guess-ink)' },
  [GAME_TYPES.CAPITALS]: { titleKey: 'games.capitals.title', color: 'var(--game-capitals)', ink: 'var(--game-capitals-ink)' },
}

export default function RecordsSection({ uid, scope }) {
  const { t } = useTranslation()
  const { loading, error, grid } = usePlayerRecords(uid)
  const [by, setBy] = useState('difficulties')
  if (loading || error || !grid) return null
  const summary = (
    <strong className={`profile-records-count${grid.perfectCount > 0 ? ' perfect' : ''}`}>
      {t('profile.records_perfect', { count: grid.perfectCount, total: grid.total })}
    </strong>
  )
  return (
    <CollapsibleSection id={`${scope}.records`} title={t('profile.records_title')} summary={summary} defaultOpen={scope === 'player'}>
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
            <small key={cell.mode} className="profile-records-header gg-board-head" title={t(`${by}.${cell.mode}`)}>
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
                <GameEmblem game={row.game} variant="glyph" size={16} /> {t(meta.titleKey)}
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
    </CollapsibleSection>
  )
}
