// src/utils/dateUtils.js
export function getLast7Days(todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number)
  const baseDate = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const label =
      i === 0 ? "Aujourd'hui" :
      i === 1 ? 'Hier' :
      date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return { key, label }
  })
}
