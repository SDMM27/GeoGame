// Small mono capitals with wide tracking (« CARTE D'EMBARQUEMENT · GG-01 »).
// Props: children (text, shown in capitals), color (default textMuted), size (default 10), style, ...Text props.
import { Text as RNText, type TextProps } from 'react-native'

import { colors, fonts } from '@/theme'

export function Kicker({ children, color = colors.textMuted, size = 10, style, ...props }: TextProps & { color?: string; size?: number }) {
  return (
    <RNText
      {...props}
      style={[{ fontFamily: fonts.monoBold, fontSize: size, lineHeight: size * 1.4, letterSpacing: size * 0.12, color, textTransform: 'uppercase' }, style]}>
      {children}
    </RNText>
  )
}
