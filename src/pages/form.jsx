import React, { useRef } from "react";
import "./form.css";
import "react-toastify/dist/ReactToastify.css";
import { firestore } from "../Firebase";
import { addDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function Form({ finalScore, difficulty }) {
  const nameRef = useRef();
  const ref = collection(firestore, "scores");

  const handleSave = async (e) => {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) {
      toast.error("Veuillez rentrer un pseudo");
      return;
    }

    const data = { name, score: finalScore, difficulty };

    const existingSnapshot = await getDocs(
      query(ref, where("name", "==", name), where("difficulty", "==", difficulty))
    );

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data();
      if (!window.confirm(`Remplacer votre score de ${existing.score} pts par ${finalScore} pts ?`)) {
        return;
      }
      await deleteDoc(existingSnapshot.docs[0].ref);
    }

    try {
      await addDoc(ref, data);
      toast.success(`Score de ${name} sauvegardé !`);
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Score sauvegardé ✓";
      }
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(err);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Partie terminée !</h2>
      <p className="form-score-display">
        Score : <strong>{finalScore} pts</strong> — {difficulty}
      </p>
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
        <button id="submitBtn" type="submit" className="form-submit">
          Sauvegarder le score
        </button>
      </form>
    </div>
  );
}
