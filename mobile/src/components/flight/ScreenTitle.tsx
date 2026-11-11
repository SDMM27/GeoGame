// Screen or section title in Bricolage Grotesque ExtraBold, with the header role.
// Props: children, size (default 26), color (default text), style, ...Text props.
import { Text as RNText, type TextProps } from 'react-native'

import { fonts, useColors } from '@/theme'

export function ScreenTitle({ children, size = 26, color, style, ...props }: TextProps & { size?: number; color?: string }) {
  const colors = useColors()
  return (
    <RNText
      accessibilityRole="header"
      {...props}
      style={[{ fontFamily: fonts.displayHeavy, fontSize: size, lineHeight: Math.round(size * 1.1), letterSpacing: -size * 0.02, color: color ?? colors.text }, style]}>
      {children}
    </RNText>
  )
}
