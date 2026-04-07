import React, { useRef, useState } from 'react'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { firestore } from '../Firebase'
import { isBetterDailyScore } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

export default function DailyForm({ attempts, elapsedTime, guesses, gameType, dailyKey }) {
  const nameRef = useRef()
  const [saved, setSaved] = useState(false)
  const [blockedByBetter, setBlockedByBetter] = useState(null)
  const ref = collection(firestore, 'daily_scores')

  const handleSave = async (e) => {
    e.preventDefault()
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error('Veuillez rentrer un pseudo', { containerId: 'topRightToast' })
      return
    }

    const newScore = { name, gameType, dailyKey, attempts, elapsedTime, guesses }

    const existingSnapshot = await getDocs(
      query(ref, where('name', '==', name), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
    )

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data()
      if (!isBetterDailyScore(newScore, existing)) {
        setBlockedByBetter({ attempts: existing.attempts, elapsedTime: existing.elapsedTime })
        return
      }
      await deleteDoc(existingSnapshot.docs[0].ref)
    }

    try {
      await addDoc(ref, newScore)
      const wasReplaced = !existingSnapshot.empty
      toast.success(wasReplaced ? 'Score mis à jour !' : `Score de ${name} sauvegardé !`, { containerId: 'topRightToast' })
      setSaved(true)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { containerId: 'topRightToast' })
      console.error(err)
    }
  }

  return (
    <div className="daily-form">
      <h2 className="daily-form__title">Partie terminée !</h2>
      <p className="daily-form__stat">{attempts} essai{attempts > 1 ? 's' : ''} — {elapsedTime != null ? formatTime(elapsedTime) : '—'}</p>

      {blockedByBetter && (
        <div className="daily-form__blocked">
          <p>Ce pseudo a déjà un meilleur score pour ce puzzle : <strong>{blockedByBetter.attempts} essais — {formatTime(blockedByBetter.elapsedTime)}</strong>.</p>
          <p className="daily-form__blocked-hint">Enregistrez sous un autre nom.</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        <label htmlFor="daily-pseudo" className="daily-form__label">Pseudo</label>
        <input
          id="daily-pseudo"
          ref={nameRef}
          className="daily-form__input"
          type="text"
          placeholder="Ton pseudo..."
          maxLength={20}
          disabled={saved}
        />
        <button type="submit" className="daily-form__submit" disabled={saved}>
          {saved ? 'Score sauvegardé ✓' : 'Sauvegarder le score'}
        </button>
      </form>
    </div>
  )
}
