import React, { useRef } from "react";
import "./form.css";
import { firestore } from "../Firebase";
import { addDoc, collection } from "firebase/firestore";

export default function Form() {
  const nameRef = useRef();
  const scoreRef = useRef();
  const ref = collection(firestore, "scores");

  const handleSave = async (e) => {
    e.preventDefault();
    console.log(nameRef.current.value);
    console.log(scoreRef.current.value);
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSave}>
        <label htmlFor="name">Pseudo</label>
        <input type="text" id="name" ref={nameRef}/>
        <label htmlFor="score">Score</label>
        <input type="number" id="score" ref={scoreRef}/>
        <button type="submit">Sauvegarder votre score</button>
      </form>
    </div>
  );
}
