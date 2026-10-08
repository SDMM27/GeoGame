import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TYPES } from '../../../utils/gameTypes'
import { snapshotKey } from '../../../utils/multiplayerSnapshot'
import { getRoomContent, reportProgress, roomScoringMode, submitResult } from '../../../utils/multiplayerRoom'
import { MultiplayerPlacementGame } from '../../../pages/GamePage'
import { MultiplayerFlagsGame } from '../../../pages/FlagGamePage'
import { MultiplayerCapitalsGame } from '../../../pages/CapitalsGamePage'
import { PracticeQuiz } from '../../../pages/QuizPage'
import MultiplayerBorderGuess from '../MultiplayerBorderGuess'
import MultiplayerCountryClue from '../MultiplayerCountryClue'
import { gameLabel } from '../RoomConfig'
import { Standings } from './Standings'

export default function RoomGame({ room, progress, results, playerId, onDone }) {
  const { t } = useTranslation()
  // This game's view of the room: its game and its own seed
  const { game, seed, gameIndex } = room
  const content = useMemo(() => getRoomContent(game, seed), [game, seed])
  const { total } = content
  const doneRef = useRef(false)
  const foundRef = useRef(0)
  const pseudo = room.players[playerId]?.pseudo ?? '?'

  // Announce the player as soon as the game starts
  useEffect(() => {
    reportProgress(room.id, playerId, { gameIndex, found: 0, total, finished: false }).catch(console.error)
  }, [room.id, playerId, gameIndex, total])

  const reportFound = useCallback((found) => {
    if (doneRef.current) return
    foundRef.current = found
    reportProgress(room.id, playerId, { gameIndex, found, total, finished: false }).catch(console.error)
  }, [room.id, playerId, gameIndex, total])

  const onCountryFound = useCallback(() => reportFound(foundRef.current + 1), [reportFound])

  const onGameFinished = useCallback(({ weightedScore, countriesSolved, attempts, elapsedTime }) => {
    if (doneRef.current) return
    doneRef.current = true
    // Same result as the app: Border Guess / Country Clue score the countries found
    const solved = countriesSolved ?? 0
    const result = {
      weightedScore: roomScoringMode(game) === 'solved' ? solved : (weightedScore ?? 0),
      countriesSolved: solved,
      attempts: attempts ?? 0,
      elapsedTime: Math.round(elapsedTime ?? 0),
      total,
    }
    Promise.all([
      submitResult(room.id, playerId, pseudo, result, gameIndex),
      reportProgress(room.id, playerId, { gameIndex, found: solved, total, finished: true }),
    ])
      .catch(console.error)
      .finally(() => onDone(gameIndex))
  }, [game, room.id, playerId, pseudo, gameIndex, total, onDone])

  const quizRoom = useMemo(() => ({
    seed,
    difficulty: game.quizDifficulty,
    answerMode: game.answerMode,
    total,
    onAnswered: reportFound,
    onFinished: onGameFinished,
  }), [seed, game.quizDifficulty, game.answerMode, total, reportFound, onGameFinished])

  const gameConfig = {
    type: game.type,
    mode: game.phases ? 'ascension' : 'standard',
    difficulty: game.difficulty ?? null,
    phases: game.phases ?? null,
    countryCount: total,
  }
  const setupProps = {
    gameConfig,
    overrideCountries: content.list,
    overridesByDifficulty: content.byDifficulty,
    onCountryFound,
    onGameFinished,
    roomId: room.id,
    playerId,
    gameIndex,
  }
  // Players time their own game, from when they start it
  const ownClock = { ...room, startAt: null }
  const snapKey = snapshotKey(room.id, playerId, gameIndex)

  const renderGame = () => {
    switch (game.type) {
      case GAME_TYPES.PLACEMENT: return <MultiplayerPlacementGame {...setupProps} />
      case GAME_TYPES.FLAGS: return <MultiplayerFlagsGame {...setupProps} />
      case GAME_TYPES.CAPITALS: return <MultiplayerCapitalsGame {...setupProps} />
      case GAME_TYPES.BORDER_GUESS:
        return <MultiplayerBorderGuess countries={content.list} snapshotKey={snapKey} onCountryFound={onCountryFound} onGameFinished={onGameFinished} room={ownClock} />
      case GAME_TYPES.COUNTRY_CLUE:
        return <MultiplayerCountryClue countries={content.list} snapshotKey={snapKey} onCountryFound={onCountryFound} onGameFinished={onGameFinished} room={ownClock} />
      case GAME_TYPES.QUIZ: return <PracticeQuiz room={quizRoom} />
      default: return null
    }
  }

  return (
    <div className="mp-game-view">
      <div className={`mp-game-content${game.type === GAME_TYPES.QUIZ ? ' mpr-scroll' : ''}`}>
        {renderGame()}
      </div>
      <aside className="mpr-sidebar">
        <div className="mpr-card">
          <h3>{gameLabel(game, t)}</h3>
          <Standings room={room} progress={progress} results={results} playerId={playerId} index={gameIndex} />
        </div>
      </aside>
    </div>
  )
}
