import React, { useRef } from "react";
import "./form.css";
import "react-toastify/dist/ReactToastify.css";
import { firestore } from "../Firebase";
import { addDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function Form({ finalScore, difficulty }) {
  console.log("score : " + finalScore);
  console.log("difficulty : " + difficulty);
  const nameRef = useRef();
  const ref = collection(firestore, "scores");

  const handleSave = async (e) => {
    e.preventDefault();
    console.log(nameRef.current.value);

    let data = {
      name: nameRef.current.value,
      score: finalScore,
      difficulty: difficulty,
    };

    // Vérifier si le joueur a déjà un score pour la même difficulté
    const existingScoresQuerySnapshot = await getDocs(
      query(
        ref,
        where("name", "==", nameRef.current.value),
        where("difficulty", "==", difficulty)
      )
    );

    let existingScore = existingScoresQuerySnapshot.docs.map((doc) => doc.data());

    if (!existingScoresQuerySnapshot.empty) {
      toast.warning("Vous avez déjà un score enregistré pour cette difficulté");
      if (window.confirm("Voulez-vous remplacer votre score de " + existingScore[0].score + " points par celui-ci ?")) {
        await deleteDoc(existingScoresQuerySnapshot.docs[0].ref);
        try {
          if (data.name === "" || data.score === null || data.difficulty === "")
            throw new Error("Veuillez remplir tous les champs");
  
          addDoc(ref, data);
          toast.success("Score de " + data.name + " sauvegardé !");
          const submitBtn = document.getElementById("submitBtn");
          submitBtn.style.display = "none";
          submitBtn.disabled = true;
          submitBtn.style.pointerEvents = "none";
        } catch (e) {
          toast.error("Veuillez rentrer un pseudo");
          console.error("Error adding document: ", e);
        }
      } else {
        return;
      }
      return;
    } else {
      try {
        if (data.name === "" || data.score === null || data.difficulty === "")
          throw new Error("Veuillez remplir tous les champs");

        addDoc(ref, data);
        toast.success("Score de " + data.name + " sauvegardé !");
        const submitBtn = document.getElementById("submitBtn");
        submitBtn.style.display = "none";
        submitBtn.disabled = true;
        submitBtn.style.pointerEvents = "none";
      } catch (e) {
        toast.error("Veuillez rentrer un pseudo");
        console.error("Error adding document: ", e);
      }
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSave}>
        <label htmlFor="name">Pseudo</label>
        <input type="text" id="name" ref={nameRef} />
        <label htmlFor="score">Score</label>
        <input type="number" id="score" value={finalScore} disabled />
        <input type="text" id="difficulty" value={difficulty} disabled />
        <button id="submitBtn" type="submit">
          Sauvegarder votre score
        </button>
      </form>
    </div>
  );
}
