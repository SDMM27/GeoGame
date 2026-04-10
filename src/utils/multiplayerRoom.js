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
