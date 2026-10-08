import { describe, it, expect } from 'vitest'
import { containsProfanity } from './profanity'
import { getCountryName } from './getCountryName'
import capitalNames from '../data/capitalNames.json'
import meta from '../data/countries.meta.json'

describe('containsProfanity: offensive names', () => {
  it.each([
    ['plain words', ['connard', 'Fuck', 'ENCULÉ', 'Salope', 'nazi', 'Hitler', 'cunt', 'пидор', 'ХУЙ', 'Блядь', 'сука', 'нахуй']],
    ['accents and case', ['ÉNCULÉ', 'Pédophile', 'FuCk', 'Connasse', 'ПИЗДЕЦ', 'мудак']],
    ['words inside a longer name', ['xXfuckXx', 'big_fuck', 'MrConnard', 'TheHitler99', 'super connard 42', 'великий пидор']],
    ['separators', ['f.u.c.k', 'f u c k', 'c-o-n-n-a-r-d', 'c_u_n_t', 'n.a.z.i', 'n a z i', 'con nard', 'en-culé', 'п.и.д.о.р']],
    ['repeated letters', ['fuuuuck', 'connnnard', 'niiiigger', 'пиздддец', 'Shiiit']],
    ['leetspeak', ['5h1t', 'sh1t', 'fuck', '@sshole', '$hit', 'p0rn', 'b1tch', 'c0nnard', 'n4zi', 'п1д0р']],
    ['digits stuck to a word', ['pute123', 'cunt69', 'nazi88', '1488', '14 88', 'xX1488Xx', 'fuck2000']],
    ['Cyrillic look-alikes in Latin words', ['сonnard', 'fuсk', 'ѕhit', 'cоnnard', 'nаzi', 'Bіtch']],
    ['Latin look-alikes in Russian words', ['пиdор', 'хуй'.replace('х', 'x'), 'cyка'.replace('c', 'с'), 'пидоp', 'мyдак', 'xуй']],
    ['Russian in Latin letters', ['pidor', 'Blyat', 'suka', 'mudak', 'xuy', 'pizdec', 'ebat', 'zaebal']],
    ['hate and sexual terms', ['nigger', 'Faggot', 'rapist', 'пидорас', 'heil hitler', 'sieg_heil', 'whitepower', 'niquer', 'ntm', 'fdp']],
  ])('%s', (_label, names) => {
    names.forEach((name) => expect(containsProfanity(name), name).toBe(true))
  })
})

describe('containsProfanity: legitimate names', () => {
  it('does not flag the Scunthorpe problem names', () => {
    ;['Cassandra', 'Scunthorpe', 'Dickens', 'Assia', 'Pénélope', 'Analyse', 'Kiev', 'Monique', 'Dominique', 'Montenegro', 'Niger', 'Nigeria',
      'Essex', 'Sexton', 'Hancock', 'Peacock', 'Computer', 'Therapist', 'Grape', 'Massachusetts', 'Classic', 'Passion',
      'Assassin', 'Bassam', 'Cumberland', 'Document', 'Titan', 'Title', 'Arsenal', 'Pakistan', 'Nazila', 'Nazim', 'Manchester',
      'Merdeka', 'Huy', 'Hui', 'Suki', 'Kike', 'Mraz', 'Tg', 'PD', 'Bordeaux', 'Culture', 'Vol de nuit'].forEach((name) =>
      expect(containsProfanity(name), name).toBe(false)
    )
  })

  it('does not flag common French, English and Russian names', () => {
    ;['Sacha_27', 'Jean-Éric G.', 'Marie Curie', 'Alexandre', 'Léa', 'Kévin', 'Chloé', 'Thomas', 'Lucas', 'Emma', 'John Smith', 'Peter',
      'Иван', 'Александр', 'Дмитрий', 'Анастасия', 'Сергей', 'Ольга', 'Хусейн', 'Мудрый', 'Сукачёв', 'Любовь', 'Оксана', 'Артём', 'Ёжик',
      'Хуан', 'Скипидар', 'Ebert', 'Pidgeon', 'Mudge', 'Sucre'].forEach((name) => expect(containsProfanity(name), name).toBe(false))
  })

  it('does not flag any country or capital of the game', () => {
    const names = []
    for (const feature of meta.features) {
      const { ISO_A2: iso, ADMIN, capital, aliases = [], capitalAliases = [] } = feature.properties
      names.push(ADMIN, capital, ...aliases, ...capitalAliases)
      for (const lang of ['fr', 'en', 'ru']) names.push(getCountryName(iso, lang))
    }
    for (const entry of Object.values(capitalNames)) names.push(entry.en, entry.ru)
    const unique = [...new Set(names.filter(Boolean))]
    expect(unique.length).toBeGreaterThan(500)
    expect(unique.filter((name) => containsProfanity(name))).toEqual([])
    // also word by word, since a pseudo may be one word of such a name
    const words = [...new Set(unique.flatMap((name) => name.split(/[\s'’-]+/)))]
    expect(words.filter((word) => containsProfanity(word))).toEqual([])
  })

  it('handles empty, odd and very long input', () => {
    expect(containsProfanity('')).toBe(false)
    expect(containsProfanity('   ')).toBe(false)
    expect(containsProfanity(null)).toBe(false)
    expect(containsProfanity(undefined)).toBe(false)
    expect(containsProfanity(42)).toBe(false)
    expect(containsProfanity('!!!---___')).toBe(false)
    expect(containsProfanity('a'.repeat(100000))).toBe(false)
    expect(containsProfanity('n'.repeat(5000) + 'i' + 'g'.repeat(5000))).toBe(false)
    expect(containsProfanity('x'.repeat(10) + ' connard')).toBe(true)
  })
})
