// Filter for offensive usernames (French, English, Spanish, Portuguese, German, Italian, Russian, Ukrainian), shared by the
// website and the app.
// Pure functions, no DOM: containsProfanity(name) is true when the name should be refused.
//
// The word list is src/data/bannedWords.json. Two kinds of words, to avoid Scunthorpe-style false positives:
//  - 'substring': refused anywhere in the name ("connard", "fuck", ...).
//  - 'word': refused only as a whole word, i.e. the whole name or a part separated by spaces, dots, dashes,
//    underscores or digits ("cunt" is in Scunthorpe, "nique" in Monique, "anal" in Analyse).
//
// Obfuscation handled: case, accents and other diacritics, full-width letters, repeated letters ("fuuuck"),
// separators inside a word ("f.u.c.k", "n a z i"), simple leetspeak (5h1t, @ss, $hit, p0rn) and look-alike letters
// across alphabets in both directions (a Cyrillic "с" in "сonnard", Latin "pидор"). Russian is also matched
// when written in Latin letters ("pidor", "blyat"). It is a deterrent, not a guarantee: determined players can
// always find a spelling that gets through.
import banned from '../data/bannedWords.json'

const MAX_LENGTH = 200 // usernames are 20 characters at most; this only bounds the work on absurd input

const CYRILLIC = /[Ѐ-ӿ]/

// Look-alike letters, Cyrillic (and a few Greek ones) read as Latin and the other way round.
const TO_LATIN = {
  а: 'a', в: 'b', е: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x',
  і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ӏ: 'l', ο: 'o', α: 'a', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ρ: 'p', τ: 't', υ: 'u', χ: 'x',
}
const TO_CYRILLIC = {
  a: 'а', b: 'в', e: 'е', k: 'к', m: 'м', h: 'н', o: 'о', p: 'р', c: 'с', t: 'т', y: 'у', x: 'х',
  i: 'и', u: 'и', n: 'п', d: 'д', z: 'з',
}

// Digits and symbols read as letters. "1" is ambiguous (i or l), and without any substitution a number
// stuck to a word ("pute123") is just a separator.
const LEET = { 0: 'o', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '+': 't', '!': 'i', '|': 'l', '€': 'e' }
const LATIN_READINGS = [{}, { ...LEET, 1: 'i' }, { ...LEET, 1: 'l' }]
const CYRILLIC_READINGS = [
  {},
  { 0: 'о', 3: 'з', 4: 'ч', 6: 'б', '@': 'а', $: 'с' },
  { 0: 'о', 3: 'е', 1: 'и', '@': 'а', $: 'с' },
]

const mapChars = (text, map) => Array.from(text, (char) => map[char] ?? char).join('')

// Lowercase, no diacritics (é, ё and й become e, е and и), no invisible characters, width/compatibility forms unified.
const simplify = (text) => text.toLowerCase().normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu, '')

// A word as a regex: every letter may be repeated ("fuuuck"), a doubled letter ("gg") must be at least doubled,
// so that "Niger" (a country) is not "nigger".
function wordPattern(word) {
  const letters = simplify(word).replace(/[^\p{L}]/gu, '')
  const runs = letters.match(/(.)\1*/gu) ?? []
  return { letters: letters.length, source: runs.map((run) => `${run[0]}{${run.length},}`).join('') }
}

function compile(kind) {
  const lists = { latin: { whole: [], inside: [] }, cyrillic: { whole: [], inside: [] } }
  const target = kind === 'word' ? 'whole' : 'inside'
  for (const words of Object.values(banned[kind])) {
    for (const word of words) {
      const { letters, source } = wordPattern(word)
      if (!letters) continue
      const entry = { letters, regex: new RegExp(target === 'whole' ? `^${source}$` : source, 'u') }
      lists[CYRILLIC.test(word) ? 'cyrillic' : 'latin'][target].push(entry)
    }
  }
  return lists
}
const wholeLists = compile('word')
const insideLists = compile('substring')
const LISTS = {
  latin: { whole: wholeLists.latin.whole, inside: insideLists.latin.inside },
  cyrillic: { whole: wholeLists.cyrillic.whole, inside: insideLists.cyrillic.inside },
}

// "1488" (neo-Nazi number), possibly spread out ("14 88", "14.88")
const SEPARATOR = '[\\s._-]*'
const NUMBER_PATTERNS = banned.digits.map(
  (digits) => new RegExp(`(?<!\\d)${Array.from(digits).join(SEPARATOR)}(?!\\d)`)
)

// Letter groups of a reading; single letters next to each other are one word ("f u c k", "f.u.c.k").
function wordsOf(reading) {
  const parts = reading.split(/[^\p{L}]+/u).filter(Boolean)
  const words = []
  let singles = ''
  for (const part of parts) {
    if (part.length === 1) {
      singles += part
      continue
    }
    if (singles) words.push(singles)
    singles = ''
    words.push(part)
  }
  if (singles) words.push(singles)
  return words
}

// Words long enough to be looked for in the whole name with the separators removed ("con nard").
const SPREAD_MIN_LETTERS = 6

function matches(words, lists) {
  for (const word of words) {
    if (lists.whole.some(({ regex }) => regex.test(word))) return true
    if (lists.inside.some(({ regex }) => regex.test(word))) return true
  }
  if (words.length > 1) {
    const joined = words.join('')
    if (lists.whole.some(({ regex }) => regex.test(joined))) return true
    if (lists.inside.some(({ letters, regex }) => letters >= SPREAD_MIN_LETTERS && regex.test(joined))) return true
  }
  return false
}

// Whether `name` contains an offensive word, however it is disguised.
export function containsProfanity(name) {
  if (typeof name !== 'string') return false
  const text = simplify(name.slice(0, MAX_LENGTH))
  if (!text.trim()) return false

  if (NUMBER_PATTERNS.some((pattern) => pattern.test(text))) return true

  for (const reading of LATIN_READINGS) {
    if (matches(wordsOf(mapChars(mapChars(text, reading), TO_LATIN)), LISTS.latin)) return true
  }
  for (const reading of CYRILLIC_READINGS) {
    if (matches(wordsOf(mapChars(mapChars(text, reading), TO_CYRILLIC)), LISTS.cyrillic)) return true
  }
  return false
}
