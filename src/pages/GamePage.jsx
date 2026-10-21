// src/pages/GamePage.jsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import useGameState from '../hooks/useGameState'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import PlacementGameLayout from './game/PlacementGameLayout'
import MultiplayerPlacementGame from './game/MultiplayerPlacementGame'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

export { MultiplayerPlacementGame }

function StandardPlacementGame({ difficulty, isTraining, continent, gameType }) {
  const state = useGameState(difficulty, isTraining, null, null, null, continent, gameType)
  return (
    <PlacementGameLayout
      difficulty={difficulty ?? continent}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
      continent={continent}
      gameType={gameType}
    />
  )
}

function AscensionPlacementGame({ phases, isTraining, presetName, gameType = GAME_TYPES.PLACEMENT }) {
  const state = useAscensionState(gameType, phases, isTraining, true)
  return (
    <PlacementGameLayout
      difficulty={null}
      isTraining={isTraining}
      isAscension
      presetName={presetName}
      state={state}
      gameType={gameType}
    />
  )
}

export default function GamePage() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const { difficulty = params.get('difficulty'), isTraining, isAscension, phases, presetName, continent, gameType = params.get('gameType') ?? GAME_TYPES.PLACEMENT } = location.state || {}

  if (isAscension) {
    return (
      <AscensionPlacementGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
        gameType={gameType}
      />
    )
  }

  return <StandardPlacementGame difficulty={difficulty} isTraining={isTraining} continent={continent} gameType={gameType} />
}
