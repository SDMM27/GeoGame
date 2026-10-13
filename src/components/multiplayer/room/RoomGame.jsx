import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TYPES } from '../../../utils/gameTypes'
import { loadSnapshot, snapshotKey } from '../../../utils/multiplayerSnapshot'
import { serverNow } from '../../../utils/serverTime'
import { parseSurvivalModes } from '../../../utils/survivalConfig'
import { SURVIVAL_LATE_MS } from '../../../utils/survivalSync'
import { getRoomContent, progressForGame, reportProgress, roomScoringMode, submitResult } from '../../../utils/multiplayerRoom'
import { MultiplayerPlacementGame } from '../../../pages/GamePage'
import { MultiplayerFlagsGame } from '../../../pages/FlagGamePage'
import { MultiplayerCapitalsGame } from '../../../pages/CapitalsGamePage'
import { PracticeQuiz } from '../../../pages/QuizPage'
import MultiplayerBorderGuess from '../MultiplayerBorderGuess'
import MultiplayerCountryClue from '../MultiplayerCountryClue'
import SurvivalGame from '../../../pages/survival/SurvivalGame'
import { gameLabel } from '../RoomConfig'
import { Standings, SurvivalStrip } from './Standings'

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

  // `stay`: the result is sent but the game stays on screen (survival: watch the others), until onDone is called
  const onGameFinished = useCallback(({ weightedScore, countriesSolved, attempts, elapsedTime }, { stay = false } = {}) => {
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
      .finally(() => { if (!stay) onDone(gameIndex) })
  }, [game, room.id, playerId, pseudo, gameIndex, total, onDone])

  // Survival: rounds cleared and lives left as they change (and the round, in a live room), then the rounds
  // cleared as the score
  const survivalRoom = useMemo(() => ({
    onProgress: ({ score, ...state }) => {
      if (doneRef.current) return
      reportProgress(room.id, playerId, { gameIndex, found: score, total, finished: false, ...state }).catch(console.error)
    },
    onFinished: ({ score, errors, elapsedTime }, options) =>
      onGameFinished({ weightedScore: score, countriesSolved: score, attempts: errors, elapsedTime }, options),
    onExit: () => onDone(gameIndex),
  }), [room.id, playerId, gameIndex, total, onGameFinished, onDone])

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
  const [survivalSnapshot] = useState(() => (game.type === GAME_TYPES.SURVIVAL ? loadSnapshot(snapKey) : null))
  // Live room: the players who start the game together play it round by round (late ones play it on their own)
  const startAt = room.startAt?.toMillis ? room.startAt.toMillis() : null
  const [synced] = useState(() =>
    room.mode === 'live' && startAt != null &&
    (survivalSnapshot ? Boolean(survivalSnapshot.synced) : serverNow() - startAt < SURVIVAL_LATE_MS)
  )
  const survivalEntries = useMemo(
    () => Object.entries(progressForGame(progress, gameIndex))
      .map(([id, entry]) => ({ ...entry, id, lastSeen: entry.lastSeen?.toMillis ? entry.lastSeen.toMillis() : null })),
    [progress, gameIndex]
  )

  const playerNames = useMemo(
    () => Object.fromEntries(Object.entries(room.players ?? {}).map(([id, player]) => [id, player.pseudo])),
    [room.players]
  )

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
      case GAME_TYPES.SURVIVAL:
        return (
          <SurvivalGame
            modes={parseSurvivalModes(game.modes)}
            lives={game.lives}
            timer={game.timer ?? 0}
            ramp={game.ramp ?? null}
            seed={seed}
            snapshot={survivalSnapshot}
            snapshotKey={snapKey}
            room={survivalRoom}
            sync={synced ? { startAt, entries: survivalEntries, playerId, names: playerNames } : null}
          />
        )
      default: return null
    }
  }

  return (
    <div className="mp-game-view">
      {game.type === GAME_TYPES.SURVIVAL && (
        <SurvivalStrip room={room} progress={progress} results={results} playerId={playerId} index={gameIndex} />
      )}
      <div className={`mp-game-content${game.type === GAME_TYPES.QUIZ || game.type === GAME_TYPES.SURVIVAL ? ' mpr-scroll' : ''}`}>
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
