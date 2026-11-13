// Skins of the home page's globe, shared by the website and the app. A skin recolors the ocean, the land, the
// graticule and the reticle; `classic` keeps the theme's own colors (palette null). Like the profile decorations
// (decorations.js), `level` skins unlock at a player level (XP); the `secret` one is the easter egg: it unlocks when
// the player reaches EASTER_EGG_SCORE on the globe, and stays hidden from the list until then.
//
// The choice and the secret live on this device only (localStorage, which the app polyfills): nobody else sees the
// globe, so there is nothing to sync and no Firestore rule to keep.

export const EASTER_EGG_SCORE = 1000
export const SECRET_SKIN = 'disco'

const STARTER = { kind: 'starter' }
const atLevel = (level) => ({ kind: 'level', level })
const SECRET = { kind: 'secret' }

// `accent`: the site's accent color while the skin is worn (buttons, active tab, highlights), per theme: `accent` fills,
// `ink` is the text on it, `strong` is accent-colored text on the page background. Every pair passes WCAG AA (4.5:1)
// on the theme's background and surface. Game feedback keeps its own success color (--gg-success / colors.success).
// Classic has none: the theme's own green.
//
// Every palette keeps the reticle readable over its land and its ocean: `reticle` is drawn over a wider
// `reticleHalo` stroke, the way the city codes are.
// `swatch`: [ocean, land] for the picker's little preview disc. `disco`: the land cycles through the hues (discoRgb).
export const GLOBE_SKINS = [
  { id: 'classic', unlock: STARTER, palette: null, swatch: null },
  {
    id: 'parchment',
    accent: {
      dark: { accent: '#E0B072', strong: '#F0C892', ink: '#2A1A08' },
      light: { accent: '#9A6A2E', strong: '#7A5230', ink: '#FFFFFF' },
    },
    unlock: atLevel(3),
    palette: {
      ocean: '#EFE2C2', oceanDeep: '#CDB487', land: '#7A5230', landEdge: 'rgba(60,35,15,0.6)',
      graticule: 'rgba(122,82,48,0.3)', reticle: '#3B2414', reticleHalo: '#F6EBD0',
    },
    swatch: ['#EFE2C2', '#7A5230'],
  },
  {
    id: 'tropical',
    accent: {
      dark: { accent: '#22C7DF', strong: '#5FDCEB', ink: '#032C35' },
      light: { accent: '#0E7F94', strong: '#0B6475', ink: '#FFFFFF' },
    },
    unlock: atLevel(5),
    palette: {
      ocean: '#22B8CF', oceanDeep: '#0B6E8A', land: '#3DDC97', landEdge: 'rgba(5,60,40,0.55)',
      graticule: 'rgba(255,255,255,0.22)', reticle: '#FFFFFF', reticleHalo: '#073B4C',
    },
    swatch: ['#22B8CF', '#3DDC97'],
  },
  {
    id: 'glacier',
    accent: {
      dark: { accent: '#8DC6EA', strong: '#B5DCF5', ink: '#0D2A40' },
      light: { accent: '#2F78AE', strong: '#1F5F8E', ink: '#FFFFFF' },
    },
    unlock: atLevel(8),
    palette: {
      ocean: '#CFEFFF', oceanDeep: '#8DC6EA', land: '#FFFFFF', landEdge: 'rgba(40,90,130,0.6)',
      graticule: 'rgba(40,90,130,0.22)', reticle: '#0D3B5E', reticleHalo: '#FFFFFF',
    },
    swatch: ['#8DC6EA', '#FFFFFF'],
  },
  {
    id: 'volcano',
    accent: {
      dark: { accent: '#FF9F1C', strong: '#FFB650', ink: '#2A1400' },
      light: { accent: '#B45309', strong: '#923F05', ink: '#FFFFFF' },
    },
    unlock: atLevel(12),
    palette: {
      ocean: '#2A0F0F', oceanDeep: '#120505', land: '#FF6B3D', landEdge: 'rgba(255,214,102,0.6)',
      graticule: 'rgba(255,107,61,0.2)', reticle: '#FFE066', reticleHalo: '#120505',
    },
    swatch: ['#2A0F0F', '#FF6B3D'],
  },
  {
    id: 'neon',
    accent: {
      dark: { accent: '#FF4FD8', strong: '#FF85E4', ink: '#2A0024' },
      light: { accent: '#B5179E', strong: '#8E0F7B', ink: '#FFFFFF' },
    },
    unlock: atLevel(16),
    palette: {
      ocean: '#0A0A1F', oceanDeep: '#000008', land: '#39FF14', landEdge: 'rgba(255,43,214,0.7)',
      graticule: 'rgba(57,255,20,0.18)', reticle: '#FF2BD6', reticleHalo: '#000008',
    },
    swatch: ['#0A0A1F', '#39FF14'],
  },
  {
    id: 'aurora',
    accent: {
      dark: { accent: '#B57BFF', strong: '#CBA2FF', ink: '#1E0640' },
      light: { accent: '#7C3AED', strong: '#6025C9', ink: '#FFFFFF' },
    },
    unlock: atLevel(20),
    palette: {
      ocean: '#0B1D3A', oceanDeep: '#050B1A', land: '#B57BFF', landEdge: 'rgba(61,220,151,0.7)',
      graticule: 'rgba(61,220,151,0.22)', reticle: '#3DDC97', reticleHalo: '#050B1A',
    },
    swatch: ['#0B1D3A', '#B57BFF'],
  },
  {
    id: 'gold',
    accent: {
      dark: { accent: '#F5C84B', strong: '#FFD970', ink: '#2A1E02' },
      light: { accent: '#8A6500', strong: '#6E5000', ink: '#FFFFFF' },
    },
    unlock: atLevel(30),
    palette: {
      ocean: '#1A1408', oceanDeep: '#0A0803', land: '#FFD447', landEdge: 'rgba(255,246,208,0.6)',
      graticule: 'rgba(255,212,71,0.2)', reticle: '#FFF6D0', reticleHalo: '#0A0803',
    },
    swatch: ['#1A1408', '#FFD447'],
  },
  {
    id: SECRET_SKIN,
    accent: {
      dark: { accent: '#FF6FB5', strong: '#FF9ECB', ink: '#33001A' },
      light: { accent: '#C2185B', strong: '#9C1048', ink: '#FFFFFF' },
    },
    unlock: SECRET,
    disco: true,
    palette: {
      ocean: '#2B0B3F', oceanDeep: '#12021C', land: '#FF9EC7', landEdge: 'rgba(255,255,255,0.7)',
      graticule: 'rgba(255,255,255,0.25)', reticle: '#FFFFFF', reticleHalo: '#12021C',
    },
    swatch: ['#2B0B3F', '#FF9EC7'],
  },
]

const SKINS_BY_ID = Object.fromEntries(GLOBE_SKINS.map((skin) => [skin.id, skin]))
export const globeSkin = (id) => SKINS_BY_ID[id] ?? SKINS_BY_ID.classic

// `progress`: { level, secret } (secret: the easter egg was found on this device).
export function isSkinUnlocked(skin, progress = {}) {
  switch (skin?.unlock?.kind) {
    case 'starter':
      return true
    case 'level':
      return (progress.level ?? 0) >= skin.unlock.level
    case 'secret':
      return Boolean(progress.secret)
    default:
      return false
  }
}

// The skins the picker lists: the secret one only once found.
export const visibleSkins = (progress = {}) =>
  GLOBE_SKINS.filter((skin) => skin.unlock.kind !== 'secret' || isSkinUnlocked(skin, progress))

// The skin to draw: the chosen one if still unlocked (a signed-out player falls back to classic), else classic.
export const activeSkin = (id, progress = {}) => {
  const skin = globeSkin(id)
  return isSkinUnlocked(skin, progress) ? skin : SKINS_BY_ID.classic
}

// Whether a score change crosses the easter egg's threshold (fires once, on the find that reaches it).
export const reachesEasterEgg = (previous, next) => previous < EASTER_EGG_SCORE && next >= EASTER_EGG_SCORE

// The disco land at `time` seconds: [r, g, b] in 0..1, one turn of the hue wheel every 4 s. A worklet, so the app's
// UI thread can feed it to the land shader each frame (the directive is a plain string on the website).
export function discoRgb(time) {
  'worklet'
  const h = (((time / 4) % 1) + 1) % 1
  const channel = (n) => {
    const k = (n + h * 12) % 12
    return 0.6 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [channel(0), channel(8), channel(4)]
}

// Device storage (localStorage on the website, its polyfill in the app). Never throws: a private window just forgets.
const SKIN_KEY = 'gg.globeSkin'
const SECRET_KEY = 'gg.globeSecret'
const storage = () => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
const read = (key) => {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    storage()?.setItem(key, value)
  } catch {
    // ignored: the choice just isn't remembered
  }
}

const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

// Called whenever the skin choice, the secret or the accent preference changes (the site's accent follows at once).
export function onGlobeSkinChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const loadSkinChoice = () => read(SKIN_KEY) ?? 'classic'
export const saveSkinChoice = (id) => {
  write(SKIN_KEY, globeSkin(id).id)
  notify()
}

// Whether the worn skin also colors the site's accent (on unless the player turned it off in the skin picker).
const ACCENT_KEY = 'gg.globeAccent'
export const loadAccentEnabled = () => read(ACCENT_KEY) !== '0'
export const saveAccentEnabled = (on) => {
  write(ACCENT_KEY, on ? '1' : '0')
  notify()
}

// The accent colors of `skin` in `scheme` ('dark' | 'light'), or null for the theme's own (classic, or turned off).
export const skinAccent = (skin, scheme, enabled = true) => (enabled && skin?.accent?.[scheme]) || null
export const loadSecretFound = () => read(SECRET_KEY) === '1'
export const saveSecretFound = () => {
  write(SECRET_KEY, '1')
  notify()
}
