// Solo survival run, launched from the home page with { modes, lives }.
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { normalizeSurvivalModes } from '../utils/survivalConfig'
import SurvivalGame from './survival/SurvivalGame'
import 'leaflet/dist/leaflet.css'
import './GamePage.css'

const newSeed = () => Math.floor(Math.random() * 2 ** 31)

export default function SurvivalPage() {
  const navigate = useNavigate()
  const { modes: chosen, lives } = useLocation().state || {}
  const modes = normalizeSurvivalModes(chosen)
  const [seed, setSeed] = useState(newSeed)
  const valid = modes.length > 0 && Number.isInteger(lives) && lives > 0

  useEffect(() => {
    if (!valid) navigate('/')
  }, [valid, navigate])

  if (!valid) return null

  return (
    <div className="survival-page">
      <NavBar />
      <SurvivalGame
        key={seed}
        modes={modes}
        lives={lives}
        seed={seed}
        onRestart={() => setSeed(newSeed())}
        onHome={() => navigate('/')}
      />
    </div>
  )
}
