import React from 'react'
import { useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Scoreboard from './Scoreboard'
import AscensionScoreboard from './AscensionScoreboard'
import { GAME_TYPES } from '../utils/gameTypes'
import './scoreboard.css'

export default function ScoresPage() {
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game') ?? GAME_TYPES.PLACEMENT
  const initialMode = searchParams.get('mode') === 'ascension' ? 'ascension' : 'standard'
  const [mode, setMode] = React.useState(initialMode)
  return (
    <div className="scores-page">
      <NavBar />
      <div className="scoreboard-mode-tabs">
        <button
          className={`scoreboard-mode-tab ${mode === 'standard' ? 'scoreboard-mode-tab--active' : ''}`}
          onClick={() => setMode('standard')}
        >
          Standard
        </button>
        <button
          className={`scoreboard-mode-tab ${mode === 'ascension' ? 'scoreboard-mode-tab--active' : ''}`}
          onClick={() => setMode('ascension')}
        >
          🚀 Ascension
        </button>
      </div>
      {mode === 'ascension'
        ? <AscensionScoreboard defaultGame={game} />
        : <Scoreboard defaultGame={game} />
      }
    </div>
  )
}
