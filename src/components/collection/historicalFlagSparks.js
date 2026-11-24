export const ARCHIVE_PACK_INTRO = 1760
// The sigil stamped on the tunnel seal and split between the two shutters: a globe seen through its
// meridians. view is the SVG viewBox size; both the website (inline SVG) and the app (react-native-svg) draw it.
export const ARCHIVE_SIGIL = { view: 72, radius: 30, meridian: 13 }
// Times relative to the end of the tunnel. During the pause, only a sliver of the flag shows.
export const ARCHIVE_CRACK = 140
export const ARCHIVE_CRACK_DURATION = 440
export const ARCHIVE_IMPACT = 840
export const ARCHIVE_OPEN_DURATION = 480
export const ARCHIVE_DETAILS = 1640
export const ARCHIVE_SHEEN = ARCHIVE_IMPACT + ARCHIVE_OPEN_DURATION
const ARCHIVE_SPARK_DURATION = 760

// Opposing sprays start just inside the gold frame. Staggered launch angles keep the flag readable.
const spray = [
  // origin Y (%), outward travel, vertical travel, delay, streak length
  [23, 92, -104, 0, 17],
  [26, 43, -130, 30, 9],
  [30, 115, -76, 55, 13],
  [34, 68, -82, 22, 7],
  [38, 118, -49, 70, 10],
  [43, 96, -57, 44, 16],
  [56, 90, -40, 17, 13],
  [62, 58, -82, 62, 9],
  [67, 125, -15, 35, 18],
  [73, 106, 7, 65, 10],
  [76, 55, 36, 31, 13],
  [78, 76, 61, 76, 7],
  // A second, higher spray follows the first one as the shutters reach the edges.
  [37, 155, -138, 240, 17],
  [48, 84, -168, 270, 14],
  [56, 134, -121, 315, 12],
  [64, 117, -106, 345, 15],
  [72, 169, -47, 285, 11],
  [84, 151, -11, 340, 17],
  [35, 36, -84, 350, 4],
  [54, 63, -121, 420, 3],
  [65, 87, -56, 410, 4],
  [75, 103, -29, 475, 3],
]

export const ARCHIVE_SPARKS = [-1, 1].flatMap((side) => spray.map(([y, reach, dy, delay, length], index) => {
  const dx = reach * side
  return {
    x: side < 0 ? 8 : 92,
    y,
    dx,
    dy,
    delay: delay + (side > 0 ? 8 : 0),
    duration: length <= 4 ? 1020 : ARCHIVE_SPARK_DURATION - (index % 3) * 75,
    length,
    angle: Math.atan2(dy, dx) * 180 / Math.PI,
    color: ['#fff5d7', '#efca84', '#efa24f'][index % 3],
  }
}))

export const ARCHIVE_MOTES = Array.from({ length: 16 }, (_, index) => ({
  x: 9 + (index * 31) % 83,
  y: 30 + (index * 17) % 63,
  dx: (index % 2 ? 1 : -1) * (12 + (index * 7) % 33),
  dy: -(24 + (index * 11) % 60),
  delay: (index % 6) * 75,
  size: 2 + (index % 3),
}))
