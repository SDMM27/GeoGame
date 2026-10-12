// src/utils/dateUtils.js
import { localeOf, toLanguage } from '../i18n/languages'

const TODAY = { fr: "Aujourd'hui", en: 'Today', es: 'Hoy', pt: 'Hoje', de: 'Heute', it: 'Oggi', ru: 'Сегодня' }
const YESTERDAY = { fr: 'Hier', en: 'Yesterday', es: 'Ayer', pt: 'Ontem', de: 'Gestern', it: 'Ieri', ru: 'Вчера' }

export function getLast7Days(todayKey, lang = 'fr') {
  const code = toLanguage(lang, 'fr')
  const locale = localeOf(code)
  const todayLabel = TODAY[code]
  const yesterdayLabel = YESTERDAY[code]

  const [y, m, d] = todayKey.split('-').map(Number)
  const baseDate = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const label =
      i === 0 ? todayLabel :
      i === 1 ? yesterdayLabel :
      date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    return { key, label }
  })
}
