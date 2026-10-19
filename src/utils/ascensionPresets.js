const PHASE_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible']

export const ASCENSION_PRESETS = [
  { name: 'Découverte', icon: '🌱', phases: { Facile: 10, Moyen: 5, Difficile: 1, Impossible: 0 } },
  { name: 'Progressif', icon: '📈', phases: { Facile: 15, Moyen: 10, Difficile: 5, Impossible: 1 } },
  { name: 'Challenge',  icon: '⚡', phases: { Facile: 7,  Moyen: 7,  Difficile: 7, Impossible: 2 } },
  { name: 'Hardcore',   icon: '💀', phases: { Facile: 5,  Moyen: 10, Difficile: 15, Impossible: 5 } },
]

// Translation key of each preset (presets.* in the locales). The French name stays the id, saved with the scores.
const PRESET_KEYS = { Découverte: 'discovery', Progressif: 'progressive', Challenge: 'challenge', Hardcore: 'hardcore' }

// Shown name of a preset: translated when known, the saved name otherwise.
export function presetLabel(name, t) {
  return PRESET_KEYS[name] ? t(`presets.${PRESET_KEYS[name]}`) : name
}

export function matchPreset(phases) {
  const preset = ASCENSION_PRESETS.find(p =>
    PHASE_ORDER.every(d => (p.phases[d] ?? 0) === (phases[d] ?? 0))
  )
  return preset?.name ?? null
}

export function buildPhaseSequence(phases) {
  return PHASE_ORDER
    .filter(d => (phases[d] ?? 0) > 0)
    .map(d => ({ difficulty: d, count: phases[d] }))
}
