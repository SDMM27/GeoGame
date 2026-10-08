// src/components/multiplayer/MultiplayerRoom.jsx
// A multiplayer room, created on the website or in the mobile app: one or more games in a row.
// 'live': everyone starts each game together when the host launches it. 'challenge': everyone plays the games in
// order, whenever they want. Join with a username, lobby and countdown (live), play, then the standings.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { GAME_TYPES } from '../../utils/gameTypes'
import { PSEUDO_STORAGE_KEY, getSavedPseudo } from '../../utils/account'
import { formatTime } from '../../utils/formatTime'
import { serverNow } from '../../utils/serverTime'
import { snapshotKey } from '../../utils/multiplayerSnapshot'
import {
  addGame,
  currentGameIndex,
  getRoomContent,
  joinRoom,
  launchNextGame,
  launchRoom,
  nextGameToPlay,
  overallStandings,
  progressForGame,
  rankRoomResults,
  reportProgress,
  resultsForGame,
  roomForGame,
  roomGames,
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
import { GameEditor, buildRoomGame, draftReady, gameLabel, newDraft } from './RoomConfig'
import './RoomConfig.css'
import './MultiplayerRoom.css'

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

/** Standings of game `index`: results, then the players still playing it or who did not play it yet. */
export function Standings({ room, progress, results, playerId, index }) {
  const { t } = useTranslation()
  const game = roomGames(room)[index]
  const ranked = rankRoomResults(game, resultsForGame(results, index))
  const live = progressForGame(progress, index)
  const finishedIds = new Set(ranked.map((result) => result.playerId))
  const others = Object.entries(room.players).filter(([id]) => !finishedIds.has(id))

  return (
    <ul className="mpr-list">
      {ranked.map((result, i) => (
        <li
          key={result.playerId}
          className={`mpr-row${i < 3 ? ' mpr-row--top' : ''}${result.playerId === playerId ? ' mpr-row--me' : ''}`}
        >
          <span className="mpr-rank">{MEDALS[result.rank - 1] ?? result.rank}</span>
          <span className="mpr-name">
            {result.pseudo}
            {result.playerId === playerId && ` (${t('mp_room.you')})`}
          </span>
          <span className="mpr-score">{resultLine(game, result, t)}</span>
        </li>
      ))}
      {others.map(([id, player]) => (
        <li key={id} className="mpr-row mpr-row--waiting">
          <span className="mpr-rank">{live[id] ? '⏳' : '·'}</span>
          <span className="mpr-name">
            {player.pseudo}
            {id === playerId && ` (${t('mp_room.you')})`}
          </span>
          <span className="mpr-score">
            {live[id] ? `${t('mp_room.playing')} · ${live[id].found ?? 0}/${live[id].total ?? '?'}` : t('mp_room.not_played')}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Points over every game. */
function OverallStandings({ room, results, playerId }) {
  const { t } = useTranslation()
  const total = roomGames(room).length
  return (
    <ul className="mpr-list">
      {overallStandings(room, results).map((entry, i) => (
        <li
          key={entry.playerId}
          className={`mpr-row${i < 3 ? ' mpr-row--top' : ''}${entry.playerId === playerId ? ' mpr-row--me' : ''}`}
        >
          <span className="mpr-rank">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
          <span className="mpr-name">
            {entry.pseudo}
            {entry.playerId === playerId && ` (${t('mp_room.you')})`}
          </span>
          <span className="mpr-score">
            {t('mp_room.points', { count: entry.points })} · {entry.played}/{total}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Overall standings and each game's, one tab each. */
function StandingsCard({ room, progress, results, playerId, defaultTab }) {
  const { t } = useTranslation()
  const games = roomGames(room)
  const [tab, setTab] = useState(defaultTab)
  const shown = games.length === 1 ? 0 : tab

  return (
    <div className="mpr-card">
      <h3>{t('mp_room.standings')}</h3>
      {games.length > 1 && (
        <div className="mpr-tabs">
          <button type="button" className={shown === 'overall' ? 'active' : ''} onClick={() => setTab('overall')}>
            {t('mp_room.overall')}
          </button>
          {games.map((_, i) => (
            <button key={i} type="button" className={shown === i ? 'active' : ''} onClick={() => setTab(i)}>
              {t('mp_room.game_n', { n: i + 1 })}
            </button>
          ))}
        </div>
      )}
      {shown === 'overall' ? (
        <OverallStandings room={room} results={results} playerId={playerId} />
      ) : (
        <Standings room={room} progress={progress} results={results} playerId={playerId} index={shown} />
      )}
      {Object.keys(room.players).length === 0 && <p className="mpr-muted">{t('mp_room.no_players')}</p>}
    </div>
  )
}

/** The room's games, with the player's progress through them. */
function GameList({ room, results, playerId }) {
  const { t } = useTranslation()
  const games = roomGames(room)
  const current = currentGameIndex(room)
  const played = new Set(results.filter((result) => result.playerId === playerId).map((result) => result.gameIndex ?? 0))
  return (
    <ol className="mpr-games">
      {games.map((game, i) => {
        const isCurrent = room.mode === 'live' && room.status === 'playing' && i === current
        return (
          <li key={i} className={`${isCurrent ? 'mpr-games--current' : ''}${played.has(i) ? ' mpr-games--done' : ''}`}>
            <span className="mpr-games-n">{played.has(i) ? '✓' : i + 1}</span>
            <span>{gameLabel(game, t)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Host: adds a game at the end of the room. */
function AddGame({ room, playerId }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!draft) {
    return (
      <button type="button" className="rc-add-btn" onClick={() => setDraft(newDraft())}>
        + {t('mp_room.add_game')}
      </button>
    )
  }
  const onAdd = async () => {
    setSaving(true)
    try {
      await addGame(room, buildRoomGame(draft), playerId)
      setDraft(null)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }
  return (
    <div className="mpr-card">
      <h3>{t('mp_room.game_n', { n: roomGames(room).length + 1 })}</h3>
      <GameEditor draft={draft} onChange={setDraft} />
      <div className="mpr-actions">
        <button type="button" className="mpr-btn" onClick={onAdd} disabled={saving || !draftReady(draft)}>
          {t('mp_room.add_game')}
        </button>
        <button type="button" className="mpr-link-btn" onClick={() => setDraft(null)}>
          {t('mp_room.cancel')}
        </button>
      </div>
    </div>
  )
}

function RoomGame({ room, progress, results, playerId, onDone }) {
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

export default function MultiplayerRoom({ room, progress, gameResults, playerId }) {
  const { t } = useTranslation()
  const [playingIndex, setPlayingIndex] = useState(null)
  // Games finished here whose result may not be back from Firestore yet
  const [doneHere, setDoneHere] = useState([])
  const [launching, setLaunching] = useState(false)
  const [copied, setCopied] = useState(false)
  const sawCountdownRef = useRef(null)
  useLobbyHost(room, playerId)

  const games = roomGames(room)
  const current = currentGameIndex(room)
  const results = useMemo(() => Object.values(gameResults), [gameResults])
  const known = useMemo(
    () => [...results, ...doneHere.map((gameIndex) => ({ playerId, gameIndex }))],
    [results, doneHere, playerId]
  )
  const startAt = room.startAt?.toMillis ? room.startAt.toMillis() : null
  const remaining = useCountdown(startAt)
  const joined = playerId in room.players
  const isHost = room.hostId === playerId
  const toPlay = joined ? nextGameToPlay(room, known, playerId) : null
  const playable = (index) => PLAYABLE_TYPES.includes(games[index]?.type)
  const onDone = useCallback((index) => {
    setDoneHere((previous) => [...previous, index])
    setPlayingIndex(null)
  }, [])

  // Live: start together when the countdown of a game reaches zero (only for players who were waiting for it)
  useEffect(() => {
    if (room.mode !== 'live' || toPlay !== current) return
    if (remaining != null && remaining > 0) sawCountdownRef.current = startAt
    else if (remaining === 0 && sawCountdownRef.current === startAt && playable(current)) {
      sawCountdownRef.current = null
      setPlayingIndex(current)
    }
  })

  if (playingIndex != null && joined) {
    return (
      <RoomGame
        key={playingIndex}
        room={roomForGame(room, playingIndex)}
        progress={progress}
        results={results}
        playerId={playerId}
        onDone={onDone}
      />
    )
  }

  const counting = room.mode === 'live' && toPlay === current && remaining != null && remaining > 0
  const allPlayed = joined && toPlay == null && room.status === 'playing'
  const hasNextLive = room.mode === 'live' && room.status === 'playing' && current < games.length - 1

  const onLaunch = async (launch) => {
    setLaunching(true)
    try {
      await launch()
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
        <h2>{games.length === 1 ? gameLabel(games[0], t) : t('mp_room.n_games', { count: games.length })}</h2>
        {room.createdOn !== 'web' && <p className="mpr-muted">📱 {t('mp_room.from_app')}</p>}
      </header>

      {games.length > 1 && <GameList room={room} results={known} playerId={playerId} />}

      <div className="mpr-card mpr-code">
        <span className="mpr-label">{t('mp_room.code')}</span>
        <code>{room.id}</code>
        <button type="button" className="mpr-link-btn" onClick={onCopyLink}>
          {copied ? `✓ ${t('mp_room.link_copied')}` : `🔗 ${t('mp_room.copy_link')}`}
        </button>
      </div>

      {!joined ? (
        <JoinForm room={room} playerId={playerId} />
      ) : room.status === 'lobby' ? (
        <>
          <Players room={room} playerId={playerId} />
          {isHost ? (
            <>
              <AddGame room={room} playerId={playerId} />
              <button type="button" className="mpr-btn" onClick={() => onLaunch(() => launchRoom(room.id, playerId))} disabled={launching}>
                ▶ {t('mp_room.launch')}
              </button>
            </>
          ) : (
            <p className="mpr-waiting">{t('mp_room.waiting_host')}</p>
          )}
        </>
      ) : counting ? (
        <div className="mpr-countdown">
          <span className="mpr-label">
            {games.length > 1 ? `${t('mp_room.game_n', { n: current + 1 })} · ` : ''}{t('mp_room.starting_in')}
          </span>
          <strong key={Math.ceil(remaining / 1000)}>{Math.ceil(remaining / 1000)}</strong>
        </div>
      ) : (
        <>
          {toPlay != null && (
            <div className="mpr-card">
              <p className="mpr-muted">
                {games.length > 1 && <strong>{t('mp_room.game_n', { n: toPlay + 1 })} · {gameLabel(games[toPlay], t)}<br /></strong>}
                {t(room.mode === 'live' ? 'mp_room.late_hint' : 'mp_room.challenge_play_hint')}
              </p>
              {playable(toPlay) ? (
                <button type="button" className="mpr-btn" onClick={() => setPlayingIndex(toPlay)}>
                  ▶ {t('mp_room.play')}
                </button>
              ) : (
                <p className="mpr-muted">{t('mp_room.unsupported')}</p>
              )}
            </div>
          )}
          {toPlay == null && room.mode === 'live' && hasNextLive && !isHost && (
            <p className="mpr-waiting">{t('mp_room.waiting_next')}</p>
          )}
          {allPlayed && !hasNextLive && <p className="mpr-finished">✓ {t('mp_room.finished')}</p>}
          {isHost && hasNextLive && (
            <button type="button" className="mpr-btn" onClick={() => onLaunch(() => launchNextGame(room, playerId))} disabled={launching}>
              ▶ {t('mp_room.next_game', { n: current + 2 })} · {gameLabel(games[current + 1], t)}
            </button>
          )}
          {isHost && <AddGame room={room} playerId={playerId} />}
          <StandingsCard
            room={room}
            progress={progress}
            results={results}
            playerId={playerId}
            defaultTab={games.length > 1 ? 'overall' : 0}
          />
        </>
      )}
    </div>
  )
}
