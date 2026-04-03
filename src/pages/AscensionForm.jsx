import React, { useRef, useState } from 'react'
import { firestore } from '../Firebase'
import { addDoc, collection, getDocs, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { formatTime } from '../utils/formatTime'

function isBetter(newScore, newTimeMs, existingScore, existingTimeMs) {
  if (newScore > existingScore) return true
  if (newScore === existingScore && newTimeMs < existingTimeMs) return true
  return false
}

/**
 * End-of-game summary and score save for Ascension mode.
 * Only saves to Firestore if presetName is not null and isTraining is false.
 */
export default function AscensionForm({ score, timer, stats, phaseStats, gameType, presetName, isTraining }) {
  const nameRef = useRef()
  const [saved, setSaved] = useState(false)
  const [blockedByBetter, setBlockedByBetter] = useState(null)

  const canSave = !isTraining && presetName !== null

  const handleSave = async (e) => {
    e.preventDefault()
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error('Veuillez rentrer un pseudo', { containerId: 'topRightToast' })
      return
    }

    try {
      const ref = collection(firestore, 'ascension_scores')
      const existing = await getDocs(
        query(ref, where('name', '==', name), where('gameType', '==', gameType), where('presetName', '==', presetName))
      )

      if (!existing.empty) {
        const prev = existing.docs[0].data()
        if (!isBetter(score, timer, prev.globalScore, prev.globalTimeMs)) {
          setBlockedByBetter({ timeMs: prev.globalTimeMs, score: prev.globalScore })
          return
        }
        await deleteDoc(existing.docs[0].ref)
      }

      await addDoc(ref, {
        name,
        gameType,
        presetName,
        globalTimeMs: timer,
        globalScore: score,
        totalFound: stats.found,
        totalSkipped: stats.skipped,
        phaseStats,
        date: serverTimestamp(),
      })
      toast.success('Score Ascension sauvegardé !', { containerId: 'topRightToast' })
      const wasReplaced = !existing.empty
      toast.success(
        wasReplaced ? 'Score Ascension mis à jour !' : 'Score Ascension sauvegardé !',
        { containerId: 'topRightToast' }
      )
      setBlockedByBetter(null)
      setSaved(true)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { containerId: 'topRightToast' })
      console.error(err)
    }
  }

  const DIFFICULTY_COLORS = {
    Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24', Impossible: '#f97316',
  }

  return (
    <div className="form-container">
      <h2 className="form-title">🚀 Ascension terminée !</h2>
      {presetName && <p className="form-score-display">Preset : <strong>{presetName}</strong></p>}

      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '1.4em', fontWeight: 'bold' }}>
            {formatTime(timer)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Temps total</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fbbf24', fontSize: '1.4em', fontWeight: 'bold' }}>{score}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Score</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#4ade80', fontSize: '1.4em', fontWeight: 'bold' }}>
            {stats.found}/{stats.total}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Trouvés</div>
        </div>
      </div>

      {phaseStats?.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em', marginBottom: '12px' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>Phase</th>
              <th style={{ textAlign: 'center' }}>Trouvés</th>
              <th style={{ textAlign: 'center' }}>Passés</th>
              <th style={{ textAlign: 'right' }}>Temps</th>
            </tr>
          </thead>
          <tbody>
            {phaseStats.map((ps, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ color: DIFFICULTY_COLORS[ps.difficulty] ?? '#e2e8f0', padding: '4px 0' }}>
                  {ps.difficulty}
                </td>
                <td style={{ textAlign: 'center', color: '#e2e8f0' }}>{ps.found}/{ps.count}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{ps.skipped}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{formatTime(ps.timeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canSave && !saved && (
        <>
          {blockedByBetter && (
            <div className="form-blocked">
              <p className="form-blocked-message">⚠️ Ce pseudo a déjà un meilleur temps :</p>
              <p className="form-blocked-score">
                <strong>{formatTime(blockedByBetter.timeMs)}</strong> — {blockedByBetter.score} pts
              </p>
              <p className="form-blocked-hint">Enregistrez sous un autre nom.</p>
            </div>
          )}
          <form onSubmit={handleSave}>
            <label htmlFor="ascension-name" className="form-label">Pseudo</label>
            <input
              type="text"
              id="ascension-name"
              ref={nameRef}
              className="form-input"
              placeholder="Ton pseudo..."
              maxLength={20}
              onChange={() => setBlockedByBetter(null)}
            />
            <button type="submit" className="form-submit" disabled={saved}>Sauvegarder le score</button>
          </form>
        </>
      )}
      {saved && <p style={{ color: '#4ade80', textAlign: 'center' }}>Score sauvegardé ✓</p>}
      {!canSave && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center' }}>
          {isTraining ? 'Mode entraînement — score non enregistré' : 'Config custom — score non enregistré'}
        </p>
      )}
    </div>
  )
}
