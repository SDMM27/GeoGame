// src/components/multiplayer/LiveSidebar.jsx
import React from 'react'
import './LiveSidebar.css'

export default function LiveSidebar({ room, progress, playerId, totalCountries }) {
  const players = Object.entries(room.players)
    .filter(([, p]) => !p.disconnected)
    .sort((a, b) => {
      const aFound = progress[a[0]]?.countriesFound ?? 0
      const bFound = progress[b[0]]?.countriesFound ?? 0
      return bFound - aFound
    })

  return (
    <aside className="live-sidebar">
      <p className="live-sidebar-title">Joueurs</p>
      <ul className="live-sidebar-list">
        {players.map(([pid, player]) => {
          const prog = progress[pid]
          const found = prog?.countriesFound ?? 0
          const finished = prog?.finished ?? false
          const pct = totalCountries > 0 ? Math.min((found / totalCountries) * 100, 100) : 0
          const isMe = pid === playerId

          return (
            <li key={pid} className={`live-sidebar-player${isMe ? ' live-sidebar-player--me' : ''}`}>
              <div className="live-sidebar-player-header">
                <span className="live-sidebar-pseudo">{player.pseudo}{isMe ? ' (Toi)' : ''}</span>
                {finished ? (
                  <span className="live-sidebar-done">✓</span>
                ) : (
                  <span className="live-sidebar-count">{found}/{totalCountries}</span>
                )}
              </div>
              <div className="live-sidebar-bar-track">
                <div
                  className={`live-sidebar-bar${finished ? ' live-sidebar-bar--done' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
