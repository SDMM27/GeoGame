// src/pages/multiplayer/MultiplayerHomePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import './MultiplayerHomePage.css'

export default function MultiplayerHomePage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  const handleJoin = (e) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length === 6) navigate(`/multiplayer/room/${code}`)
  }

  return (
    <div className="mp-home">
      <NavBar />
      <main className="mp-home-main">
        <h1 className="mp-home-title">Multijoueur</h1>
        <div className="mp-home-cards">
          <button
            className="mp-card mp-card--create"
            onClick={() => navigate('/multiplayer/create')}
          >
            <span className="mp-card-icon">🎮</span>
            <span className="mp-card-label">Créer une partie</span>
          </button>
          <div className="mp-card mp-card--join">
            <span className="mp-card-icon">🔗</span>
            <span className="mp-card-label">Rejoindre</span>
            <form onSubmit={handleJoin} className="mp-join-form">
              <input
                className="mp-join-input"
                placeholder="Code (ex: AB3K7Z)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                type="submit"
                className="mp-join-btn"
                disabled={joinCode.trim().length !== 6}
              >
                Rejoindre
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
