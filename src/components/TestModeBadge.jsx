// A small corner badge while the test mode is on (utils/testMode.js), with a button to leave it. Never in production.
import React from 'react'
import { isTestMode, leaveTestMode } from '../utils/testMode'

const style = {
  position: 'fixed',
  left: 12,
  bottom: 12,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 999,
  background: '#FF2BD6',
  color: '#fff',
  font: '700 12px/1 var(--sd-font-mono, monospace)',
  boxShadow: '0 4px 14px rgba(0,0,0,.3)',
}
const button = { all: 'unset', cursor: 'pointer', textDecoration: 'underline' }

export default function TestModeBadge() {
  if (!isTestMode()) return null
  return (
    <div style={style} role="status">
      Mode test : tout est débloqué (aperçu local)
      <button type="button" style={button} onClick={leaveTestMode}>
        Quitter
      </button>
    </div>
  )
}
