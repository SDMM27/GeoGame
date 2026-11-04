// Scroll catalogue at launch (docs/plan-parchemins.md, section 4): { id, era, family, rarity, year }. `family` is 'period'
// (the map was made at the time) or 'atlas' (drawn later). `year` is when the map was made, not the period it shows.
// `era` is one of ERAS. Ids are stable (users/{uid}.scrolls stores them). No JSON: the API bundles this file.
export const ERAS = ['geological', 'antiquity', 'middle_ages', 'discoveries', 'modern']

export const SCROLLS = [
  { id: 'continents-1858', era: 'geological', family: 'period', rarity: 'common', year: 1858 },
  { id: 'egypt-ortelius', era: 'antiquity', family: 'atlas', rarity: 'common', year: 1584 },
  { id: 'turin-papyrus', era: 'antiquity', family: 'period', rarity: 'legendary', year: -1150 },
  { id: 'rome-395', era: 'antiquity', family: 'atlas', rarity: 'common', year: 1923 },
  { id: 'caliphate-750', era: 'middle_ages', family: 'atlas', rarity: 'uncommon', year: 1926 },
  { id: 'holy-roman-empire', era: 'middle_ages', family: 'atlas', rarity: 'uncommon', year: 1926 },
  { id: 'mongol-dominions', era: 'middle_ages', family: 'atlas', rarity: 'uncommon', year: 1923 },
  { id: 'tabula-rogeriana', era: 'middle_ages', family: 'atlas', rarity: 'rare', year: 1928 },
  { id: 'waldseemuller-1507', era: 'discoveries', family: 'period', rarity: 'rare', year: 1507 },
  { id: 'ottoman-empire', era: 'discoveries', family: 'atlas', rarity: 'common', year: 1923 },
  { id: 'russia-growth', era: 'modern', family: 'atlas', rarity: 'common', year: 1923 },
  { id: 'british-empire-1886', era: 'modern', family: 'period', rarity: 'common', year: 1886 },
]
