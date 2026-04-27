// src/components/multiplayer/chill/ChillCountdown.jsx
import { useState, useEffect } from 'react'

/**
 * Barre de progression synchronisée sur countdownStart/countdownEnd (Firestore Timestamps).
 * totalMs est utilisé comme fallback si countdownStart est absent.
 */
export default function ChillCountdown({ countdownStart, countdownEnd, totalMs }) {
  const [remaining, setRemaining] = useState(totalMs)
  const [effectiveTotalMs, setEffectiveTotalMs] = useState(totalMs)

  useEffect(() => {
    if (!countdownEnd) return
    const endMs = typeof countdownEnd.toMillis === 'function'
      ? countdownEnd.toMillis()
      : Number(countdownEnd)

    const startMs = countdownStart
      ? (typeof countdownStart.toMillis === 'function' ? countdownStart.toMillis() : Number(countdownStart))
      : null

    const total = startMs != null ? endMs - startMs : totalMs
    setEffectiveTotalMs(total)

    const tick = () => setRemaining(Math.max(0, endMs - Date.now()))
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [countdownStart, countdownEnd, totalMs])

  const pct = effectiveTotalMs > 0 ? (remaining / effectiveTotalMs) * 100 : 0
  const seconds = Math.ceil(remaining / 1000)
  const color = pct > 40 ? '#22c55e' : pct > 15 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      <div style={{
        width: '100%', height: 8,
        background: '#1e293b', borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.1s linear, background 0.3s',
        }} />
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: '0.75em',
        color: '#94a3b8',
        marginTop: 2,
      }}>
        {seconds}s
      </div>
    </div>
  )
}
