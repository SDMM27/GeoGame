import React from 'react'
import { useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Scoreboard from './Scoreboard'
import { GAME_TYPES } from '../utils/gameTypes'

export default function ScoresPage() {
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game') ?? GAME_TYPES.PLACEMENT
  return (
    <div className="scores-page">
      <NavBar />
      <Scoreboard defaultGame={game} />
    </div>
  )
}
