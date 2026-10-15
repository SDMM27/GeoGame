// src/utils/quizQuestions.js
// Génération des questions du Quiz Géo.
// Les questions sont indépendantes de la langue : localizeQuestion() produit le texte affiché.
// Chaque question porte `choices` (mode choix multiples, `correctId` désigne la bonne) et
// `accepted` (toutes les réponses valables en réponse libre).

import countries from '../data/countriesWithDifficulty_FR.json'
import curatedQuestions from '../data/quizQuestions.json'
import historyQuestions from '../data/historyQuestions.json'
import { GEO_FEATURES, MOUTHS } from '../data/geoFeatures'
import { countryBorders } from '../data/countryBorders'
import { getCountryAreaKm2 } from './countryArea'
import { getCountryName, getAllCountryNames } from './getCountryName'
import { CONTINENTS } from './continents'
import { matchAnswer } from './normalizeAnswer'
import { mulberry32 } from './prng'
import { LANGUAGE_CODES, localeOf } from '../i18n/languages'

export const QUIZ_DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible']

export const QUIZ_POINTS = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 5 }

// Mode infini, choix multiples : chaque indice retire une mauvaise réponse, il en reste toujours deux
export const CHOICE_HINTS = 2

// Chaque indice réduit les points de la question ; une bonne réponse rapporte toujours au moins 1 point
export function getQuizPoints(difficulty, hintsUsed = 0) {
  const base = QUIZ_POINTS[difficulty] ?? 1
  return Math.max(1, Math.ceil(base / (hintsUsed + 1)))
}

export const ANSWER_MODES = { CHOICES: 'choices', FREE: 'free' }

// Les questions d'histoire forment un quiz à part : jamais mélangées au quiz géo ni au quiz du jour
export const QUIZ_THEMES = { GEO: 'geo', HISTORY: 'history' }

const LANGS = LANGUAGE_CODES

// Part des questions écrites à la main ; le reste est généré
const CURATED_RATIO = 0.2
const MAX_ATTEMPTS = 60

// Poids de chaque modèle de question. En réponse libre, les questions qui n'ont pas de sens sans
// propositions (comparaisons, « lequel n'est pas… ») ou dont on ne peut pas lister toutes les
// bonnes réponses (« quel fleuve traverse ce pays ? ») sont exclues.
const TEMPLATES = {
  choices: {
    feature_country: 4,
    country_feature: 3,
    feature_continent: 1,
    river_mouth: 2,
    river_city: 2,
    mountain_range: 2,
    highest_point: 2,
    mountain_height: 1,
    range_highest: 1,
    longest_river: 1,
    highest_mountain: 1,
    neighbor: 0.5,
    not_neighbor: 0.5,
  },
  free: {
    feature_country: 4,
    feature_continent: 1,
    river_mouth: 2,
    river_city: 2,
    mountain_range: 2,
    highest_point: 2,
    mountain_height: 1,
    range_highest: 1,
    neighbor_free: 0.5,
  },
}

// Noms acceptés en réponse libre pour chaque continent, toutes langues confondues
const CONTINENT_ANSWERS = {
  Europe: ['Europe', 'Европа', 'Europa'],
  Asie: ['Asie', 'Asia', 'Азия', 'Ásia', 'Asien'],
  Afrique: ['Afrique', 'Africa', 'Африка', 'África', 'Afrika'],
  Amériques: [
    'Amériques', 'Amérique', 'Amérique du Nord', 'Amérique du Sud', 'Amérique centrale',
    'Americas', 'America', 'North America', 'South America', 'Central America',
    'Америка', 'Северная Америка', 'Южная Америка', 'Центральная Америка',
    'América', 'Américas', 'América del Norte', 'América del Sur', 'Centroamérica', 'América Central',
    'América do Norte', 'América do Sul', 'Amerika', 'Nordamerika', 'Südamerika', 'Mittelamerika',
    'Americhe', 'America del Nord', 'America del Sud', 'America centrale',
  ],
  Océanie: ['Océanie', 'Oceania', 'Океания', 'Oceanía', 'Ozeanien'],
}

export function getAllowedDifficulties(maxDifficulty) {
  const idx = QUIZ_DIFFICULTIES.indexOf(maxDifficulty)
  return idx === -1 ? QUIZ_DIFFICULTIES : QUIZ_DIFFICULTIES.slice(0, idx + 1)
}

function hardest(difficulties) {
  return difficulties.reduce(
    (acc, d) => (QUIZ_DIFFICULTIES.indexOf(d) > QUIZ_DIFFICULTIES.indexOf(acc) ? d : acc),
    QUIZ_DIFFICULTIES[0]
  )
}

const VALID_COUNTRIES = countries.features
  .map((f) => f.properties)
  .filter((p) => p.ISO_A2 && p.ISO_A2 !== '-99' && QUIZ_DIFFICULTIES.includes(p.Difficulty))

const BY_ISO = new Map(VALID_COUNTRIES.map((p) => [p.ISO_A2, p]))
const ALL_BY_ISO = new Map(countries.features.map((f) => [f.properties.ISO_A2, f.properties]))

// Les pays inconnus des données sont ignorés pour ne jamais afficher de code brut
const FEATURES = GEO_FEATURES.map((f) => ({ ...f, countries: f.countries.filter((iso) => ALL_BY_ISO.has(iso)) }))
  .filter((f) => f.countries.length > 0)
const FEATURE_BY_ID = new Map(FEATURES.map((f) => [f.id, f]))

let areaCache = null
function getArea(iso) {
  if (!areaCache) {
    areaCache = new Map(
      countries.features
        .filter((f) => BY_ISO.has(f.properties.ISO_A2))
        .map((f) => [f.properties.ISO_A2, getCountryAreaKm2(f)])
    )
  }
  return areaCache.get(iso) ?? 0
}

function pick(arr, random) {
  return arr[Math.floor(random() * arr.length)]
}

function pickWeighted(weights, random) {
  const entries = Object.entries(weights)
  let roll = random() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    roll -= w
    if (roll < 0) return key
  }
  return entries[entries.length - 1][0]
}

function sample(arr, n, random) {
  const copy = [...arr]
  const out = []
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(random() * copy.length), 1)[0])
  }
  return out
}

function shuffle(arr, random) {
  return sample(arr, arr.length, random)
}

// Prend `n` éléments de `candidates` en privilégiant le score de proximité le plus élevé
// (même chaîne, même continent…), au hasard parmi les ex æquo, pour que les mauvaises réponses restent plausibles
function pickRanked(candidates, n, random, score) {
  const byScore = new Map()
  for (const c of candidates) {
    const s = score(c)
    if (!byScore.has(s)) byScore.set(s, [])
    byScore.get(s).push(c)
  }
  const chosen = []
  for (const s of [...byScore.keys()].sort((a, b) => b - a)) {
    chosen.push(...sample(byScore.get(s), n - chosen.length, random))
    if (chosen.length === n) break
  }
  return chosen.length === n ? chosen : null
}

const pickPreferring = (candidates, n, random, preferred) =>
  pickRanked(candidates, n, random, (c) => (preferred(c) ? 1 : 0))

const difficultyRank = (d) => QUIZ_DIFFICULTIES.indexOf(d)

// Pays d'une liste qui respectent la difficulté autorisée ; à défaut, la liste entière
function allowedIsos(isos, allowed) {
  const ok = isos.filter((iso) => allowed.includes(BY_ISO.get(iso)?.Difficulty))
  return ok.length ? ok : isos
}

const countryDifficulty = (iso) => BY_ISO.get(iso)?.Difficulty ?? 'Impossible'

const countryChoice = (iso) => ({ id: `country:${iso}`, kind: 'country', value: iso })
const featureChoice = (f) => ({ id: `feature:${f.id}`, kind: 'feature', value: f.id })
const mouthChoice = (key) => ({ id: `mouth:${key}`, kind: 'mouth', value: key })
const continentChoice = (name) => ({ id: `continent:${name}`, kind: 'continent', value: name })

function buildQuestion({ type, promptKey = type, difficulty, params = {}, correct, wrong, accepted = [correct], random, key }) {
  // Éléments sur lesquels porte la question : on évite d'en reparler dans la même partie
  const subjects = [params.feature, correct?.kind === 'feature' ? correct.value : null].filter(Boolean)
  return {
    usedKeys: [key, ...new Set(subjects.map((id) => `subject:${id}`))],
    type,
    promptKey,
    difficulty,
    params,
    choices: wrong ? shuffle([correct, ...wrong], random) : [],
    correctId: correct?.id ?? null,
    accepted,
    key,
  }
}

function featuresAllowed(allowed, filter = () => true) {
  return FEATURES.filter((f) => allowed.includes(f.difficulty) && filter(f))
}

// Distracteurs du même type : d'abord dans les difficultés autorisées, sinon dans toute la base
function featureDistractors(subject, allowed, n, random, exclude) {
  const ok = (f) => f.type === subject.type && f.id !== subject.id && !exclude(f)
  // Une mauvaise réponse obscure s'élimine trop facilement : on reste d'abord dans la difficulté autorisée
  const score = (f) => (allowed.includes(f.difficulty) ? 2 : 0) + (f.continent === subject.continent ? 1 : 0)
  return pickRanked(FEATURES.filter(ok), n, random, score)
}

function countryDistractors(subjectIsos, continent, difficulty, n, random) {
  const excluded = new Set(subjectIsos)
  const ref = BY_ISO.get(subjectIsos[0])
  const neighborhood = new Set(subjectIsos.flatMap((iso) => countryBorders[iso] ?? []))
  // Pas de mauvaise réponse plus obscure que la question elle-même (territoires lointains…)
  const candidates = VALID_COUNTRIES.filter(
    (p) => !excluded.has(p.ISO_A2) && difficultyRank(p.Difficulty) <= Math.max(difficultyRank(difficulty), 1)
  )
  // Voisins d'abord, puis même continent : un intrus lointain rendrait la question triviale
  const score = (p) => (neighborhood.has(p.ISO_A2) ? 2 : 0) + (p.continent === (continent ?? ref?.continent) ? 1 : 0)
  return pickRanked(candidates, n, random, score)?.map((p) => p.ISO_A2) ?? null
}

const generators = {
  // « Dans quel pays se trouve X ? » / « Dans lequel de ces pays trouve-t-on X ? »
  feature_country(allowed, random, mode) {
    const subject = pick(featuresAllowed(allowed), random)
    if (!subject) return null
    const many = subject.countries.length > 1
    const promptKey = many
      ? `${subject.type === 'river' ? 'river' : 'feature'}_country_many${mode === ANSWER_MODES.FREE ? '_free' : ''}`
      : `${subject.type === 'island' ? 'island' : subject.type === 'river' ? 'river' : 'feature'}_country_one`
    const wrong = mode === ANSWER_MODES.FREE ? null : countryDistractors(subject.countries, subject.continent, subject.difficulty, 3, random)
    if (mode !== ANSWER_MODES.FREE && !wrong) return null
    const answerIso = pick(allowedIsos(subject.countries, allowed), random)
    return buildQuestion({
      type: 'feature_country',
      promptKey,
      difficulty: mode === ANSWER_MODES.FREE ? subject.difficulty : hardest([subject.difficulty, countryDifficulty(answerIso)]),
      params: { feature: subject.id },
      correct: countryChoice(answerIso),
      wrong: wrong?.map(countryChoice),
      accepted: subject.countries.map(countryChoice),
      random,
      key: `feature_country:${subject.id}`,
    })
  },

  // « Pays X : quel lac se trouve dans ce pays ? »
  country_feature(allowed, random) {
    const subject = pick(featuresAllowed(allowed), random)
    if (!subject) return null
    const iso = pick(allowedIsos(subject.countries, allowed), random)
    const wrong = featureDistractors(subject, allowed, 3, random, (f) => f.countries.includes(iso))
    if (!wrong) return null
    return buildQuestion({
      type: 'country_feature',
      promptKey: `country_${subject.type}`,
      difficulty: hardest([subject.difficulty, countryDifficulty(iso)]),
      params: { country: iso },
      correct: featureChoice(subject),
      wrong: wrong.map(featureChoice),
      random,
      key: `country_feature:${subject.type}:${iso}`,
    })
  },

  feature_continent(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.continent), random)
    if (!subject) return null
    const others = CONTINENTS.map((c) => c.name).filter((c) => c !== subject.continent)
    return buildQuestion({
      type: 'feature_continent',
      difficulty: subject.difficulty,
      params: { feature: subject.id },
      correct: continentChoice(subject.continent),
      wrong: sample(others, 3, random).map(continentChoice),
      random,
      key: `feature_continent:${subject.id}`,
    })
  },

  river_mouth(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.type === 'river' && f.mouth), random)
    if (!subject) return null
    // Embouchures des autres cours d'eau du même continent en priorité
    const otherMouths = [...new Set(
      FEATURES.filter((f) => f.type === 'river' && f.mouth && f.mouth !== subject.mouth)
        .sort((a, b) => (b.continent === subject.continent) - (a.continent === subject.continent))
        .map((f) => f.mouth)
    )]
    const nearby = otherMouths.slice(0, 6)
    const wrong = sample(nearby, 3, random)
    if (wrong.length < 3) return null
    return buildQuestion({
      type: 'river_mouth',
      difficulty: subject.difficulty,
      params: { feature: subject.id },
      correct: mouthChoice(subject.mouth),
      wrong: wrong.map(mouthChoice),
      random,
      key: `river_mouth:${subject.id}`,
    })
  },

  river_city(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.type === 'river' && f.cities?.length), random)
    if (!subject) return null
    const wrong = featureDistractors(subject, allowed, 3, random, () => false)
    if (!wrong) return null
    const city = pick(subject.cities, random)
    return buildQuestion({
      type: 'river_city',
      difficulty: subject.difficulty,
      params: { city },
      correct: featureChoice(subject),
      wrong: wrong.map(featureChoice),
      random,
      key: `river_city:${city.fr}`,
    })
  },

  mountain_range(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.type === 'mountain' && FEATURE_BY_ID.has(f.range)), random)
    if (!subject) return null
    const rangeFeature = FEATURE_BY_ID.get(subject.range)
    const wrong = featureDistractors(rangeFeature, QUIZ_DIFFICULTIES, 3, random, () => false)
    if (!wrong) return null
    return buildQuestion({
      type: 'mountain_range',
      difficulty: subject.difficulty,
      params: { feature: subject.id },
      correct: featureChoice(rangeFeature),
      wrong: wrong.map(featureChoice),
      random,
      key: `mountain_range:${subject.id}`,
    })
  },

  highest_point(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.type === 'mountain' && f.highestOf?.length), random)
    if (!subject) return null
    const iso = pick(allowedIsos(subject.highestOf.filter((c) => ALL_BY_ISO.has(c)), allowed), random)
    if (!iso) return null
    const wrong = featureDistractors(subject, allowed, 3, random, (f) => f.countries.includes(iso))
    if (!wrong) return null
    return buildQuestion({
      type: 'highest_point',
      difficulty: hardest([subject.difficulty, countryDifficulty(iso)]),
      params: { country: iso },
      correct: featureChoice(subject),
      wrong: wrong.map(featureChoice),
      random,
      key: `highest_point:${iso}`,
    })
  },

  mountain_height(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.type === 'mountain'), random)
    if (!subject) return null
    const wrong = featureDistractors(subject, allowed, 3, random, () => false)
    if (!wrong) return null
    return buildQuestion({
      type: 'mountain_height',
      difficulty: subject.difficulty,
      params: { height: subject.height, countries: subject.countries },
      correct: featureChoice(subject),
      wrong: wrong.map(featureChoice),
      random,
      key: `mountain_height:${subject.id}`,
    })
  },

  range_highest(allowed, random) {
    const subject = pick(featuresAllowed(allowed, (f) => f.type === 'range' && FEATURE_BY_ID.has(f.highest)), random)
    if (!subject) return null
    const top = FEATURE_BY_ID.get(subject.highest)
    // Les autres sommets de la même chaîne font les meilleurs pièges
    const wrong = pickRanked(
      FEATURES.filter((f) => f.type === 'mountain' && f.id !== top.id),
      3, random, (f) => (f.range === subject.id ? 2 : 0) + (f.continent === top.continent ? 1 : 0)
    )
    if (!wrong) return null
    return buildQuestion({
      type: 'range_highest',
      difficulty: hardest([subject.difficulty, top.difficulty]),
      params: { feature: subject.id },
      correct: featureChoice(top),
      wrong: wrong.map(featureChoice),
      random,
      key: `range_highest:${subject.id}`,
    })
  },

  longest_river(allowed, random) {
    return superlativeFeature(allowed, random, 'longest_river', (f) => f.type === 'river' && f.length, (f) => f.length, 1.15)
  },

  highest_mountain(allowed, random) {
    return superlativeFeature(allowed, random, 'highest_mountain', (f) => f.type === 'mountain', (f) => f.height, 1.05)
  },

  neighbor(allowed, random) {
    const pool = VALID_COUNTRIES.filter((p) => allowed.includes(p.Difficulty))
    const inPool = new Set(pool.map((p) => p.ISO_A2))
    const subject = pick(pool.filter((p) => (countryBorders[p.ISO_A2] ?? []).some((b) => inPool.has(b))), random)
    if (!subject) return null
    const borders = new Set(countryBorders[subject.ISO_A2])
    const neighbor = pick([...borders].filter((b) => inPool.has(b)), random)
    // Intrus pris parmi les voisins des voisins : proches sans être frontaliers
    const secondRing = [...new Set([...borders].flatMap((b) => countryBorders[b] ?? []))]
      .filter((iso) => iso !== subject.ISO_A2 && !borders.has(iso) && BY_ISO.has(iso))
    const wrong = pickPreferring(
      VALID_COUNTRIES.filter((p) => p.ISO_A2 !== subject.ISO_A2 && !borders.has(p.ISO_A2) && p.continent === subject.continent),
      3, random, (p) => secondRing.includes(p.ISO_A2)
    )
    if (!wrong) return null
    return buildQuestion({
      type: 'neighbor',
      difficulty: subject.Difficulty,
      params: { country: subject.ISO_A2 },
      correct: countryChoice(neighbor),
      wrong: wrong.map((p) => countryChoice(p.ISO_A2)),
      random,
      key: `neighbor:${subject.ISO_A2}`,
    })
  },

  not_neighbor(allowed, random) {
    const pool = VALID_COUNTRIES.filter((p) => allowed.includes(p.Difficulty))
    const subject = pick(pool.filter((p) => (countryBorders[p.ISO_A2] ?? []).filter((b) => BY_ISO.has(b)).length >= 3), random)
    if (!subject) return null
    const borders = new Set(countryBorders[subject.ISO_A2])
    const neighbors = sample([...borders].filter((b) => BY_ISO.has(b)), 3, random)
    const secondRing = [...new Set([...borders].flatMap((b) => countryBorders[b] ?? []))]
      .filter((iso) => iso !== subject.ISO_A2 && !borders.has(iso) && BY_ISO.has(iso))
    const outsider = pick(secondRing, random)
    if (!outsider) return null
    return buildQuestion({
      type: 'not_neighbor',
      difficulty: subject.Difficulty,
      params: { country: subject.ISO_A2 },
      correct: countryChoice(outsider),
      wrong: neighbors.map(countryChoice),
      random,
      key: `not_neighbor:${subject.ISO_A2}`,
    })
  },

  neighbor_free(allowed, random) {
    const pool = VALID_COUNTRIES.filter((p) => allowed.includes(p.Difficulty))
    const subject = pick(pool.filter((p) => (countryBorders[p.ISO_A2] ?? []).some((b) => ALL_BY_ISO.has(b))), random)
    if (!subject) return null
    return buildQuestion({
      type: 'neighbor_free',
      difficulty: subject.Difficulty,
      params: { country: subject.ISO_A2 },
      correct: null,
      accepted: countryBorders[subject.ISO_A2].filter((b) => ALL_BY_ISO.has(b)).map(countryChoice),
      random,
      key: `neighbor:${subject.ISO_A2}`,
    })
  },
}

function superlativeFeature(allowed, random, type, filter, getValue, minRatio) {
  const picked = sample(featuresAllowed(allowed, filter), 4, random)
  if (picked.length < 4) return null
  const sorted = [...picked].sort((a, b) => getValue(b) - getValue(a))
  if (getValue(sorted[0]) < getValue(sorted[1]) * minRatio) return null
  return buildQuestion({
    type,
    difficulty: hardest(picked.map((f) => f.difficulty)),
    correct: featureChoice(sorted[0]),
    wrong: sorted.slice(1).map(featureChoice),
    random,
    key: `${type}:${picked.map((f) => f.id).sort().join(',')}`,
  })
}

function curatedToQuestion(q, random, prefix = 'curated') {
  const correct = { id: 'answer', kind: 'text', value: q.answer }
  const wrong = q.wrong.map((w, i) => ({ id: `wrong${i}`, kind: 'text', value: w }))
  return {
    ...buildQuestion({ type: 'curated', difficulty: q.difficulty, correct, wrong, random, key: `${prefix}:${q.id}` }),
    usedKeys: [`${prefix}:${q.id}`],
    text: q.question,
    fact: q.fact,
    accept: q.accept ?? [],
  }
}

/**
 * Tire une nouvelle question de la difficulté demandée.
 * Les éléments plus faciles restent utilisables comme ingrédients (un lac facile dans un pays
 * difficile donne une question difficile), mais la question elle-même doit avoir cette difficulté.
 * `usedKeys` évite de reposer une question déjà vue dans la session.
 */
export function generateQuestion(
  difficulty, usedKeys = new Set(), random = Math.random, answerMode = ANSWER_MODES.CHOICES,
  weights = TEMPLATES[answerMode] ?? TEMPLATES.choices
) {
  const allowed = getAllowedDifficulties(difficulty)
  const curatedPool = curatedQuestions.filter(
    (q) => q.difficulty === difficulty && !usedKeys.has(`curated:${q.id}`)
  )

  if (curatedPool.length && random() < CURATED_RATIO) {
    return curatedToQuestion(pick(curatedPool, random), random)
  }

  // Repli, du meilleur au pire : bonne difficulté mais déjà vue, puis plus facile mais inédite
  let alreadySeen = null
  let easier = null
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const type = pickWeighted(weights, random)
    const question = generators[type](allowed, random, answerMode)
    if (!question || !allowed.includes(question.difficulty)) continue
    const isNew = !question.usedKeys.some((k) => usedKeys.has(k))
    if (question.difficulty === difficulty) {
      if (isNew) return question
      alreadySeen = alreadySeen ?? question
    } else if (isNew) {
      easier = easier ?? question
    }
  }
  if (alreadySeen) return alreadySeen
  if (curatedPool.length) return curatedToQuestion(pick(curatedPool, random), random)
  return easier
}

// ─── Histoire ──────────────────────────────────────────────────────────────

// Pays qui ont assez de questions d'histoire pour un quiz à eux seuls (codes ISO). Les autres
// (la Belgique pour Waterloo…) n'apparaissent que dans le quiz d'histoire général.
const MIN_COUNTRY_QUESTIONS = 5
const historyCountByCountry = historyQuestions.flatMap((q) => q.countries)
  .reduce((counts, iso) => counts.set(iso, (counts.get(iso) ?? 0) + 1), new Map())
export const HISTORY_COUNTRIES = [...historyCountByCountry]
  .filter(([, count]) => count >= MIN_COUNTRY_QUESTIONS)
  .map(([iso]) => iso)

/**
 * Tire une question d'histoire inédite. Avec `country`, seulement les questions sur ce pays,
 * de la plus facile à la plus difficile, quelle que soit la difficulté choisie.
 * Renvoie null quand il n'en reste plus : la partie s'arrête là.
 */
export function generateHistoryQuestion(difficulty, usedKeys = new Set(), random = Math.random, country = null) {
  const pool = historyQuestions.filter(
    (q) => !usedKeys.has(`history:${q.id}`) && (!country || q.countries.includes(country))
  )
  let candidates
  if (country) {
    const rank = (q) => QUIZ_DIFFICULTIES.indexOf(q.difficulty)
    const easiest = Math.min(...pool.map(rank))
    candidates = pool.filter((q) => rank(q) === easiest)
  } else {
    // Comme pour le quiz géo : la difficulté choisie d'abord, puis les plus faciles une fois épuisée
    const allowed = getAllowedDifficulties(difficulty)
    const exact = pool.filter((q) => q.difficulty === difficulty)
    candidates = exact.length ? exact : pool.filter((q) => allowed.includes(q.difficulty))
  }
  return candidates.length ? curatedToQuestion(pick(candidates, random), random, 'history') : null
}

// ─── Question du jour ──────────────────────────────────────────────────────

// Jamais facile (sans intérêt pour un défi entre amis) ni impossible (trop obscur)
const DAILY_DIFFICULTY_WEIGHTS = { Moyen: 1, Difficile: 1 }

// Le continent se devine presque au hasard (5 possibilités) : sans intérêt comme question du jour
const { feature_continent: _continent, ...DAILY_TEMPLATES } = TEMPLATES.free

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return hash
}

// Nombre de jours pendant lesquels on évite de reparler du même sujet
const DAILY_HISTORY_DAYS = 30
// Premier jour de la question du jour : point de départ de la suite des tirages
const DAILY_EPOCH = '2026-10-01'
const dailyCache = new Map()

function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

function drawDaily(dateKey, usedKeys) {
  const random = mulberry32(hashString(`quiz:${dateKey}`))
  const difficulty = pickWeighted(DAILY_DIFFICULTY_WEIGHTS, random)
  return generateQuestion(difficulty, usedKeys, random, ANSWER_MODES.FREE, DAILY_TEMPLATES)
}

/**
 * Question du jour : la même pour tout le monde à une date donnée, toujours en réponse libre.
 * Les sujets tirés les jours précédents sont écartés, pour ne pas retomber sur le mont Blanc chaque semaine.
 */
export function getDailyQuestion(dateKey) {
  // On rejoue chaque jour depuis le lancement, chacun évitant les sujets des DAILY_HISTORY_DAYS jours
  // d'avant : tout le monde obtient exactement la même suite. Un tirage coûte ~0,1 ms, donc même
  // après des années on reste bien sous la seconde, et le résultat est gardé en cache.
  let day = DAILY_EPOCH < dateKey ? DAILY_EPOCH : dateKey
  while (!dailyCache.has(dateKey)) {
    if (!dailyCache.has(day)) {
      const recent = new Set()
      for (let i = 1; i <= DAILY_HISTORY_DAYS; i++) {
        dailyCache.get(shiftDateKey(day, -i))?.usedKeys.forEach((k) => recent.add(k))
      }
      dailyCache.set(day, drawDaily(day, recent))
    }
    day = shiftDateKey(day, 1)
  }
  return dailyCache.get(dateKey)
}

// ─── Affichage ─────────────────────────────────────────────────────────────

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

function localizeText(text, lang) {
  return text?.[lang] ?? text?.en ?? text?.fr ?? ''
}

function countryLabel(iso, lang) {
  return getCountryName(iso, lang) ?? ALL_BY_ISO.get(iso)?.ADMIN ?? iso
}

function featureName(id, lang) {
  return localizeText(FEATURE_BY_ID.get(id)?.name, lang)
}

function choiceLabel(choice, lang, t) {
  switch (choice.kind) {
    case 'country': return countryLabel(choice.value, lang)
    case 'feature': return capitalize(featureName(choice.value, lang))
    case 'mouth': return capitalize(localizeText(MOUTHS[choice.value], lang))
    case 'continent': return t(`continents.${choice.value}`)
    default: return localizeText(choice.value, lang)
  }
}

export function localizeQuestion(question, lang, t) {
  const { params } = question
  let prompt
  if (question.type === 'curated') {
    prompt = localizeText(question.text, lang)
  } else {
    prompt = capitalize(t(`quiz.questions.${question.promptKey}`, {
      feature: params.feature ? featureName(params.feature, lang) : '',
      country: params.country ? countryLabel(params.country, lang) : '',
      countries: params.countries ? params.countries.map((iso) => countryLabel(iso, lang)).join(' / ') : '',
      city: params.city ? localizeText(params.city, lang) : '',
      height: params.height ? params.height.toLocaleString(localeOf(lang, 'fr')) : '',
    }))
  }
  const choices = question.choices.map((c) => ({ id: c.id, label: choiceLabel(c, lang, t) }))
  const correctChoice = question.choices.find((c) => c.id === question.correctId)
  const answers = correctChoice && question.accepted.length === 1 ? [correctChoice] : question.accepted
  return {
    prompt,
    choices,
    answer: answers.map((c) => choiceLabel(c, lang, t)).join(', '),
    multipleAnswers: answers.length > 1,
    fact: question.fact ? localizeText(question.fact, lang) : null,
  }
}

// ─── Indices ───────────────────────────────────────────────────────────────

export const MAX_HINTS = 3

// Article en tête d'un nom (« le Nil », « the Nile », « el Nilo », « der Nil », « il Nilo »…)
const ARTICLE_RE = /^(?:(?:les?|la|the|el|los|las|o|os|a|as|der|die|das|il|lo|gli|i)\s+|l['’])(?=\p{L})/iu

// Lettres masquées : `reveal(index)` décide, pour chaque mot, quelles lettres montrer
function maskAnswer(label, reveal) {
  return label.split(' ').map((word) => {
    let letterIndex = 0
    return [...word].map((char) => {
      if (!/\p{L}|\p{N}/u.test(char)) return char
      return reveal(letterIndex++) ? char : '_'
    }).join(' ')
  }).join('   ')
}

function contextHint(question, choice, lang, t) {
  const { params } = question
  if (choice.kind === 'country') {
    const continent = BY_ISO.get(choice.value)?.continent
    return continent ? t('quiz.hints.continent', { continent: t(`continents.${continent}`) }) : null
  }
  if (choice.kind !== 'feature') return null
  const f = FEATURE_BY_ID.get(choice.value)
  if (!f) return null
  if (f.type === 'mountain' && f.height && question.type !== 'mountain_height') {
    return t('quiz.hints.height', { height: f.height.toLocaleString(localeOf(lang, 'fr')) })
  }
  if (f.type === 'river' && f.length) {
    return t('quiz.hints.river_length', { length: f.length.toLocaleString(localeOf(lang, 'fr')) })
  }
  // Inutile de rappeler le pays quand la question le donne déjà
  if (!params.country && f.countries.length) {
    return t('quiz.hints.located_in', { countries: f.countries.map((iso) => countryLabel(iso, lang)).join(', ') })
  }
  return null
}

/**
 * Indices progressifs pour la réponse libre, du plus vague au plus révélateur.
 * Renvoie toujours MAX_HINTS indices.
 */
export function getQuestionHints(question, lang, t) {
  const target = question.choices.find((c) => c.id === question.correctId) ?? question.accepted[0]
  if (!target) return []
  // L'article n'aide pas à deviner et brouillerait les lettres masquées
  const label = choiceLabel(target, lang, t).replace(ARTICLE_RE, '')
  if (/^\d+$/.test(label)) {
    // Fourchettes décentrées : leur milieu ne doit pas donner la réponse
    const n = Number(label)
    return [
      t('quiz.hints.digits', { count: label.length }),
      t('quiz.hints.between', { min: Math.floor(n * 0.5), max: Math.ceil(n * 1.2) }),
      t('quiz.hints.between', { min: Math.floor(n * 0.8), max: Math.ceil(n * 1.1) }),
    ]
  }
  const prefix = question.accepted.length > 1 ? `${t('quiz.hints.one_of')} ` : ''
  const letterCount = [...label].filter((c) => /\p{L}|\p{N}/u.test(c)).length

  const blank = `${prefix}${maskAnswer(label, () => false)} — ${t('quiz.hints.letters', { count: letterCount })}`
  const initials = `${prefix}${maskAnswer(label, (i) => i === 0)}`
  const half = `${prefix}${maskAnswer(label, (i) => i % 2 === 0)}`

  const context = contextHint(question, target, lang, t)
  return context ? [context, initials, half] : [blank, initials, half]
}

// ─── Réponse libre ─────────────────────────────────────────────────────────

// Mots génériques retirés pour accepter les formes courtes : « le lac Baïkal » → « Baïkal »,
// « la mer Caspienne » → « Caspienne », « the Gulf of Mexico » → « Mexico »
const GENERIC_PREFIXES = [
  'le ', 'la ', 'les ', "l'", 'l’', 'the ', 'de ', 'du ', 'des ', "d'", 'd’', 'of ',
  'lac ', 'lake ', 'mont ', 'mount ', 'monts ', 'pic ', 'mer ', 'sea ', 'océan ', 'ocean ',
  'golfe ', 'gulf ', 'baie ', 'bay ', 'canal ', 'désert ', 'chutes ', 'chaîne ', 'cordillère ',
  'fleuve ', 'île ', 'îles ', 'terre ',
  'озеро ', 'гора ', 'море ', 'пустыня ', 'водопад ', 'водопады ', 'остров ', 'пик ', 'вулкан ',
  // es, pt, it
  'el ', 'los ', 'las ', 'o ', 'os ', 'a ', 'as ', 'il ', 'lo ', 'gli ', 'i ', 'del ', 'do ', 'da ', 'dos ', 'das ', 'di ',
  'río ', 'rio ', 'fiume ', 'lago ', 'monte ', 'montes ', 'monti ', 'mar ', 'mare ', 'océano ', 'oceano ', 'golfo ',
  'bahía ', 'baía ', 'baia ', 'canal ', 'canale ', 'desierto ', 'deserto ', 'cataratas ', 'cascate ', 'cascata ',
  'isla ', 'islas ', 'ilha ', 'ilhas ', 'isola ', 'isole ', 'cordillera ', 'cordilheira ', 'catena ', 'sierra ', 'serra ',
  'pico ', 'picco ', 'volcán ', 'vulcão ', 'vulcano ',
  // de
  'der ', 'die ', 'das ', 'den ', 'see ', 'berg ', 'golf ', 'wüste ', 'insel ',
]
const GENERIC_SUFFIXES = [
  ' river', ' desert', ' mountains', ' range', ' falls', ' island', ' islands', ' lake', ' sea', ' ocean',
  ' залив', ' море', ' озеро', ' горы', ' хребет', ' океан',
  ' fluss', ' gebirge', ' wasserfälle', ' wasserfall', ' wüste', ' inseln', ' insel',
]

function shortForms(name) {
  const forms = new Set([name])
  let current = name.toLowerCase()
  for (let changed = true; changed;) {
    changed = false
    for (const prefix of GENERIC_PREFIXES) {
      if (current.startsWith(prefix) && current.length > prefix.length + 2) {
        current = current.slice(prefix.length)
        forms.add(current)
        changed = true
      }
    }
    for (const suffix of GENERIC_SUFFIXES) {
      if (current.endsWith(suffix) && current.length > suffix.length + 2) {
        current = current.slice(0, -suffix.length)
        forms.add(current)
        changed = true
      }
    }
  }
  return [...forms]
}

function countryAnswers(iso) {
  const p = ALL_BY_ISO.get(iso)
  if (!p) return []
  // Les noms affichés dans chaque langue doivent toujours être acceptés, en plus des alias
  return [...getAllCountryNames(iso, p.ADMIN, p.aliases ?? []), ...LANGS.map((l) => countryLabel(iso, l))]
}

function choiceAnswers(choice) {
  switch (choice.kind) {
    case 'country': return countryAnswers(choice.value)
    case 'feature': {
      const f = FEATURE_BY_ID.get(choice.value)
      return f ? [...Object.values(f.name), ...(f.accept ?? [])] : []
    }
    case 'mouth': return Object.values(MOUTHS[choice.value] ?? {})
    case 'continent': return CONTINENT_ANSWERS[choice.value] ?? [choice.value]
    default: return Object.values(choice.value ?? {})
  }
}

const knownCache = new Map()

// Réponses « concurrentes » : une saisie plus proche d'une autre réponse n'est pas acceptée comme faute de frappe
function knownAnswersFor(question, choice) {
  if (question.type === 'curated') return question.choices.flatMap(choiceAnswers).flatMap(shortForms)
  const cacheKey = choice.kind === 'feature' ? `feature:${FEATURE_BY_ID.get(choice.value)?.type}` : choice.kind
  if (!knownCache.has(cacheKey)) {
    let all
    if (choice.kind === 'country') all = VALID_COUNTRIES.map((p) => countryChoice(p.ISO_A2))
    else if (choice.kind === 'feature') all = FEATURES.filter((f) => `feature:${f.type}` === cacheKey).map(featureChoice)
    else if (choice.kind === 'mouth') all = Object.keys(MOUTHS).map(mouthChoice)
    else all = Object.keys(CONTINENT_ANSWERS).map(continentChoice)
    knownCache.set(cacheKey, all.flatMap(choiceAnswers).flatMap(shortForms))
  }
  return knownCache.get(cacheKey)
}

/**
 * Vérifie une réponse libre. Renvoie le résultat de matchAnswer ({ match, name }) ou null.
 */
export function checkFreeAnswer(question, input) {
  const accepted = [...question.accepted.flatMap(choiceAnswers), ...(question.accept ?? [])].flatMap(shortForms)
  return matchAnswer(input, accepted, knownAnswersFor(question, question.accepted[0]), {
    coreOf: (name) => shortForms(name).at(-1),
  })
}
