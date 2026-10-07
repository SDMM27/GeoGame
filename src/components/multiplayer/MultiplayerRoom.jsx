// src/components/multiplayer/MultiplayerRoom.jsx
// A multiplayer room, created on the website or in the mobile app: one game, 'live' (everyone starts together)
// or 'challenge' (play whenever). Join with a username, lobby and countdown (live), play, then the live standings.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { GAME_TYPES } from '../../utils/gameTypes'
import { PSEUDO_STORAGE_KEY, getSavedPseudo } from '../../utils/account'
import { formatTime } from '../../utils/formatTime'
import { serverNow } from '../../utils/serverTime'
import { snapshotKey } from '../../utils/multiplayerSnapshot'
import {
  getRoomContent,
  joinRoom,
  launchRoom,
  rankRoomResults,
  reportProgress,
  roomScoringMode,
  submitResult,
} from '../../utils/multiplayerRoom'
import useLobbyHost from '../../hooks/useLobbyHost'
import { MultiplayerPlacementGame } from '../../pages/GamePage'
import { MultiplayerFlagsGame } from '../../pages/FlagGamePage'
import { MultiplayerCapitalsGame } from '../../pages/CapitalsGamePage'
import { PracticeQuiz } from '../../pages/QuizPage'
import MultiplayerBorderGuess from './MultiplayerBorderGuess'
import MultiplayerCountryClue from './MultiplayerCountryClue'
import './MultiplayerRoom.css'

const GAME_ICONS = {
  placement: '🌍',
  flags: '🚩',
  capitals: '🏛️',
  border_guess: '🧩',
  country_clue: '🧭',
  quiz: '❓',
}

const PLAYABLE_TYPES = [
  GAME_TYPES.PLACEMENT,
  GAME_TYPES.FLAGS,
  GAME_TYPES.CAPITALS,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.COUNTRY_CLUE,
  GAME_TYPES.QUIZ,
]

const MEDALS = ['🥇', '🥈', '🥉']

// Time left before a live start, on the server's clock.
function useCountdown(startAt) {
  const [, setTick] = useState(0)
  const remaining = startAt != null ? Math.max(0, startAt - serverNow()) : null
  const running = remaining != null && remaining > 0
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((tick) => tick + 1), 200)
    return () => clearInterval(id)
  }, [running])
  return remaining
}

function gameSettings(game, t) {
  if (game.phases) return 'Ascension'
  if (game.continent) return t(`continents.${game.continent}`, game.continent)
  if (game.difficulty) return t(`difficulties.${game.difficulty}`, game.difficulty)
  if (game.quizDifficulty) return t(`difficulties.${game.quizDifficulty}`, game.quizDifficulty)
  return null
}

function resultLine(game, result, t) {
  const time = formatTime(result.elapsedTime ?? 0).slice(0, 5)
  if (roomScoringMode(game) === 'solved') {
    return `${result.countriesSolved}/${result.total} · ${t('mp_room.errors', { count: result.attempts })} · ${time}`
  }
  return `${Math.round(result.weightedScore)} ${t('units.pts')} · ${time}`
}

function JoinForm({ room, playerId }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  // Signed in: the account's username until the player types another one
  const [typed, setTyped] = useState(null)
  const pseudo = typed ?? account?.username ?? getSavedPseudo()
  const [joining, setJoining] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    const name = pseudo.trim()
    if (!name) return
    setJoining(true)
    try {
      try {
        localStorage.setItem(PSEUDO_STORAGE_KEY, name)
      } catch {
        // Storage unavailable — prefill is only a convenience.
      }
      await joinRoom(room.id, playerId, name, account?.uid)
    } catch (err) {
      console.error(err)
      setJoining(false)
    }
  }

  return (
    <form className="mpr-card" onSubmit={onSubmit}>
      <p className="mpr-muted">{t('mp_room.join_hint')}</p>
      <input
        className="mpr-input"
        placeholder={t('placeholders.username')}
        value={pseudo}
        onChange={(e) => setTyped(e.target.value)}
        maxLength={20}
        autoFocus
      />
      <button type="submit" className="mpr-btn" disabled={!pseudo.trim() || joining}>
        {joining ? t('lobby.connecting') : t('mp_room.join')}
      </button>
    </form>
  )
}

function Players({ room, playerId }) {
  const { t } = useTranslation()
  const players = Object.entries(room.players)
  return (
    <div className="mpr-card">
      <h3>{t('mp_room.players', { count: players.length })}</h3>
      <ul className="mpr-list">
        {players.map(([id, player]) => (
          <li key={id} className={`mpr-row${id === playerId ? ' mpr-row--me' : ''}`}>
            <span className="mpr-name">
              {player.pseudo}
              {id === playerId && ` (${t('mp_room.you')})`}
            </span>
            {id === room.hostId && <span className="mpr-badge">{t('mp_room.host')}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Standings({ room, progress, gameResults, playerId }) {
  const { t } = useTranslation()
  const results = Object.values(gameResults)
  const ranked = rankRoomResults(room.game, results)
  const finishedIds = new Set(results.map((result) => result.playerId))
  const others = Object.entries(room.players).filter(([id]) => !finishedIds.has(id))

  return (
    <div className="mpr-card">
      <h3>{t('mp_room.standings')}</h3>
      <ul className="mpr-list">
        {ranked.map((result, index) => (
          <li
            key={result.playerId}
            className={`mpr-row${index < 3 ? ' mpr-row--top' : ''}${result.playerId === playerId ? ' mpr-row--me' : ''}`}
          >
            <span className="mpr-rank">{MEDALS[result.rank - 1] ?? result.rank}</span>
            <span className="mpr-name">
              {result.pseudo}
              {result.playerId === playerId && ` (${t('mp_room.you')})`}
            </span>
            <span className="mpr-score">{resultLine(room.game, result, t)}</span>
          </li>
        ))}
        {others.map(([id, player]) => {
          const live = progress[id]
          return (
            <li key={id} className="mpr-row mpr-row--waiting">
              <span className="mpr-rank">{live ? '⏳' : '·'}</span>
              <span className="mpr-name">
                {player.pseudo}
                {id === playerId && ` (${t('mp_room.you')})`}
              </span>
              <span className="mpr-score">
                {live ? `${t('mp_room.playing')} · ${live.found ?? 0}/${live.total ?? '?'}` : t('mp_room.not_played')}
              </span>
            </li>
          )
        })}
      </ul>
      {ranked.length === 0 && others.length === 0 && <p className="mpr-muted">{t('mp_room.no_players')}</p>}
    </div>
  )
}

function RoomGame({ room, progress, gameResults, playerId, onDone }) {
  const { game, seed } = room
  const content = useMemo(() => getRoomContent(game, seed), [game, seed])
  const { total } = content
  const doneRef = useRef(false)
  const foundRef = useRef(0)
  const pseudo = room.players[playerId]?.pseudo ?? '?'

  // Announce the player as soon as the game starts
  useEffect(() => {
    reportProgress(room.id, playerId, { found: 0, total, finished: false }).catch(console.error)
  }, [room.id, playerId, total])

  const reportFound = useCallback((found) => {
    if (doneRef.current) return
    foundRef.current = found
    reportProgress(room.id, playerId, { found, total, finished: false }).catch(console.error)
  }, [room.id, playerId, total])

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
      submitResult(room.id, playerId, pseudo, result),
      reportProgress(room.id, playerId, { found: solved, total, finished: true }),
    ])
      .catch(console.error)
      .finally(onDone)
  }, [game, room.id, playerId, pseudo, total, onDone])

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
    gameIndex: 0,
  }
  // Players time their own game, from when they start it
  const ownClock = { ...room, startAt: null }
  const snapKey = snapshotKey(room.id, playerId, 0)

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
        <Standings room={room} progress={progress} gameResults={gameResults} playerId={playerId} />
      </aside>
    </div>
  )
}

export default function MultiplayerRoom({ room, progress, gameResults, playerId }) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [copied, setCopied] = useState(false)
  const sawCountdownRef = useRef(false)
  useLobbyHost(room, playerId)

  const startAt = room.startAt?.toMillis ? room.startAt.toMillis() : null
  const remaining = useCountdown(startAt)
  const joined = playerId in room.players
  const hasPlayed = done || Object.values(gameResults).some((result) => result.playerId === playerId)
  const playable = PLAYABLE_TYPES.includes(room.game?.type)
  const onDone = useCallback(() => {
    setDone(true)
    setPlaying(false)
  }, [])

  // Live: start together when the countdown reaches zero (only for players who were waiting for it)
  useEffect(() => {
    if (remaining != null && remaining > 0 && joined && !hasPlayed) sawCountdownRef.current = true
    else if (remaining === 0 && sawCountdownRef.current && !hasPlayed && playable) {
      sawCountdownRef.current = false
      setPlaying(true)
    }
  }, [remaining, joined, hasPlayed, playable])

  if (playing && joined && !hasPlayed) {
    return <RoomGame room={room} progress={progress} gameResults={gameResults} playerId={playerId} onDone={onDone} />
  }

  const settings = gameSettings(room.game, t)
  const counting = !hasPlayed && remaining != null && remaining > 0
  const isHost = room.hostId === playerId

  const onLaunch = async () => {
    setLaunching(true)
    try {
      await launchRoom(room.id)
    } catch (err) {
      console.error(err)
    }
    setLaunching(false)
  }

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/multiplayer/room/${room.id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable: the code stays on screen.
    }
  }

  return (
    <div className="mpr">
      <header className="mpr-header">
        <span className="mpr-label">
          {t('multiplayer.title')} · {t(room.mode === 'live' ? 'mp_room.live' : 'mp_room.challenge')}
        </span>
        <h2>
          {GAME_ICONS[room.game.id] ?? '🎮'} {t(`games.${room.game.id}.title`)}
          {settings && <small> · {settings}</small>}
        </h2>
        {room.createdOn !== 'web' && <p className="mpr-muted">📱 {t('mp_room.from_app')}</p>}
      </header>

      <div className="mpr-card mpr-code">
        <span className="mpr-label">{t('mp_room.code')}</span>
        <code>{room.id}</code>
        <button type="button" className="mpr-link-btn" onClick={onCopyLink}>
          {copied ? `✓ ${t('mp_room.link_copied')}` : `🔗 ${t('mp_room.copy_link')}`}
        </button>
      </div>

      {!playable ? (
        <p className="mpr-card mpr-muted">{t('mp_room.unsupported')}</p>
      ) : !joined ? (
        <JoinForm room={room} playerId={playerId} />
      ) : room.status === 'lobby' ? (
        <>
          <Players room={room} playerId={playerId} />
          {isHost ? (
            <button type="button" className="mpr-btn" onClick={onLaunch} disabled={launching}>
              ▶ {t('mp_room.launch')}
            </button>
          ) : (
            <p className="mpr-waiting">{t('mp_room.waiting_host')}</p>
          )}
        </>
      ) : counting ? (
        <div className="mpr-countdown">
          <span className="mpr-label">{t('mp_room.starting_in')}</span>
          <strong key={Math.ceil(remaining / 1000)}>{Math.ceil(remaining / 1000)}</strong>
        </div>
      ) : (
        <>
          {hasPlayed ? (
            <p className="mpr-finished">✓ {t('mp_room.finished')}</p>
          ) : (
            <div className="mpr-card">
              <p className="mpr-muted">
                {t(room.mode === 'live' ? 'mp_room.late_hint' : 'mp_room.challenge_play_hint')}
              </p>
              <button type="button" className="mpr-btn" onClick={() => setPlaying(true)}>
                ▶ {t('mp_room.play')}
              </button>
            </div>
          )}
          <Standings room={room} progress={progress} gameResults={gameResults} playerId={playerId} />
        </>
      )}
    </div>
  )
}
