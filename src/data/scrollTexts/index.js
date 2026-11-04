// Texts of the scroll sheets, one JSON per language ({ [scrollId]: { body, detail, credit } }), loaded the first time a
// sheet opens: they stay out of the locale files, which every player loads. Explicit imports rather than a template:
// Metro (the app) only follows static paths. A field missing in the player's language comes from English, then French.
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

export const SCROLL_TEXT_FIELDS = ['body', 'detail', 'credit']

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

/** { body?, detail?, credit? } of a scroll in `lang`; each missing field falls back to English then French. */
export async function loadScrollText(id, lang) {
  const chain = [...new Set([lang, 'en', 'fr'])]
  const entries = await Promise.all(chain.map(async (code) => (await load(code))[id] ?? {}))
  const text = {}
  for (const field of SCROLL_TEXT_FIELDS) {
    const found = entries.find((entry) => typeof entry[field] === 'string' && entry[field].trim() !== '')
    if (found) text[field] = found[field]
  }
  return text
}
