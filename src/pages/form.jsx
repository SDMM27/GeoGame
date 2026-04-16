import React, { useRef, useState } from "react";
import "./form.css";
import "react-toastify/dist/ReactToastify.css";
import { firestore } from "../Firebase";
import { addDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { formatTime } from "../utils/formatTime";

function isBetter(newScore, newTime, existingScore, existingTime) {
  if (newScore > existingScore) return true;
  if (newScore === existingScore && newTime < existingTime) return true;
  return false;
}

export default function Form({ finalScore, difficulty, elapsedTime, gameType, continent }) {
  const nameRef = useRef();
  const ref = collection(firestore, "scores");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockedByBetterScore, setBlockedByBetterScore] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (submitting || saved) return;
    const name = nameRef.current.value.trim();
    if (!name) {
      toast.error("Veuillez rentrer un pseudo", { containerId: "topRightToast" });
      return;
    }
    setSubmitting(true);

    const data = {
      name,
      score: finalScore,
      difficulty,
      elapsedTime,
      gameType,
      ...(continent != null && { continent }),
    };

    const existingSnapshot = await getDocs(
      query(
        ref,
        where("name", "==", name),
        where("difficulty", "==", difficulty),
        where("gameType", "==", gameType)
      )
    );

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data();
      if (!isBetter(finalScore, elapsedTime, existing.score, existing.elapsedTime)) {
        setBlockedByBetterScore({ score: existing.score, elapsedTime: existing.elapsedTime });
        setSubmitting(false);
        return;
      }
      await deleteDoc(existingSnapshot.docs[0].ref);
    }

    try {
      await addDoc(ref, data);
      const wasReplaced = !existingSnapshot.empty;
      toast.success(
        wasReplaced ? "Score mis à jour !" : `Score de ${name} sauvegardé !`,
        { containerId: "topRightToast" }
      );
      setSaved(true);
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde", { containerId: "topRightToast" });
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Partie terminée !</h2>
      <p className="form-score-display">
        Score : <strong>{finalScore} pts</strong> — {difficulty}
      </p>
      <p className="form-score-display">
        Temps : <strong>{formatTime(elapsedTime)}</strong>
      </p>

      {blockedByBetterScore && (
        <div className="form-blocked">
          <p className="form-blocked-message">
            ⚠️ Ce pseudo a déjà un meilleur score dans cette difficulté&nbsp;:
          </p>
          <p className="form-blocked-score">
            <strong>{blockedByBetterScore.score} pts</strong> — {formatTime(blockedByBetterScore.elapsedTime)}
          </p>
          <p className="form-blocked-hint">Veuillez enregistrer votre score sous un autre nom.</p>
        </div>
      )}
      <form onSubmit={handleSave}>
        <label htmlFor="name" className="form-label">Pseudo</label>
        <input
          type="text"
          id="name"
          ref={nameRef}
          className="form-input"
          placeholder="Ton pseudo..."
          maxLength={20}
        />
        <button type="submit" className="form-submit" disabled={saved || submitting}>
          {saved ? 'Score sauvegardé ✓' : submitting ? 'Sauvegarde...' : 'Sauvegarder le score'}
        </button>
      </form>
    </div>
  );
}
