// Text that lands letter by letter like an airport split-flap board: the letters spin through the alphabet, then
// settle from left to right. Screen readers get the plain text; reduced motion shows it at once.
import React, { useEffect, useState } from 'react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function FlapText({ text, delay = 0, duration = 900, className = '', active = true }) {
  const [shown, setShown] = useState(() => (reduced() ? text : ''))

  useEffect(() => {
    if (!active || reduced()) {
      setShown(text)
      return undefined
    }
    let frame = 0
    let start = null
    const tick = (now) => {
      start ??= now
      const k = (now - start - delay) / duration
      if (k >= 1) {
        setShown(text)
        return
      }
      const settled = Math.max(0, Math.floor(text.length * k))
      const spin = Math.floor((now - start) / 45)
      setShown(
        [...text]
          .map((ch, i) => (i < settled || /[\s·.\-'’]/.test(ch) ? ch : GLYPHS[(i * 7 + spin) % GLYPHS.length]))
          .join(''),
      )
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, delay, duration, active])

  return (
    <span className={`flap-text ${className}`.trim()}>
      <span className="flap-text-visual" aria-hidden="true">{!active || reduced() ? text : shown || ' '}</span>
      <span className="gg-sr-only">{text}</span>
    </span>
  )
}
