export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkAnswer(input, target, aliases = [], extraNames = []) {
  const normalizedInput = normalize(input)
  const candidates = [target, ...aliases, ...extraNames].map(normalize)
  return candidates.includes(normalizedInput)
}
