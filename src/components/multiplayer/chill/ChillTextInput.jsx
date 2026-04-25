// src/components/multiplayer/chill/ChillTextInput.jsx
import { useState, useEffect, useRef } from 'react'

/**
 * Input texte sans validation temps réel.
 * Stocke la valeur localement et auto-soumet quand countdownEnd est atteint.
 * Utilise un ref pour éviter les closures périmées dans le setTimeout.
 *
 * @param {{
 *   onSubmit: (value: string) => void,
 *   countdownEnd: import('firebase/firestore').Timestamp | number,
 *   locked: boolean,
 *   placeholder?: string,
 * }} props
 */
export default function ChillTextInput({ onSubmit, countdownEnd, locked, placeholder = 'Écris ta réponse…' }) {
  const [value, setValue] = useState('')
  const valueRef = useRef('')
  const submitted = useRef(false)

  // Réinitialiser à chaque nouveau pays (nouveau countdownEnd)
  useEffect(() => {
    setValue('')
    valueRef.current = ''
    submitted.current = false
  }, [countdownEnd])

  // Auto-soumettre à countdownEnd
  useEffect(() => {
    if (!countdownEnd) return
    const endMs = typeof countdownEnd.toMillis === 'function'
      ? countdownEnd.toMillis()
      : Number(countdownEnd)
    const ms = Math.max(0, endMs - Date.now())
    const id = setTimeout(() => {
      if (!submitted.current) {
        submitted.current = true
        onSubmit(valueRef.current)
      }
    }, ms)
    return () => clearTimeout(id)
  }, [countdownEnd, onSubmit])

  const handleChange = (e) => {
    if (locked || submitted.current) return
    setValue(e.target.value)
    valueRef.current = e.target.value
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      disabled={locked || submitted.current}
      placeholder={locked ? '⏳ En attente…' : placeholder}
      autoFocus
      style={{
        width: '100%',
        padding: '10px 14px',
        fontSize: '1rem',
        borderRadius: 8,
        border: `2px solid ${locked ? '#334155' : '#3b82f6'}`,
        background: '#0f172a',
        color: locked ? '#64748b' : '#f1f5f9',
        outline: 'none',
        transition: 'border-color 0.2s',
      }}
    />
  )
}
