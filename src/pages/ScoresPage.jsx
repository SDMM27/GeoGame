import React from 'react'
import { useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Scoreboard from './Scoreboard'

export default function ScoresPage() {
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game') ?? 'country'
  return (
    <div className="scores-page">
      <NavBar />
      <Scoreboard defaultGame={game} />
    </div>
  )
}
