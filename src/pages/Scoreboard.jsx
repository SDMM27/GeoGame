import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import "./scoreboard.css";
import { firestore } from "../Firebase";

export default function Scoreboard() {
  const [allScores, setAllScores] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      const scoresCollection = collection(firestore, "scores");
      const scoresSnapshot = await getDocs(scoresCollection);
      const scoresList = scoresSnapshot.docs.map((doc) => doc.data());

      // Sort scores in descending order
      scoresList.sort((a, b) => b.score - a.score);

      setAllScores(scoresList);
      setScores(scoresList);
    };

    fetchScores();
  }, []);

  const changeDifficultyDisplayed = (difficulty) => {
    if (difficulty === "AllScores") return setScores(allScores);
    const filteredScores = allScores.filter(
      (score) => score.difficulty === difficulty
    );
    setScores(filteredScores);
  };

  return (
    <div className="scoreboard">
      <h1>Tableau des scores</h1>
      <select
        name="difficulty"
        id="difficultySelect"
        onChange={(e) => changeDifficultyDisplayed(e.target.value)}
      >
        <option value="" selected disabled hidden>
          Choissisez les scores par difficulté
        </option>
        <option value="Facile">Facile</option>
        <option value="Moyen">Moyen</option>
        <option value="Difficile">Difficile</option>
        <option value="Impossible">Impossible</option>
        <option value="Hardcore">Hardcore</option>
        <option value="AllScores">Tous les scores</option>
      </select>
      {scores
        .sort((a, b) => a.difficulty - b.difficulty) // assuming difficulty is a numeric value
        .map((score, index) => (
          <div className="scoreboardElement" key={index}>
            <h2>{score.name}</h2>
            <p>{score.score}</p>
            <p>{score.difficulty}</p>
          </div>
        ))}
    </div>
  );
}
