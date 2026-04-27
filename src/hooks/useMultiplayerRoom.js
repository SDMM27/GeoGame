// src/hooks/useMultiplayerRoom.js
import { useState, useEffect } from 'react'
import { doc, collection, onSnapshot } from 'firebase/firestore'
import { firestore } from '../Firebase'

/**
 * S'abonne à la room et à la subcollection progress via onSnapshot.
 * Retourne { room, progress, gameResults, loading, error }.
 *
 * - room       : document rooms/{roomId}
 * - progress   : { [playerId]: progressData }
 * - gameResults: { [`${gameIndex}_${playerId}`]: resultData }
 */
export default function useMultiplayerRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [progress, setProgress] = useState({})
  const [gameResults, setGameResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!roomId) return

    setLoading(true)
    setError(null)

    const unsubRoom = onSnapshot(
      doc(firestore, 'rooms', roomId),
      (snap) => {
        if (snap.exists()) {
          setRoom({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) })
        } else {
          setError('Room introuvable.')
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    const unsubProgress = onSnapshot(
      collection(firestore, 'rooms', roomId, 'progress'),
      (snap) => {
        const map = {}
        snap.docs.forEach(d => { map[d.id] = d.data() })
        setProgress(map)
      }
    )

    const unsubResults = onSnapshot(
      collection(firestore, 'rooms', roomId, 'gameResults'),
      (snap) => {
        const map = {}
        snap.docs.forEach(d => { map[d.id] = d.data() })
        setGameResults(map)
      }
    )

    return () => {
      unsubRoom()
      unsubProgress()
      unsubResults()
    }
  }, [roomId])

  return { room, progress, gameResults, loading, error }
}
