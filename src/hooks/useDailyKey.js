// src/hooks/useDailyKey.js
import { useEffect, useState } from 'react'
import { getDailyKey } from '../utils/dailyKey'
import { isServerTimeCalibrated, waitForServerTime } from '../utils/serverTime'

const CALIBRATION_TIMEOUT_MS = 4000

/**
 * Jour du défi quotidien à l'heure du serveur, ou null le temps de la lire (un aller-retour Firestore).
 * Sans réseau, l'horloge de l'appareil sert de repli au bout de CALIBRATION_TIMEOUT_MS.
 * `enabled` à false (mode infini, multijoueur) : renvoie null sans contacter le serveur.
 */
export default function useDailyKey(enabled = true) {
  const [dailyKey, setDailyKey] = useState(() => (enabled && isServerTimeCalibrated() ? getDailyKey() : null))

  useEffect(() => {
    if (!enabled || dailyKey) return undefined
    let active = true
    waitForServerTime(CALIBRATION_TIMEOUT_MS).then(() => {
      if (active) setDailyKey(getDailyKey())
    })
    return () => {
      active = false
    }
  }, [enabled, dailyKey])

  return enabled ? dailyKey : null
}
