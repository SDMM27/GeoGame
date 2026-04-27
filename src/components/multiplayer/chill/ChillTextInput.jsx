// src/components/multiplayer/chill/ChillTextInput.jsx
import { useState, useEffect, useRef } from 'react'
import { serverNow } from '../../../utils/serverTime'

export default function ChillTextInput({ onSubmit, countdownEnd, locked, placeholder = 'Écris ta réponse…' }) {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const valueRef = useRef('')
  const onSubmitRef = useRef(onSubmit)
  const inputRef = useRef(null)
  const hasTimer = !!countdownEnd

  // Use a primitive ms value so Firebase re-creating the Timestamp object
  // on every room update doesn't falsely trigger re-init/timer effects
  const countdownEndMs = countdownEnd
    ? (typeof countdownEnd.toMillis === 'function' ? countdownEnd.toMillis() : Number(countdownEnd))
    : null

  // Garder onSubmitRef synchronisé sans invalider les effets du timer
  useEffect(() => {
    onSubmitRef.current = onSubmit
  })

  // Réinitialiser quand countdownEndMs change (nouveau pays)
  useEffect(() => {
    setValue('')
    valueRef.current = ''
    setSubmitted(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [countdownEndMs])

  // Auto-soumettre à countdownEnd
  useEffect(() => {
    if (!countdownEndMs) return
    const ms = Math.max(0, countdownEndMs - serverNow())
    const id = setTimeout(() => {
      let shouldSubmit = false
      setSubmitted(prev => {
        if (prev) return prev
        shouldSubmit = true
        return true
      })
      if (shouldSubmit) onSubmitRef.current(valueRef.current)
    }, ms)
    return () => clearTimeout(id)
  }, [countdownEndMs])

  const doSubmit = () => {
    if (submitted || locked) return
    setSubmitted(true)
    onSubmit(valueRef.current)
  }

  const handleChange = (e) => {
    if (locked || submitted) return
    setValue(e.target.value)
    valueRef.current = e.target.value
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') doSubmit()
  }

  const isDisabled = locked || submitted
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        placeholder={locked ? '⏳ En attente…' : placeholder}
        autoFocus
        style={{
          flex: 1,
          padding: '10px 14px',
          fontSize: '1rem',
          borderRadius: 8,
          border: `2px solid ${isDisabled ? '#334155' : '#3b82f6'}`,
          background: '#0f172a',
          color: isDisabled ? '#64748b' : '#f1f5f9',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
      {!hasTimer && (
        <button
          onClick={doSubmit}
          disabled={isDisabled}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: isDisabled ? '#1e293b' : '#3b82f6',
            color: isDisabled ? '#64748b' : '#fff',
            fontSize: '1rem',
            cursor: isDisabled ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >→</button>
      )}
    </div>
  )
}
