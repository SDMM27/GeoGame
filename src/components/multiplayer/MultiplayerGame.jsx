// src/components/multiplayer/MultiplayerGame.jsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { GAME_TYPES } from '../../utils/gameTypes'
import { getSeededCountriesForGame } from '../../utils/multiplayerSeed'
import { rankResults } from '../../utils/multiplayerScoring'
import {
  updatePlayerProgress,
  writeGameResult,
  updateRoomStatus,
  updateTotalPoints,
} from '../../utils/multiplayerRoom'
import { MultiplayerPlacementGame } from '../../pages/GamePage'
import { MultiplayerFlagsGame } from '../../pages/FlagGamePage'
import { MultiplayerCapitalsGame } from '../../pages/CapitalsGamePage'
import MultiplayerBorderGuess from './MultiplayerBorderGuess'
import MultiplayerCountryClue from './MultiplayerCountryClue'
import LiveSidebar from './LiveSidebar'
import './MultiplayerGame.css'

export default function MultiplayerGame({ room, progress, playerId, roomId }) {
  const gameIndex = room.currentGameIndex
  const gameConfig = room.config.games[gameIndex]
  const isHost = room.hostId === playerId
  const transitioningRef = useRef(false)

  const seededData = useMemo(
    () => getSeededCountriesForGame(gameConfig, room.seed, gameIndex),
    [gameConfig, room.seed, gameIndex] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const totalCountries = useMemo(() => {
    const { type, mode, phases, countryCount } = gameConfig
    if (type === GAME_TYPES.BORDER_GUESS || type === GAME_TYPES.COUNTRY_CLUE) return countryCount
    if (mode === 'ascension') return Object.values(phases ?? {}).reduce((s, n) => s + n, 0)
    if (Array.isArray(seededData)) return seededData.length
    return 0
  }, [gameConfig, seededData])

  useEffect(() => {
    updatePlayerProgress(roomId, playerId, {
      gameIndex,
      countriesFound: 0,
      finished: false,
      lastSeen: serverTimestamp(),
    })
  }, [roomId, playerId, gameIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCountryFound = useCallback(() => {
    const currentFound = (progress[playerId]?.countriesFound ?? 0) + 1
    updatePlayerProgress(roomId, playerId, {
      gameIndex,
      countriesFound: currentFound,
      finished: false,
      lastSeen: serverTimestamp(),
    })
  }, [roomId, playerId, gameIndex, progress])

  const handleGameFinished = useCallback(({ attempts, elapsedTime, countriesSolved }) => {
    updatePlayerProgress(roomId, playerId, {
      gameIndex,
      countriesFound: totalCountries,
      attempts,
      elapsedTime,
      countriesSolved: countriesSolved ?? null,
      finished: true,
      lastSeen: serverTimestamp(),
    })
  }, [roomId, playerId, gameIndex, totalCountries])

  useEffect(() => {
    if (!isHost || transitioningRef.current) return

    const activePlayers = Object.entries(room.players)
      .filter(([, p]) => !p.disconnected)
      .map(([id]) => id)

    const allFinished = activePlayers.length > 0 && activePlayers.every(pid =>
      progress[pid]?.gameIndex === gameIndex && progress[pid]?.finished === true
    )

    if (!allFinished) return
    transitioningRef.current = true

    const isBorderGuess = gameConfig.type === GAME_TYPES.BORDER_GUESS
    const scoringMode = isBorderGuess ? 'solved' : 'attempts'

    const results = activePlayers.map(pid => ({
      playerId: pid,
      attempts: progress[pid].attempts ?? 0,
      elapsedTime: progress[pid].elapsedTime ?? null,
      countriesSolved: progress[pid].countriesSolved ?? null,
    }))
    const ranked = rankResults(results, activePlayers.length, scoringMode)

    Promise.all(
      ranked.map(r =>
        writeGameResult(roomId, gameIndex, r.playerId, {
          playerId: r.playerId,
          gameIndex,
          attempts: r.attempts,
          elapsedTime: r.elapsedTime,
          countriesSolved: r.countriesSolved,
          rank: r.rank,
          points: r.points,
        })
      )
    ).then(() =>
      updateTotalPoints(roomId, ranked.map(r => ({ playerId: r.playerId, points: r.points })))
    ).then(() =>
      updateRoomStatus(roomId, 'between_games')
    ).catch(err => {
      console.error('Erreur transition between_games :', err)
      transitioningRef.current = false
    })
  }, [progress, isHost, room.players, gameIndex, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const commonProps = {
    onCountryFound: handleCountryFound,
    onGameFinished: handleGameFinished,
  }

  const renderGame = () => {
    const { type, mode } = gameConfig
    const isAscension = mode === 'ascension'
    const overrides = isAscension ? null : seededData
    const overridesByDiff = isAscension ? seededData : null

    if (type === GAME_TYPES.PLACEMENT)
      return <MultiplayerPlacementGame gameConfig={gameConfig} overrideCountries={overrides} overridesByDifficulty={overridesByDiff} {...commonProps} />
    if (type === GAME_TYPES.FLAGS)
      return <MultiplayerFlagsGame gameConfig={gameConfig} overrideCountries={overrides} overridesByDifficulty={overridesByDiff} {...commonProps} />
    if (type === GAME_TYPES.CAPITALS)
      return <MultiplayerCapitalsGame gameConfig={gameConfig} overrideCountries={overrides} overridesByDifficulty={overridesByDiff} {...commonProps} />
    if (type === GAME_TYPES.BORDER_GUESS)
      return <MultiplayerBorderGuess countries={seededData} {...commonProps} />
    if (type === GAME_TYPES.COUNTRY_CLUE)
      return <MultiplayerCountryClue countries={seededData} showGlobe={gameConfig.showGlobe ?? true} {...commonProps} />
    return <p>Type de jeu inconnu : {type}</p>
  }

  return (
    <div className="mp-game-view">
      <div className="mp-game-content">
        {renderGame()}
      </div>
      <LiveSidebar
        room={room}
        progress={progress}
        playerId={playerId}
        totalCountries={totalCountries}
      />
    </div>
  )
}
