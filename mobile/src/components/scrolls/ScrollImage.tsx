// An image of a scroll (thumbnail or large map), downloaded from the website and cached by expo-image: the app does not
// bundle them, and a new scroll needs no new version. The files may not exist yet: while one is missing or fails to
// load, a parchment-colored placeholder takes its place, never a blank or broken image.
import { Image } from 'expo-image'
import { useState } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { scrollImageUrl } from '@shared/utils/scrollCollectionData'

import { SITE_ORIGIN } from '@/links'

// Parchment and wax: local to the scrolls, the theme has none.
export const parchment = { light: '#E3D4AD', mid: '#D1BD8E', dark: '#BDA774', edge: 'rgba(120,90,40,0.35)' } as const
export const waxSeal = '#B3402E'

export type ImageSize = { width: number; height: number }

export function ScrollImage({
  id,
  size = 'thumb',
  style,
  contentFit = 'cover',
  onLoadSize,
}: {
  id: string
  size?: 'thumb' | 'large'
  style?: StyleProp<ViewStyle>
  contentFit?: 'cover' | 'contain'
  // Natural size of the image once loaded (the sheet shapes its viewport after it)
  onLoadSize?: (size: ImageSize) => void
}) {
  const uri = scrollImageUrl(id, size, SITE_ORIGIN) as string
  const [failed, setFailed] = useState<string | null>(null)
  if (failed === uri) return <View testID="scroll-placeholder" accessible={false} style={[styles.placeholder, style]} />
  return (
    <Image
      testID="scroll-image"
      source={{ uri }}
      style={style as never}
      contentFit={contentFit}
      accessible={false}
      alt=""
      onError={() => setFailed(uri)}
      onLoad={(event) => onLoadSize?.({ width: event.source.width, height: event.source.height })}
    />
  )
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: parchment.mid, borderWidth: 2, borderColor: parchment.edge },
})
