// src/utils/serverTime.js
// Calibre l'horloge locale par rapport au serveur Firestore via un aller-retour.
// offset = serverTime - localMidpoint (positif si l'horloge locale est en retard)
// serverNow() = Date.now() + offset ≈ heure serveur courante

import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { firestore } from '../Firebase'

// The probe document is not deleted (the rules do not allow it): the daily cleanup (api/cleanup-expired.mjs) removes it.
const CLOCK_DOC_TTL_MS = 10 * 60 * 1000

let offset = 0
let calibrationPromise = null

export function calibrateServerTime() {
  if (calibrationPromise) return calibrationPromise

  const id = Math.random().toString(36).slice(2, 10)
  const ref = doc(firestore, '_clockSync', id)
  const localBefore = Date.now()

  calibrationPromise = setDoc(ref, { t: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + CLOCK_DOC_TTL_MS) })
    .then(() => getDoc(ref))
    .then((snap) => {
      const localAfter = Date.now()
      if (snap.exists()) {
        const serverTime = snap.data().t.toMillis()
        offset = serverTime - Math.round((localBefore + localAfter) / 2)
      }
    })
    .catch(() => {
      calibrationPromise = null  // permet de réessayer
    })

  return calibrationPromise
}

export const serverNow = () => Date.now() + offset
