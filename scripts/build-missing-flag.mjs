// Missing Flag mode (docs/plan-fonctionnalites.md, step 8): which third of each flag is hidden, and the mode's own
// difficulty. Reads the flags in public/flags and writes:
//
//   src/data/missingFlagMasks.json   { [ISO_A2]: { axis: 'h' | 'v', band: 0..2 } }, the hidden third of each flag
//                                    (h: a horizontal band, 0 = top; v: a vertical band, 0 = left)
//   DifficultyMissingFlag            added to the countries of src/data/countriesWithDifficulty_FR.json,
//                                    src/data/countries.meta.json and mobile/assets/data/countries.json, in place
//                                    (the geometry is left as it is, so no rebuild is needed)
//
// The hidden third is the one that hides the most of the flag's colors (uniqueShare): France and Italy lose a
// vertical band, Germany a horizontal one, Japan most of its disc. A third that only cuts through colors still
// visible elsewhere would leave the flag as easy as in the Flags game.
//
// Difficulty: the Flags difficulty (DifficultyFlag), one level harder when the hidden third holds (almost) a whole
// color of the flag (HARDER_FROM), since the player has to recognise the flag without it.
//
// Usage: node scripts/build-missing-flag.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const flagsDir = join(root, 'public', 'flags')
const masksFile = join(root, 'src', 'data', 'missingFlagMasks.json')
const dataFiles = [
  join(root, 'src', 'data', 'countriesWithDifficulty_FR.json'),
  join(root, 'src', 'data', 'countries.meta.json'),
  join(root, 'mobile', 'assets', 'data', 'countries.json'),
]

const LEVELS = ['Facile', 'Moyen', 'Difficile', 'Impossible']
// Grid the flag is sampled on, and how close two colors must be to count as the same one.
const GRID_W = 90
const GRID_H = 60
const SAME_COLOR = 60
// uniqueShare from which the mode is one level harder than the Flags game: the third holds (almost) a whole color,
// as in a tricolor (about a quarter of the flags).
export const HARDER_FROM = 0.9

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

// The flag as a GRID_W × GRID_H grid of [r, g, b] (transparent pixels count as white).
export function sample(file) {
  const png = PNG.sync.read(readFileSync(file))
  const grid = []
  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      const px = Math.min(png.width - 1, Math.floor(((x + 0.5) * png.width) / GRID_W))
      const py = Math.min(png.height - 1, Math.floor(((y + 0.5) * png.height) / GRID_H))
      const i = (py * png.width + px) * 4
      const alpha = png.data[i + 3] / 255
      grid.push([0, 1, 2].map((c) => png.data[i + c] * alpha + 255 * (1 - alpha)))
    }
  }
  return grid
}

const inBand = (index, axis, band) => {
  const x = index % GRID_W
  const y = Math.floor(index / GRID_W)
  return axis === 'h' ? Math.floor((y * 3) / GRID_H) === band : Math.floor((x * 3) / GRID_W) === band
}

// How much of the flag's own colors the third hides: each hidden pixel counts for the share of its color that the
// third hides. 1 when the third holds every pixel of its colors (France's white band), 1/3 for a third that cuts
// evenly through every color (a horizontal band of the French flag), in between for a disc mostly hidden (Japan).
export function uniqueShare(grid, axis, band) {
  // The flag's colors (pixels within SAME_COLOR of a color seen first belong to it).
  const palette = []
  const colorOf = grid.map((color) => {
    let entry = palette.find((known) => distance(known.color, color) < SAME_COLOR)
    if (!entry) {
      entry = { color, total: 0, hidden: 0 }
      palette.push(entry)
    }
    entry.total += 1
    return entry
  })
  let hiddenPixels = 0
  colorOf.forEach((entry, index) => {
    if (!inBand(index, axis, band)) return
    entry.hidden += 1
    hiddenPixels += 1
  })
  let score = 0
  for (const entry of palette) score += entry.hidden * (entry.hidden / entry.total)
  return score / hiddenPixels
}

// Candidates in order of preference on a tie: the middle bands first (the flag keeps its two edges).
const CANDIDATES = [
  { axis: 'h', band: 1 },
  { axis: 'v', band: 1 },
  { axis: 'h', band: 0 },
  { axis: 'v', band: 0 },
  { axis: 'h', band: 2 },
  { axis: 'v', band: 2 },
]

export function pickMask(grid) {
  let best = null
  for (const candidate of CANDIDATES) {
    const share = uniqueShare(grid, candidate.axis, candidate.band)
    // Ties within 2 % keep the earlier (preferred) candidate.
    if (!best || share > best.share + 0.02) best = { ...candidate, share }
  }
  return best
}

export function missingFlagDifficulty(difficultyFlag, share) {
  const level = LEVELS.indexOf(difficultyFlag)
  if (level < 0) return difficultyFlag
  return LEVELS[Math.min(LEVELS.length - 1, level + (share >= HARDER_FROM ? 1 : 0))]
}

function flagFile(iso) {
  for (const name of [`${iso.toLowerCase()}.png`, `${iso}.png`]) {
    const file = join(flagsDir, name)
    if (existsSync(file)) return file
  }
  return null
}

// Adds or updates "DifficultyMissingFlag" right after "DifficultyFlag" in each country of a data file, keeping
// the file's own formatting (pretty-printed source, one-line meta and app files).
function patchDataFile(file, difficultyOf) {
  const text = readFileSync(file, 'utf8')
  let patched = 0
  const pattern =
    /("ISO_A2"(\s*:\s*)"([^"]*)"[^{}]*?"DifficultyFlag"\s*:\s*"[^"]*")(,\s*"DifficultyMissingFlag"\s*:\s*"[^"]*")?(,?)(\s*)/g
  const next = text.replace(pattern, (match, head, separator, iso, _old, comma, space) => {
    const difficulty = difficultyOf(iso)
    if (!difficulty) return match
    patched += 1
    // Same separators as the file: `, "key": "value"` with the whitespace that followed DifficultyFlag
    const sep = space || ''
    return `${head},${sep}"DifficultyMissingFlag"${separator}"${difficulty}"${comma}${space}`
  })
  JSON.parse(next)
  writeFileSync(file, next)
  return patched
}

function main() {
  const meta = JSON.parse(readFileSync(dataFiles[1], 'utf8'))
  const masks = {}
  const difficulties = {}
  const counts = {}
  for (const { properties } of meta.features) {
    const iso = properties.ISO_A2
    if (!iso || masks[iso] || !properties.DifficultyFlag) continue
    const file = flagFile(iso)
    if (!file) {
      console.warn(`No flag for ${iso} (${properties.ADMIN})`)
      continue
    }
    const { axis, band, share } = pickMask(sample(file))
    masks[iso] = { axis, band }
    difficulties[iso] = missingFlagDifficulty(properties.DifficultyFlag, share)
    const key = `${properties.DifficultyFlag} -> ${difficulties[iso]}`
    counts[key] = (counts[key] ?? 0) + 1
  }
  const sorted = Object.fromEntries(Object.keys(masks).sort().map((iso) => [iso, masks[iso]]))
  writeFileSync(masksFile, `${JSON.stringify(sorted, null, 2)}\n`)
  console.log(`${Object.keys(sorted).length} masks written to ${masksFile}`)
  console.log(counts)
  for (const file of dataFiles) {
    console.log(`${patchDataFile(file, (iso) => difficulties[iso])} countries patched in ${file}`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
