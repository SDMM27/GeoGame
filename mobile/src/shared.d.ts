// Website modules imported from ../src (plain JS, resolved by metro.config.js).
declare module '@shared/*'

declare module '@shared/components/collection/historicalFlagSparks' {
  export const ARCHIVE_PACK_INTRO: number
  export const ARCHIVE_SIGIL: { view: number; radius: number; meridian: number }
  export const ARCHIVE_CRACK: number
  export const ARCHIVE_CRACK_DURATION: number
  export const ARCHIVE_DETAILS: number
  export const ARCHIVE_IMPACT: number
  export const ARCHIVE_OPEN_DURATION: number
  export const ARCHIVE_SHEEN: number
  export const ARCHIVE_MOTES: { x: number; y: number; dx: number; dy: number; delay: number; size: number }[]
  export const ARCHIVE_SPARKS: {
    x: number
    y: number
    dx: number
    dy: number
    delay: number
    duration: number
    length: number
    angle: number
    color: string
  }[]
}
