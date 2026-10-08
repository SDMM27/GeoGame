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

function StandardPlacementGame({ difficulty, isTraining, continent }) {
  const state = useGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <PlacementGameLayout
      difficulty={difficulty ?? continent}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
      continent={continent}
    />
  )
}

function AscensionPlacementGame({ phases, isTraining, presetName }) {
  const state = useAscensionState(GAME_TYPES.PLACEMENT, phases, isTraining, true)
  return (
    <PlacementGameLayout
      difficulty={null}
      isTraining={isTraining}
      isAscension
      presetName={presetName}
      state={state}
    />
  )
}

export default function GamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionPlacementGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardPlacementGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
}
