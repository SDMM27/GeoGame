// A game's emblem in its own color (same geometry as the site's GameEmblem.jsx).
// Props:
//   game     game id, GAME_TYPES value or room game id (see @shared/utils/gameEmblems)
//   variant  'tile' (default: rounded square tinted 16 %, for lists and headers), 'stamp' (round passport stamp with
//            the flight code, for tickets and achievements) or 'glyph' (the bare stroke, inline or on your own tile)
//   size     width and height in px (default 40)
//   color    overrides the game's color (e.g. a muted glyph for an inactive filter)
//   title    accessible name; without it the emblem is hidden from screen readers
import { Path, G, Circle, Rect, Svg, Text as SvgText } from 'react-native-svg'

import { emblemId, gameEmblem } from '@shared/utils/gameEmblems'
import { fonts, gameColors } from '@/theme'

export type EmblemVariant = 'tile' | 'stamp' | 'glyph'

type Props = {
  game: string | null | undefined
  variant?: EmblemVariant
  size?: number
  color?: string
  title?: string
}

type Emblem = { code: string; d?: string; d2?: string }

// '#RRGGBB' -> 'rgba(r,g,b,a)'
function tint(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`
}

export function emblemColor(game: string | null | undefined): string {
  const id = emblemId(game) as keyof typeof gameColors | null
  return id ? gameColors[id] : '#A3ACC6'
}

export function flightCode(game: string | null | undefined): string {
  return (gameEmblem(game) as Emblem | null)?.code ?? ''
}

export default function GameEmblem({ game, variant = 'tile', size = 40, color, title }: Props) {
  const emblem = gameEmblem(game) as Emblem | null
  if (!emblem) return null
  const stroke = color ?? emblemColor(game)
  const a11y = title
    ? ({ accessibilityRole: 'image', accessibilityLabel: title, accessible: true } as const)
    : ({ accessible: false, importantForAccessibility: 'no-hide-descendants' } as const)

  const paths = (
    <>
      {emblem.d ? <Path d={emblem.d} /> : null}
      {emblem.d2 ? <Path d={emblem.d2} strokeDasharray="1.6 1.8" /> : null}
    </>
  )

  if (variant === 'stamp') {
    return (
      <Svg width={size} height={size} viewBox="0 0 132 132" {...a11y}>
        <Circle cx={66} cy={66} r={60} strokeWidth={3} stroke={stroke} fill={tint(stroke, 0.1)} />
        <Circle cx={66} cy={66} r={51} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.8} />
        <G transform="translate(42 26) scale(2)" fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          {paths}
        </G>
        <SvgText x={66} y={98} textAnchor="middle" fill={stroke} fontFamily={fonts.monoBold} fontSize={17} letterSpacing={2}>
          {emblem.code}
        </SvgText>
      </Svg>
    )
  }

  if (variant === 'glyph') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...a11y}>
        {paths}
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...a11y}>
      <Rect width={24} height={24} rx={7} fill={tint(stroke, 0.16)} />
      <G transform="translate(4.8 4.8) scale(0.6)" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </G>
    </Svg>
  )
}
