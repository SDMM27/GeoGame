// The games with settings as an airport departures board: destination (split-flap letters), a short description, and
// a status. A row is one button (the whole row is clickable), which opens the game's settings like before.
import React from 'react'
import { useTranslation } from 'react-i18next'
import FlapText from './FlapText'
import GameEmblem, { flightCode } from '../../../components/GameEmblem'

// `rows`: { id, title, description, status: 'boarding' | 'on_time' | 'open', onClick, game? } (`game`: the emblem and
// flight code to show, none for a row that is not a game)
export default function DeparturesBoard({ rows, labelledBy }) {
  const { t, i18n } = useTranslation()
  const upper = (text) => text.toLocaleUpperCase(i18n.resolvedLanguage)
  return (
    <div className="departures">
      <table className="departures-table" aria-labelledby={labelledBy}>
        <thead>
          <tr className="gg-mono">
            <th scope="col">{t('home.col_destination')}</th>
            <th scope="col" className="departures-brief">{t('home.col_brief')}</th>
            <th scope="col" className="departures-status-col">{t('home.col_status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="departures-row">
              <td className="departures-name">
                <button type="button" className="departures-button" onClick={row.onClick}>
                  <span className="departures-emblem">{row.game && <GameEmblem game={row.game} size={28} />}</span>
                  <span className="gg-mono departures-code" aria-hidden="true">{row.game ? flightCode(row.game) : ''}</span>
                  <FlapText text={upper(row.title)} delay={i * 90} duration={700} />
                </button>
              </td>
              <td className="departures-brief">{row.description}</td>
              <td className="departures-status-col">
                <span className={`gg-mono departures-status departures-status--${row.status}`}>
                  {t(`home.status_${row.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
