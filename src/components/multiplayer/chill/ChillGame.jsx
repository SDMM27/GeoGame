// src/components/multiplayer/chill/ChillGame.jsx
import { useMemo, useEffect, useRef, useCallback } from 'react'

import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getCountryAreaKm2 } from '../../../utils/countryArea'
import { getCountryStyle, getFocusCountry } from '../../../utils/borderGuessMap'
import { GAME_TYPES } from '../../../utils/gameTypes'
import { getSeededCountriesForGame } from '../../../utils/multiplayerSeed'
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
  evaluatePlacement,
  flattenAscensionCountries,
} from '../../../utils/chillModeUtils'

import ChillCountdown from './ChillCountdown'
import ChillTextInput from './ChillTextInput'
import ChillPlacementInput from './ChillPlacementInput'
import ChillReview from './ChillReview'
import ChillPlacementReview from './ChillPlacementReview'
import ChillGuessInput from './ChillGuessInput'


function FitCountry({ country }) {
  const map = useMap()
  useEffect(() => {
    try { map.fitBounds(L.geoJSON(country).getBounds(), { padding: [20, 20] }) } catch (e) {}
  }, [map, country])
  return null
}

function BorderGuessDisplay({ country }) {
  const displayCountry = getFocusCountry(country)
  return (
    <div style={{ height: 220, borderRadius: 8, overflow: 'hidden', marginBottom: 16, border: '1px solid #1e293b', background: '#0f172a' }}>
      <MapContainer
        key={country.properties?.ADMIN}
        center={[20, 0]} zoom={3} zoomControl={false} attributionControl={false}
        scrollWheelZoom={false} dragging={false} doubleClickZoom={false}
        boxZoom={false} keyboard={false} touchZoom={false}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
      >
        <GeoJSON data={displayCountry} style={() => getCountryStyle(country)} />
        <FitCountry country={country} />
      </MapContainer>
    </div>
  )
}

function CountryClueDisplay({ country }) {
  const pop = country.properties?.population
  const area = Math.round(getCountryAreaKm2(country))
  const fmt = (n) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)} Mrd`
    if (n >= 1e6) return `${Math.round(n / 1e6)} M`
    if (n >= 1e3) return `${Math.round(n / 1e3)} k`
    return String(n)
  }
  const fmtArea = (n) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M km²`
    if (n >= 1e3) return `${Math.round(n / 1e3)} k km²`
    return `${n} km²`
  }
  const cell = (label, value) => (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 20px', textAlign: 'center' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.1rem' }}>{value}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      {cell('Population', pop ? fmt(pop) : '?')}
      {cell('Superficie', area ? fmtArea(area) : '?')}
    </div>
  )
}

const endedGames = new Set()

export default function ChillGame({ room, playerId, roomId }) {
  const chillState = room.chillState
  const gameIndex = room.currentGameIndex
  const gameConfig = room.config.games[gameIndex]
  const chillTimers = room.config.chillConfig?.timers ?? null
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

  const isNoTimerGame = gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE
  const noTimerAdvancedRef = useRef(null)

  // ─── Init chillState (host) — réinitialise si gameIndex change ───────────────
  useEffect(() => {
    if (!isHost) return
    if (chillState && chillState.gameIndex === gameIndex) return
    if (!countriesWithDiff.length) return
    const countdownMs = isNoTimerGame ? null : getCountdownMs(countriesWithDiff[0].difficulty, chillTimers)
    initChillState(roomId, gameIndex, countdownMs)
  }, [isHost, chillState?.gameIndex, gameIndex, roomId, countriesWithDiff])

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

    const sorted = [...results].sort((a, b) => (b.weightedScore ?? 0) - (a.weightedScore ?? 0))
    const scored = sorted.map((r, i) => ({ ...r, rank: i + 1, points: r.weightedScore ?? 0 }))
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
      const isEndOfManche = next >= countriesWithDiffRef.current.length

      if (isEndOfManche) {
        await advanceChillTurn(roomId, 'review', next, mancheStart, null)
      } else {
        const { difficulty } = countriesWithDiffRef.current[next]
        const countdownMs = getCountdownMs(difficulty, chillTimers)
        await advanceChillTurn(roomId, 'playing', next, mancheStart, countdownMs)
      }
    }, ms + 300)

    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, chillState?.countdownEnd, chillState?.currentCountryIndex, chillState?.phase])

  // ─── Host : avancer sans timer quand tous les joueurs ont répondu ────────────
  useEffect(() => {
    if (!isHost || !chillState || chillState.phase !== 'playing' || !isNoTimerGame) return
    const idx = chillState.currentCountryIndex
    const advKey = `${gameIndex}-${idx}`
    if (noTimerAdvancedRef.current === advKey) return
    const activePlayers = Object.entries(room.players)
      .filter(([, p]) => !p.disconnected)
      .map(([id]) => id)
    if (!activePlayers.length) return
    const allAnswered = activePlayers.every(pid =>
      chillState.playerAnswers?.[pid]?.[String(idx)] != null
    )
    if (!allAnswered) return
    noTimerAdvancedRef.current = advKey
    const next = idx + 1
    const mancheStart = chillState.mancheStartIndex
    if (next >= countriesWithDiffRef.current.length) {
      advanceChillTurn(roomId, 'review', next, mancheStart, null)
    } else {
      advanceChillTurn(roomId, 'playing', next, mancheStart, null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, chillState?.playerAnswers, chillState?.currentCountryIndex, chillState?.phase])

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
      const countdownMs = isNoTimerGame ? null : getCountdownMs(countriesWithDiff[next].difficulty, chillTimers)
      advanceChillTurn(roomId, 'playing', next, next, countdownMs)
    }
  }, [isHost, chillState, totalCountries, countriesWithDiff, roomId, handleGameEnd, isNoTimerGame])

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

    const reviewProps = {
      mancheCountries,
      mancheStartIndex: mancheStart,
      playerAnswers: chillState.playerAnswers ?? {},
      reviewStep: chillState.reviewStep ?? 0,
      isHost,
      players: room.players,
      gameType: gameConfig.type,
      onNext: handleReviewNext,
      onContinue: handleReviewContinue,
    }
    return gameConfig.type === GAME_TYPES.PLACEMENT
      ? <ChillPlacementReview {...reviewProps} />
      : <ChillReview {...reviewProps} />
  }

  // Phase playing
  const { country: currentCountry, difficulty } = countriesWithDiff[chillState.currentCountryIndex] ?? {}
  if (!currentCountry) return null

  const alreadyAnswered = room.chillState?.playerAnswers?.[playerId]?.[String(chillState.currentCountryIndex)] != null
  const countdownMs = getCountdownMs(difficulty, chillTimers)

  // ─── Layout plein écran pour PLACEMENT ────────────────────────────────────
  if (gameConfig.type === GAME_TYPES.PLACEMENT) {
    const targetName = typeof currentCountry === 'string' ? currentCountry : currentCountry.properties?.ADMIN
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden', background: '#0f172a' }}>
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, minWidth: 340,
          background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)',
          border: '1px solid #1e293b', borderRadius: 12, padding: '10px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ color: '#94a3b8', fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Pays à trouver</span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{chillState.currentCountryIndex + 1} / {totalCountries}</span>
          </div>
          <div style={{ textAlign: 'center', color: '#f1f5f9', fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
            {targetName}
          </div>
          <ChillCountdown countdownEnd={chillState.countdownEnd} totalMs={countdownMs} />
        </div>
        <ChillPlacementInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          onSubmit={(clickedAdmin) => {
            const evalResult = evaluatePlacement(clickedAdmin, targetName, difficulty)
            handleSubmitAnswer({ clickedAdmin, ...evalResult })
          }}
        />
        {alreadyAnswered && (
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)',
            border: '1px solid #1e293b', borderRadius: 10, padding: '10px 24px',
            color: '#64748b', fontSize: '0.9rem', whiteSpace: 'nowrap',
          }}>
            ✓ Réponse envoyée — en attente des autres joueurs…
          </div>
        )}
      </div>
    )
  }

  // ─── Layout centré pour les jeux texte ────────────────────────────────────
  const renderTextInput = () => {
    if (gameConfig.type === GAME_TYPES.FLAGS) {
      const isoA2 = currentCountry.properties?.ISO_A2?.toLowerCase()
      const target = currentCountry.properties?.ADMIN
      const aliases = currentCountry.properties?.aliases ?? []
      return (
        <>
          {isoA2
            ? <img src={`/flags/${isoA2}.png`} alt={target ?? '?'} style={{ display: 'block', margin: '0 auto 16px', maxWidth: 200, borderRadius: 4 }} />
            : <div style={{ height: 80, marginBottom: 16 }} />
          }
          <ChillTextInput
            countdownEnd={chillState.countdownEnd}
            locked={alreadyAnswered}
            placeholder="Nom du pays…"
            onSubmit={(answer) => {
              const evalResult = evaluateTextAnswer(answer, target, aliases, difficulty)
              handleSubmitAnswer({ answer, ...evalResult })
            }}
          />
        </>
      )
    }

    if (gameConfig.type === GAME_TYPES.CAPITALS) {
      const isoA2 = currentCountry.properties?.ISO_A2?.toLowerCase()
      const countryName = currentCountry.properties?.ADMIN
      const target = currentCountry.properties?.capital ?? ''
      const aliases = currentCountry.properties?.capitalAliases ?? []
      return (
        <>
          {isoA2
            ? <img src={`/flags/${isoA2}.png`} alt={countryName ?? '?'} style={{ display: 'block', margin: '0 auto 8px', maxWidth: 200, borderRadius: 4 }} />
            : <div style={{ height: 80, marginBottom: 8 }} />
          }
          {countryName && (
            <p style={{ textAlign: 'center', color: '#f1f5f9', fontWeight: 600, fontSize: '1.1rem', marginBottom: 16 }}>
              {countryName}
            </p>
          )}
          <ChillTextInput
            countdownEnd={chillState.countdownEnd}
            locked={alreadyAnswered}
            placeholder="Nom de la capitale…"
            onSubmit={(answer) => {
              const evalResult = evaluateTextAnswer(answer, target, aliases, difficulty)
              handleSubmitAnswer({ answer, ...evalResult })
            }}
          />
        </>
      )
    }

    if (gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE) {
      return (
        <>
          {gameConfig.type === GAME_TYPES.BORDER_GUESS
            ? <BorderGuessDisplay country={currentCountry} />
            : <CountryClueDisplay country={currentCountry} />
          }
          <ChillGuessInput
            key={chillState.currentCountryIndex}
            country={currentCountry}
            locked={alreadyAnswered}
            onSubmit={(result) => handleSubmitAnswer(result)}
          />
        </>
      )
    }

    return <div style={{ color: '#ef4444' }}>Type de jeu non supporté en mode chill.</div>
  }

  return (
    <div style={{ padding: '16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: 8, fontSize: '0.85em' }}>
        <span>Pays {chillState.currentCountryIndex + 1} / {totalCountries}</span>
      </div>
      {!isNoTimerGame && <ChillCountdown countdownEnd={chillState.countdownEnd} totalMs={countdownMs} />}
      <div style={{ marginTop: 16 }}>
        {renderTextInput()}
      </div>
      {alreadyAnswered && (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 12, fontSize: '0.9em' }}>
          ✓ Réponse envoyée — en attente des autres joueurs…
        </p>
      )}
    </div>
  )
}
