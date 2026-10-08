// src/utils/dailyKey.js
// Jour du défi quotidien (« 2026-10-08 »), commun à tous les jeux : minuit heure de Paris.
// Calculé avec l'heure du serveur (serverTime.js) pour qu'avancer la date de l'appareil
// ne donne pas accès au défi du lendemain.
import { serverNow } from './serverTime'

export const DAILY_TIME_ZONE = 'Europe/Paris'

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DAILY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function dailyKeyAt(date) {
  return formatter.format(date)
}

export function getDailyKey() {
  return dailyKeyAt(new Date(serverNow()))
}
