import React, { useState } from 'react'
import useGameState from '../../hooks/useGameState'
import useAscensionState from '../../hooks/useAscensionState'
import { snapshotKey, loadSnapshot } from '../../utils/multiplayerSnapshot'
import { GAME_TYPES } from '../../utils/gameTypes'
import PlacementGameLayout from './PlacementGameLayout'
import useRoomReporting from './useRoomReporting'

export default function MultiplayerPlacementGame({ gameConfig, overrideCountries, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  if (gameConfig.mode === 'ascension') {
    return (
      <MultiplayerAscensionPlacementGame
        gameConfig={gameConfig}
        overridesByDifficulty={overridesByDifficulty}
        onCountryFound={onCountryFound}
        onGameFinished={onGameFinished}
        roomId={roomId}
        playerId={playerId}
        gameIndex={gameIndex}
      />
    )
  }
  return (
    <MultiplayerStandardPlacementGame
      gameConfig={gameConfig}
      overrideCountries={overrideCountries}
      onCountryFound={onCountryFound}
      onGameFinished={onGameFinished}
      roomId={roomId}
      playerId={playerId}
      gameIndex={gameIndex}
    />
  )
}

function MultiplayerStandardPlacementGame({ gameConfig, overrideCountries, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useGameState(gameConfig.difficulty, false, overrideCountries, mpSnapshot, mpSnapKey)
  useRoomReporting(state, mpSnapshot?.found ?? 0, onCountryFound, onGameFinished)

  return (
    <PlacementGameLayout
      difficulty={gameConfig.difficulty}
      isTraining={false}
      isAscension={false}
      presetName={null}
      state={state}
      onGameFinished={onGameFinished}
    />
  )
}

function MultiplayerAscensionPlacementGame({ gameConfig, overridesByDifficulty, onCountryFound, onGameFinished, roomId, playerId, gameIndex }) {
  const mpSnapKey = roomId && playerId != null && gameIndex != null
    ? snapshotKey(roomId, playerId, gameIndex)
    : null
  const [mpSnapshot] = useState(() => mpSnapKey ? loadSnapshot(mpSnapKey) : null)
  const state = useAscensionState(GAME_TYPES.PLACEMENT, gameConfig.phases, false, true, overridesByDifficulty, mpSnapshot, mpSnapKey)
  useRoomReporting(state, mpSnapshot?.found ?? 0, onCountryFound, onGameFinished)

  return (
    <PlacementGameLayout
      difficulty={null}
      isTraining={false}
      isAscension
      presetName={gameConfig.presetName ?? null}
      state={state}
      onGameFinished={onGameFinished}
    />
  )
}
