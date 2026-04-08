// src/components/multiplayer/CountdownOverlay.jsx
import React, { useState, useEffect, useRef } from 'react'
import './CountdownOverlay.css'

export default function CountdownOverlay({ startAt, onStart }) {
  const [count, setCount] = useState(null)
  const onStartRef = useRef(onStart)
  onStartRef.current = onStart

  useEffect(() => {
    if (!startAt) return

    const startTime = startAt.toDate ? startAt.toDate() : new Date(startAt)

    let timeoutId

    const tick = () => {
      const remaining = Math.ceil((startTime - Date.now()) / 1000)
      if (remaining <= 0) {
        setCount(null)
        onStartRef.current()
        return
      }
      setCount(remaining)
      timeoutId = setTimeout(tick, 200)
    }

    tick()
    return () => clearTimeout(timeoutId)
  }, [startAt])

  if (count === null) return null

  return (
    <div className="countdown-overlay" aria-live="polite">
      <div className="countdown-number">{count}</div>
    </div>
  )
}
