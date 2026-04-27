// src/components/multiplayer/chill/ChillGuessInput.jsx
import { useEffect, useRef } from 'react'
import { ToastContainer } from 'react-toastify'
import useBorderGuessState from '../../../hooks/useBorderGuessState'
import 'react-toastify/dist/ReactToastify.css'

export default function ChillGuessInput({ country, locked, onSubmit }) {
  const lockedAtMount = useRef(locked)
  const submittedRef = useRef(false)
  const inputRef = useRef(null)

  const {
    inputValue, setInputValue,
    guesses, isSolved, isComplete, answerName,
    filteredCountrySuggestions,
    handleSubmit, revealCountry,
  } = useBorderGuessState('daily', { overrideCountry: country })

  useEffect(() => {
    if (!isComplete || lockedAtMount.current || submittedRef.current) return
    submittedRef.current = true
    onSubmit({
      correct: isSolved,
      score: isSolved ? 3 : 0,
      guesses: guesses.map(g => g.value),
    })
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lockedAtMount.current) inputRef.current?.focus()
  }, [country])

  if (lockedAtMount.current) {
    return (
      <div style={{ padding: '10px 14px', color: '#64748b', fontSize: '1rem', textAlign: 'center' }}>
        ⏳ En attente…
      </div>
    )
  }

  const trimmedInput = inputValue.trim()
  const showSuggestions = !isComplete &&
    filteredCountrySuggestions.length > 0 &&
    !filteredCountrySuggestions.some(n => n === trimmedInput)

  return (
    <div>
      {isComplete ? (
        <div style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'center', fontWeight: 600,
          background: isSolved ? '#166534' : '#7f1d1d',
          color: isSolved ? '#86efac' : '#fca5a5',
          marginBottom: 12,
        }}>
          {isSolved ? `✓ ${answerName}` : `✗ C'était : ${answerName}`}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              placeholder="Nom du pays…"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', fontSize: '1rem',
                borderRadius: 8, border: '2px solid #3b82f6',
                background: '#0f172a', color: '#f1f5f9', outline: 'none',
              }}
            />
            {showSuggestions && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto',
              }}>
                {filteredCountrySuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setInputValue(name)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 14px', background: 'none', border: 'none',
                      color: '#f1f5f9', cursor: 'pointer', fontSize: '0.95rem',
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Proposer
            </button>
            <button
              onClick={revealCountry}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: '#334155', color: '#94a3b8', cursor: 'pointer',
              }}
            >
              Abandonner
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...guesses].reverse().map((guess, i) => (
          <div
            key={i}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 12px', borderRadius: 8,
              background: guess.isCorrect ? '#166534' : '#1e293b',
              color: guess.isCorrect ? '#86efac' : '#f1f5f9',
            }}
          >
            <span>{guess.isCorrect ? '✓' : '✗'} {guess.value}</span>
            {!guess.isCorrect && guess.distanceKm != null && (
              <small style={{ color: '#94a3b8' }}>
                {guess.directionArrow} {guess.distanceKm.toLocaleString('fr-FR')} km
              </small>
            )}
          </div>
        ))}
      </div>

      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />
    </div>
  )
}
