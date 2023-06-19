import React, { useRef } from "react";
import "./form.css";
import "react-toastify/dist/ReactToastify.css";
import { firestore } from "../Firebase";
import { addDoc, collection } from "firebase/firestore";
import { toast } from "react-toastify";
// import { finalScore } from "../App";


export default function Form({ finalScore }) {
  console.log('score : ' + finalScore);
  const nameRef = useRef();
  const ref = collection(firestore, "scores");

  const handleSave = async (e) => {
    e.preventDefault();
    console.log(nameRef.current.value);

    let data = {
      name: nameRef.current.value,
      score: finalScore,
    }

    try {
      if (data.name === "" || data.score === "") throw new Error("Veuillez remplir tous les champs")
      addDoc(ref, data);
      toast.success("Score associé au pseudo sauvegardé");
      const submitBtn = document.getElementById("submitBtn");
      submitBtn.disabled = true;
      submitBtn.style.pointerEvents = "none";
    } catch(e) {
      toast.error("Erreur lors de la sauvegarde du score");
      console.error("Error adding document: ", e);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSave}>
        <label htmlFor="name">Pseudo</label>
        <input type="text" id="name" ref={nameRef}/>
        <label htmlFor="score">Score</label>
        <input type="number" id="score" value={finalScore} disabled/>
        <button id="submitBtn" type="submit">Sauvegarder votre score</button>
      </form>
    </div>
  );
}
