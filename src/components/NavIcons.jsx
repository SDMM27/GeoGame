// Line icons of the main navigation (same meaning as the app's tab icons).
import React from 'react'

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const PlayIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </Icon>
)

export const MultiIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17.5 14.5a5 5 0 0 1 4 5.5" />
  </Icon>
)

export const LeaderboardIcon = () => (
  <Icon>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4.5a3 3 0 0 0 3 4" />
    <path d="M17 6h2.5a3 3 0 0 1-3 4" />
    <path d="M12 14v4" />
    <path d="M8 20h8" />
  </Icon>
)

export const ProfileIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.2 18.4a7 7 0 0 1 11.6 0" />
  </Icon>
)
