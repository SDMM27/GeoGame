// src/components/multiplayer/chill/ChillGame.jsx
import { useMemo, useEffect, useRef, useCallback } from 'react'
import { GAME_TYPES } from '../../../utils/gameTypes'
import { getSeededCountriesForGame } from '../../../utils/multiplayerSeed'
import { rankResults } from '../../../utils/multiplayerScoring'
import {
  initChillState,
  advanceChillTurn,
  submitChillAnswer,
  setChillReviewStep,
  updateRoomStatus,
  writeGameResult,
  updateTotalPoints,
} from '../../../utils/multiplayerRoom'
import {
  getCountdownMs,
  evaluateTextAnswer,
  evaluateGuessAnswer,
  evaluatePlacement,
  flattenAscensionCountries,
} from '../../../utils/chillModeUtils'
import ChillCountdown from './ChillCountdown'
import ChillTextInput from './ChillTextInput'
import ChillPlacementInput from './ChillPlacementInput'
import ChillReview from './ChillReview'

const endedGames = new Set()

export default function ChillGame({ room, playerId, roomId }) {
  const chillState = room.chillState
  const gameIndex = room.currentGameIndex
  const gameConfig = room.config.games[gameIndex]
  const mancheSize = room.config.chillConfig?.mancheSize ?? 10
  const isHost = room.hostId === playerId

  // ─── Liste de pays avec difficulté ─────────────────────────────────────────
  const countriesWithDiff = useMemo(() => {
    const raw = getSeededCountriesForGame(gameConfig, room.seed, gameIndex)
    if (gameConfig.mode === 'ascension') {
      return flattenAscensionCountries(raw)
    }
    return (raw ?? []).map(c => ({ country: c, difficulty: gameConfig.difficulty ?? 'Moyen' }))
  }, [gameConfig, room.seed, gameIndex])

  const totalCountries = countriesWithDiff.length
  const countriesWithDiffRef = useRef(countriesWithDiff)
  useEffect(() => { countriesWithDiffRef.current = countriesWithDiff }, [countriesWithDiff])

  // ─── Init chillState (host, une seule fois) ────────────────────────────────
  useEffect(() => {
    if (!isHost || chillState) return
    if (!countriesWithDiff.length) return
    const countdownMs = getCountdownMs(countriesWithDiff[0].difficulty)
    initChillState(roomId, countdownMs)
  }, [isHost, chillState, roomId, countriesWithDiff])

  // ─── Fin de partie (host) ──────────────────────────────────────────────────
  const handleGameEnd = useCallback(async () => {
    const gameKey = `${roomId}-${gameIndex}`
    if (!isHost || endedGames.has(gameKey)) return
    endedGames.add(gameKey)

    const activePlayers = Object.entries(room.players).filter(([, p]) => !p.disconnected)
    const results = activePlayers.map(([pid]) => {
      const answers = chillState.playerAnswers?.[pid] ?? {}
      let weightedScore = 0, countriesSolved = 0, failures = 0
      countriesWithDiff.forEach((_, idx) => {
        const ans = answers[String(idx)]
        if (ans && ans.correct) { weightedScore += ans.score; countriesSolved++ }
        else failures++
      })
      return {
        playerId: pid,
        weightedScore,
        countriesSolved,
        attempts: failures,
        perfects: countriesSolved,
        stumbles: 0,
        elapsedTime: null,
      }
    })

    const scoringMode = (gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE)
      ? 'solved'
      : 'weighted'
    const scored = rankResults(results, activePlayers.length, scoringMode)
    await Promise.all(scored.map(r =>
      writeGameResult(roomId, gameIndex, r.playerId, r)
    ))
    await updateTotalPoints(roomId, scored.map(r => ({ playerId: r.playerId, points: r.points })))
    await updateRoomStatus(roomId, 'between_games')
  }, [isHost, room.players, chillState, countriesWithDiff, roomId, gameIndex])

  // ─── Host : avancer le tour quand le countdown se termine ─────────────────
  useEffect(() => {
    if (!isHost || !chillState || chillState.phase !== 'playing') return
    if (!chillState.countdownEnd) return

    const endMs = typeof chillState.countdownEnd.toMillis === 'function'
      ? chillState.countdownEnd.toMillis()
      : Number(chillState.countdownEnd)
    const ms = Math.max(0, endMs - Date.now())

    const id = setTimeout(async () => {
      const next = chillState.currentCountryIndex + 1
      const mancheStart = chillState.mancheStartIndex
      const isEndOfManche = (next - mancheStart) >= mancheSize || next >= countriesWithDiffRef.current.length

      if (isEndOfManche) {
        await advanceChillTurn(roomId, 'review', next, mancheStart, null)
      } else {
        const { difficulty } = countriesWithDiffRef.current[next]
        const countdownMs = getCountdownMs(difficulty)
        await advanceChillTurn(roomId, 'playing', next, mancheStart, countdownMs)
      }
    }, ms + 300)

    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, chillState?.countdownEnd, chillState?.currentCountryIndex, chillState?.phase])

  // ─── Soumission de la réponse locale ───────────────────────────────────────
  const handleSubmitAnswer = useCallback((answerData) => {
    const idx = chillState?.currentCountryIndex
    if (idx == null) return
    if (room.chillState?.playerAnswers?.[playerId]?.[String(idx)] != null) return
    submitChillAnswer(roomId, playerId, idx, answerData)
  }, [chillState?.currentCountryIndex, room.chillState?.playerAnswers, playerId, roomId])

  // ─── Callbacks review ──────────────────────────────────────────────────────
  const handleReviewNext = useCallback(() => {
    if (!isHost) return
    setChillReviewStep(roomId, (chillState?.reviewStep ?? 0) + 1)
  }, [isHost, roomId, chillState?.reviewStep])

  const handleReviewContinue = useCallback(() => {
    if (!isHost) return
    const next = chillState.currentCountryIndex
    if (next >= totalCountries) {
      handleGameEnd()
    } else {
      const { difficulty } = countriesWithDiff[next]
      const countdownMs = getCountdownMs(difficulty)
      advanceChillTurn(roomId, 'playing', next, next, countdownMs)
    }
  }, [isHost, chillState, totalCountries, countriesWithDiff, roomId, handleGameEnd])

  // ─── Render ────────────────────────────────────────────────────────────────
  if (!chillState) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>
  }

  // Phase review
  if (chillState.phase === 'review') {
    const mancheStart = chillState.mancheStartIndex
    const mancheEnd = chillState.currentCountryIndex
    const mancheCountries = countriesWithDiff
      .slice(mancheStart, mancheEnd)
      .map(({ country }) => country)

    return (
      <ChillReview
        mancheCountries={mancheCountries}
        mancheStartIndex={mancheStart}
        playerAnswers={chillState.playerAnswers ?? {}}
        reviewStep={chillState.reviewStep ?? 0}
        isHost={isHost}
        players={room.players}
        gameType={gameConfig.type}
        onNext={handleReviewNext}
        onContinue={handleReviewContinue}
      />
    )
  }

  // Phase playing
  const { country: currentCountry, difficulty } = countriesWithDiff[chillState.currentCountryIndex] ?? {}
  if (!currentCountry) return null

  const alreadyAnswered = room.chillState?.playerAnswers?.[playerId]?.[String(chillState.currentCountryIndex)] != null
  const countdownMs = getCountdownMs(difficulty)

  const renderInput = () => {
    if (gameConfig.type === GAME_TYPES.PLACEMENT) {
      const targetName = typeof currentCountry === 'string' ? currentCountry : currentCountry.ADMIN
      return (
        <ChillPlacementInput
          targetName={targetName}
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          onSubmit={(clickedAdmin) => {
            const evalResult = evaluatePlacement(clickedAdmin, targetName, difficulty)
            handleSubmitAnswer({ clickedAdmin, ...evalResult })
          }}
        />
      )
    }

    if (gameConfig.type === GAME_TYPES.FLAGS) {
      const target = currentCountry.ADMIN
      const aliases = currentCountry.aliases ?? []
      return (
        <ChillTextInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          placeholder="Nom du pays…"
          onSubmit={(answer) => {
            const evalResult = evaluateTextAnswer(answer, target, aliases, difficulty)
            handleSubmitAnswer({ answer, ...evalResult })
          }}
        />
      )
    }

    if (gameConfig.type === GAME_TYPES.CAPITALS) {
      const target = currentCountry.capital ?? ''
      const aliases = currentCountry.capitalAliases ?? []
      return (
        <ChillTextInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          placeholder="Nom de la capitale…"
          onSubmit={(answer) => {
            const evalResult = evaluateTextAnswer(answer, target, aliases, difficulty)
            handleSubmitAnswer({ answer, ...evalResult })
          }}
        />
      )
    }

    if (gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE) {
      const target = currentCountry.ADMIN
      const aliases = currentCountry.aliases ?? []
      return (
        <ChillTextInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          placeholder="Nom du pays…"
          onSubmit={(answer) => {
            const evalResult = evaluateGuessAnswer(answer, target, aliases)
            handleSubmitAnswer({ answer, ...evalResult })
          }}
        />
      )
    }

    return <div style={{ color: '#ef4444' }}>Type de jeu non supporté en mode chill.</div>
  }

  const progress = `${chillState.currentCountryIndex + 1} / ${totalCountries}`

  return (
    <div style={{ padding: '16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: 8, fontSize: '0.85em' }}>
        <span>Pays {progress}</span>
        <span>Manche : {chillState.currentCountryIndex - chillState.mancheStartIndex + 1} / {mancheSize}</span>
      </div>
      <ChillCountdown countdownEnd={chillState.countdownEnd} totalMs={countdownMs} />
      <div style={{ marginTop: 16 }}>
        {renderInput()}
      </div>
      {alreadyAnswered && (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 12, fontSize: '0.9em' }}>
          ✓ Réponse envoyée — en attente des autres joueurs…
        </p>
      )}
    </div>
  )
}
