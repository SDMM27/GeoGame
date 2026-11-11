// Rank of a leaderboard row: a gold / silver / bronze disc with the number for the podium, the plain number after.
import React from 'react'
import './RankBadge.css'

const PODIUM = ['gold', 'silver', 'bronze']

// `rank` is 1-based. `plain` shows the bare number below the podium instead of `#n` (rows that already have a « # » column header).
export default function RankBadge({ rank, plain = false }) {
  const medal = PODIUM[rank - 1]
  return (
    <span className={`rank-badge${medal ? ` rank-badge--${medal}` : ''}`}>
      {medal ? rank : plain ? rank : `#${rank}`}
    </span>
  )
}
