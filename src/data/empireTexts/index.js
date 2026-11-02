// Texts of the interactive empire maps, one JSON per language ({ [scrollId]: { [stageId]: { label, title, text }, _note? } }),
// loaded when a map opens. `label` is the short name on the slider, `_note` a line under the map about the limits of its
// source. Explicit imports rather than a template: Metro (the app) only follows static paths. A field missing in the
// player's language comes from English, then French.
const LOADERS = {
  fr: () => import('./fr.json'),
  en: () => import('./en.json'),
  es: () => import('./es.json'),
  pt: () => import('./pt.json'),
  de: () => import('./de.json'),
  it: () => import('./it.json'),
  ru: () => import('./ru.json'),
  uk: () => import('./uk.json'),
  nl: () => import('./nl.json'),
}

export const EMPIRE_TEXT_FIELDS = ['label', 'title', 'text']

const files = new Map()

async function load(lang) {
  if (!files.has(lang)) {
    const loader = LOADERS[lang]
    files.set(
      lang,
      loader ? loader().then((module) => module.default ?? module, () => ({})) : Promise.resolve({})
    )
  }
  return files.get(lang)
}

const filled = (value) => typeof value === 'string' && value.trim() !== ''

/** { stages: { [stageId]: { label?, title?, text? } }, note? } of an empire in `lang`; each missing field falls back to English then French. */
export async function loadEmpireText(id, lang) {
  const chain = [...new Set([lang, 'en', 'fr'])]
  const entries = await Promise.all(chain.map(async (code) => (await load(code))[id] ?? {}))
  const stages = {}
  for (const stageId of new Set(entries.flatMap((entry) => Object.keys(entry).filter((key) => key !== '_note')))) {
    const text = {}
    for (const field of EMPIRE_TEXT_FIELDS) {
      const found = entries.find((entry) => filled(entry[stageId]?.[field]))
      if (found) text[field] = found[stageId][field]
    }
    stages[stageId] = text
  }
  const note = entries.find((entry) => filled(entry._note))?._note
  return note ? { stages, note } : { stages }
}
