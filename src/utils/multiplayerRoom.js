// src/utils/multiplayerRoom.js
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { firestore } from '../Firebase'

/** Génère un code de room lisible de 6 caractères (sans ambiguïtés O/0/I/1). */
export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/** UUID stable par navigateur, persisté en localStorage (cross-onglets). */
export function getOrCreatePlayerId() {
  let id = localStorage.getItem('mp_player_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('mp_player_id', id)
  }
  return id
}

/**
 * Crée une room dans Firestore et retourne le roomId.
 * @param {{ hostId: string, hostPseudo: string, config: object }} params
 */
export async function createRoom({ hostId, hostPseudo, config }) {
  let roomId = generateRoomId()
  // Retry on collision (extremely rare at ~1 billion possible IDs)
  while ((await getDoc(doc(firestore, 'rooms', roomId))).exists()) {
    roomId = generateRoomId()
  }
  const seed = Math.floor(Math.random() * 2 ** 31)
  await setDoc(doc(firestore, 'rooms', roomId), {
    hostId,
    status: 'lobby',
    currentGameIndex: 0,
    config,
    seed,
    startAt: null,
    players: {
      [hostId]: { pseudo: hostPseudo, totalPoints: 0, disconnected: false },
    },
    createdAt: serverTimestamp(),
  })
  return roomId
}

/** Ajoute un joueur dans la room. */
export async function joinRoom({ roomId, playerId, pseudo }) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    [`players.${playerId}`]: { pseudo, totalPoints: 0, disconnected: false },
  })
}

/** Le host lance la partie : startAt = maintenant + 5s, status = 'playing'. */
export async function launchRoom(roomId) {
  const startAt = Timestamp.fromDate(new Date(Date.now() + 5000))
  await updateDoc(doc(firestore, 'rooms', roomId), {
    status: 'playing',
    startAt,
  })
}

/** Met à jour le status de la room + champs optionnels supplémentaires. */
export async function updateRoomStatus(roomId, status, extra = {}) {
  await updateDoc(doc(firestore, 'rooms', roomId), { status, ...extra })
}

/** Met à jour la progression d'un joueur pour le jeu en cours. */
export async function updatePlayerProgress(roomId, playerId, progressData) {
  // Sécurité : si le temps arrive du client et qu'il est < 0, on le redresse
  if (progressData.elapsedTime && progressData.elapsedTime < 0) {
    progressData.elapsedTime = 0;
  }

  await setDoc(
    doc(firestore, 'rooms', roomId, 'progress', playerId),
    progressData,
    { merge: true }
  )
}

/**
 * Écrit le résultat d'un joueur pour un jeu donné.
 * Clé : `{gameIndex}_{playerId}` pour garantir l'unicité.
 */
export async function writeGameResult(roomId, gameIndex, playerId, resultData) {
  await setDoc(
    doc(firestore, 'rooms', roomId, 'gameResults', `${gameIndex}_${playerId}`),
    { playerId, gameIndex, ...resultData }
  )
}

/** Marque un joueur comme déconnecté. */
export async function markDisconnected(roomId, playerId) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    [`players.${playerId}.disconnected`]: true,
  })
}

/** Transfère le rôle de host à un autre joueur. */
export async function transferHost(roomId, newHostId) {
  await updateDoc(doc(firestore, 'rooms', roomId), { hostId: newHostId })
}

/**
 * Incrémente les points de plusieurs joueurs en un seul updateDoc.
 * @param {string} roomId
 * @param {{ playerId: string, points: number }[]} playerPoints
 */
export async function updateTotalPoints(roomId, playerPoints) {
  const updates = {}
  playerPoints.forEach(({ playerId, points }) => {
    updates[`players.${playerId}.totalPoints`] = increment(points)
  })
  await updateDoc(doc(firestore, 'rooms', roomId), updates)
}

/**
 * Supprime tous les documents de la sous-collection gameResults pour une room.
 * Doit être appelé avant tout reset (revanche ou reconfig).
 */
export async function clearGameResults(roomId) {
  const snapshot = await getDocs(collection(firestore, 'rooms', roomId, 'gameResults'))
  if (snapshot.empty) return
  const batch = writeBatch(firestore)
  snapshot.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}

export async function updatePlayerGameFlags(roomId, playerId, flags) {
  await setDoc(
    doc(firestore, 'rooms', roomId, 'progress', playerId),
    flags,
    { merge: true }
  )
}

// ─── Chill Mode ─────────────────────────────────────────────────────────────

/**
 * Initialise chillState au démarrage d'un jeu chill.
 * Appelé par le host uniquement.
 * @param {string} roomId
 * @param {number} countdownMs - durée du premier countdown en ms
 */
export async function initChillState(roomId, countdownMs) {
  const countdownEnd = Timestamp.fromDate(new Date(Date.now() + countdownMs))
  await updateDoc(doc(firestore, 'rooms', roomId), {
    chillState: {
      phase: 'playing',
      currentCountryIndex: 0,
      countdownEnd,
      mancheStartIndex: 0,
      reviewStep: 0,
      playerAnswers: {},
    },
  })
}

/**
 * Host : passe au pays suivant ou déclenche la review.
 * @param {string} roomId
 * @param {'playing'|'review'} phase
 * @param {number} nextIndex - nouveau currentCountryIndex
 * @param {number} mancheStart - mancheStartIndex (inchangé ou mis à jour)
 * @param {number|null} countdownMs - si phase='playing', durée du nouveau countdown
 */
export async function advanceChillTurn(roomId, phase, nextIndex, mancheStart, countdownMs) {
  const update = {
    'chillState.phase': phase,
    'chillState.currentCountryIndex': nextIndex,
    'chillState.mancheStartIndex': mancheStart,
    'chillState.reviewStep': 0,
  }
  if (phase === 'playing' && countdownMs != null) {
    update['chillState.countdownEnd'] = Timestamp.fromDate(
      new Date(Date.now() + countdownMs)
    )
  }
  await updateDoc(doc(firestore, 'rooms', roomId), update)
}

/**
 * Un joueur soumet sa réponse pour le pays courant.
 * Chaque joueur écrit sur son propre chemin — pas de conflit concurrent.
 * @param {string} roomId
 * @param {string} playerId
 * @param {number} countryIndex
 * @param {{ answer?: string, clickedAdmin?: string, correct: boolean, score: number }} answerData
 */
export async function submitChillAnswer(roomId, playerId, countryIndex, answerData) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    [`chillState.playerAnswers.${playerId}.${countryIndex}`]: answerData,
  })
}

/**
 * Host : avance d'un pas dans la review.
 * @param {string} roomId
 * @param {number} step - nouveau reviewStep
 */
export async function setChillReviewStep(roomId, step) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    'chillState.reviewStep': step,
  })
}
