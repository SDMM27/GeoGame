// The « carnet de vol » logo: a compass whose needle sways (still under reduced motion).
import React from 'react'
import './theme.css'

export default function CompassLogo({ size = 32 }) {
  return (
    <svg className="gg-compass" width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <circle cx="15" cy="15" r="13" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 3.5v2M15 24.5v2M3.5 15h2M24.5 15h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <path className="gg-compass-needle" d="M15 5l3 10-3 10-3-10z" fill="var(--gg-accent-soft)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="15" cy="15" r="1.6" fill="currentColor" />
    </svg>
  )
}
