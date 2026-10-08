// src/hooks/useLobbyHost.js
// In a live lobby: sends the player's heartbeat, and takes over the host role when the host is gone.
// Shared by the website and the mobile app.
import { useEffect, useRef } from 'react'
import { serverNow } from '../utils/serverTime'
import { HEARTBEAT_MS, pickNewHost, touchPlayer, transferHost } from '../utils/multiplayerRoom'

export default function useLobbyHost(room, playerId) {
  const roomRef = useRef(room)
  roomRef.current = room
  const code = room?.id
  const active = room?.status === 'lobby' && !!room.players?.[playerId]

  useEffect(() => {
    if (!active) return
    const tick = () => {
      touchPlayer(code, playerId).catch(console.error)
      if (pickNewHost(roomRef.current, serverNow()) === playerId) transferHost(code, playerId).catch(console.error)
    }
    tick()
    const id = setInterval(tick, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [active, code, playerId])
}
