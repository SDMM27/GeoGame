// Builds the scroll images (public/scrolls/<id>/{thumb,large}.webp) from the Wikimedia Commons files checked in
// docs/parchemins-sources.md. Needs ffmpeg on the PATH. Run by hand: node scripts/build-scrolls.mjs [id ...] (all by default).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const THUMB_WIDTH = 400
const LARGE_WIDTH = 2400
const LARGE_QUALITY = 78
// Commons asks for a contact in the user agent, and answers 429 when called too fast.
const HEADERS = { 'User-Agent': 'GeoGame scroll image builder (https://geo-game.app)' }
const PAUSE_MS = 5000

// `largeWidth`: for a map too long for the default width. `quality`: WebP quality of the large image, lower for a heavy one.
const FILES = {
  'continents-1858': { file: 'Antonio Snider-Pellegrini Opening of the Atlantic.jpg' },
  'egypt-ortelius': { file: '1584 Aegyptus Antiqua by Abraham Ortelius, from the Digital Commonwealth - commonwealth cj82kx52v.jpg', largeWidth: 1800, quality: 70 },
  'turin-papyrus': { file: 'Turin Papyrus (geological map) - Museo Egizio Turin C 1879 1969 1899 p01.jpg', largeWidth: 6000 },
  'rome-395': { file: 'Roman empire 395.jpg' },
  'caliphate-750': { file: 'Califate 750.png' },
  'holy-roman-empire': { file: 'Shepherd Holy Roman Empire Hohenstaufen 1138-1254.jpg' },
  'mongol-dominions': { file: 'Mongol dominions.png' },
  'tabula-rogeriana': { file: 'Charta Rogeriana - Weltkarte des Idrisi vom Jahr 1154 n. Ch. - LCCN 2007626789.tif', largeWidth: 4000, quality: 70 },
  'waldseemuller-1507': { file: 'Universalis cosmographia secundum Ptholomaei traditionem et Americi Vespucii alioru(m)que lustrationes. LOC 2003626426.jpg', largeWidth: 3200, quality: 65 },
  'ottoman-empire': { file: 'Ottoman empire 1481-1683.jpg' },
  'russia-growth': { file: 'Russian growth 1300 1796.jpg' },
  'british-empire-1886': { file: 'Imperial Federation, Map of the World Showing the Extent of the British Empire in 1886.jpg', largeWidth: 3200, quality: 70 },
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function get(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await wait(PAUSE_MS + attempt * 15000)
    const response = await fetch(url, { headers: HEADERS })
    if (response.ok) return response
    console.log(`  ${response.status}, retrying`)
  }
  throw new Error(`could not fetch ${url}`)
}

// An image of the file `width` wide at most, as a JPEG or PNG Commons renders (a TIFF comes back as a JPEG).
async function download(file, width, dir) {
  const query = `action=query&format=json&prop=imageinfo&iiprop=size|url&iiurlwidth=${width}&titles=${encodeURIComponent(`File:${file}`)}`
  const answer = await (await get(`https://commons.wikimedia.org/w/api.php?${query}`)).json()
  const info = Object.values(answer.query.pages)[0].imageinfo[0]
  const path = join(dir, 'source')
  writeFileSync(path, Buffer.from(await (await get(info.thumburl ?? info.url)).arrayBuffer()))
  return { path, width: info.width }
}

function toWebp(source, width, output, quality) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-vf', `scale='min(${width},iw)':-2`, '-c:v', 'libwebp', '-quality', String(quality), output])
}

const ids = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(FILES)
const dir = mkdtempSync(join(tmpdir(), 'scrolls-'))
for (const id of ids) {
  const { file, largeWidth = LARGE_WIDTH, quality = LARGE_QUALITY } = FILES[id]
  console.log(id)
  const { path, width } = await download(file, largeWidth, dir)
  const out = join('public', 'scrolls', id)
  mkdirSync(out, { recursive: true })
  toWebp(path, largeWidth, join(out, 'large.webp'), quality)
  toWebp(path, THUMB_WIDTH, join(out, 'thumb.webp'), 72)
  console.log(`  original ${width}px, large ${Math.round(statSync(join(out, 'large.webp')).size / 1024)} KB, thumb ${Math.round(statSync(join(out, 'thumb.webp')).size / 1024)} KB`)
}
rmSync(dir, { recursive: true, force: true })
