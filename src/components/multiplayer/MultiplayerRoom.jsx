// src/components/multiplayer/MultiplayerRoom.jsx
// A multiplayer room, created on the website or in the mobile app: one or more games in a row.
// 'live': everyone starts each game together when the host launches it. 'challenge': everyone plays the games in
// order, whenever they want. Join with a username, lobby and countdown (live), play, then the standings.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TYPES } from '../../utils/gameTypes'
import {
  currentGameIndex,
  launchNextGame,
  launchRoom,
  nextGameToPlay,
  roomForGame,
  roomGames,
} from '../../utils/multiplayerRoom'
import useLobbyHost from '../../hooks/useLobbyHost'
import { gameLabel } from './RoomConfig'
import AddGame from './room/AddGame'
import GameList from './room/GameList'
import InviteFriends from './room/InviteFriends'
import JoinForm from './room/JoinForm'
import Players from './room/Players'
import RoomGame from './room/RoomGame'
import { StandingsCard } from './room/Standings'
import useCountdown from './room/useCountdown'
import './RoomConfig.css'
import './MultiplayerRoom.css'

export { Standings } from './room/Standings'

const PLAYABLE_TYPES = [
  GAME_TYPES.PLACEMENT,
  GAME_TYPES.FLAGS,
  GAME_TYPES.CAPITALS,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.COUNTRY_CLUE,
  GAME_TYPES.QUIZ,
  GAME_TYPES.SURVIVAL,
]

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
          <InviteFriends room={room} />
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
          {room.mode === 'challenge' && <InviteFriends room={room} />}
          <Players room={room} playerId={playerId} strangersOnly />
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
