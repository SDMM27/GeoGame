// src/utils/serverTime.js
// Calibre l'horloge locale par rapport au serveur Firestore via un aller-retour.
// offset = serverTime - localMidpoint (positif si l'horloge locale est en retard)
// serverNow() = Date.now() + offset ≈ heure serveur courante

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../Firebase'

// The probe document is not deleted (the rules do not allow it): the daily cleanup (api/cleanup-expired.mjs) removes it,
// based on `t`. No expiresAt: computed from the local clock, it would get the probe of a wrong clock rejected.
// Au-delà, le point milieu de l'aller-retour n'est plus fiable (écriture restée en file hors ligne…)
const MAX_ROUND_TRIP_MS = 10000

let offset = 0
let calibrated = false
let calibrationPromise = null

export function calibrateServerTime() {
  if (calibrationPromise) return calibrationPromise

  const id = Math.random().toString(36).slice(2, 10)
  const ref = doc(firestore, '_clockSync', id)
  const localBefore = Date.now()

  calibrationPromise = setDoc(ref, { t: serverTimestamp() })
    .then(() => getDoc(ref))
    .then((snap) => {
      const localAfter = Date.now()
      if (!snap.exists() || localAfter - localBefore > MAX_ROUND_TRIP_MS) {
        calibrationPromise = null  // mesure inexploitable : on réessaiera
        return
      }
      const serverTime = snap.data().t.toMillis()
      offset = serverTime - Math.round((localBefore + localAfter) / 2)
      calibrated = true
    })
    .catch(() => {
      calibrationPromise = null  // permet de réessayer
    })

  return calibrationPromise
}

export const isServerTimeCalibrated = () => calibrated

// Lance la calibration et rend la main dès qu'elle aboutit, ou après timeoutMs (hors ligne).
export function waitForServerTime(timeoutMs) {
  if (calibrated) return Promise.resolve()
  return Promise.race([calibrateServerTime(), new Promise((resolve) => setTimeout(resolve, timeoutMs))])
}

export const serverNow = () => Date.now() + offset
