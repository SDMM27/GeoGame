// A globe seen through its meridians: the sigil of the mystery packs, drawn from the shared geometry
// (historicalFlagSparks.js). Used by the reveal animation and by the collection grid.
import { ARCHIVE_SIGIL } from './historicalFlagSparks'

export default function ArchiveSigil({ className }) {
  const { view, radius, meridian } = ARCHIVE_SIGIL
  const half = view / 2
  return (
    <svg className={className} viewBox={`${-half} ${-half} ${view} ${view}`} aria-hidden="true">
      <circle cx="0" cy="0" r={radius} />
      <ellipse cx="0" cy="0" rx={meridian} ry={radius} />
      <line x1={-radius} y1="0" x2={radius} y2="0" />
    </svg>
  )
}
