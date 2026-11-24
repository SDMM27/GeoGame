// A globe seen through its meridians: the sigil of the mystery packs, drawn from the shared geometry
// (@shared/components/collection/historicalFlagSparks.js). Used by the reveal animation and the collection grid.
import { Circle, Ellipse, Line, Svg } from 'react-native-svg'

import { ARCHIVE_SIGIL } from '@shared/components/collection/historicalFlagSparks'

export default function ArchiveSigil({ size, color }: { size: number; color: string }) {
  const { view, radius, meridian } = ARCHIVE_SIGIL
  const half = view / 2
  return (
    <Svg width={size} height={size} viewBox={`${-half} ${-half} ${view} ${view}`}>
      <Circle cx={0} cy={0} r={radius} fill="none" stroke={color} strokeWidth={2.6} />
      <Ellipse cx={0} cy={0} rx={meridian} ry={radius} fill="none" stroke={color} strokeWidth={2.6} />
      <Line x1={-radius} y1={0} x2={radius} y2={0} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  )
}
