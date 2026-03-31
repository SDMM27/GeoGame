import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../Firebase";
import "./scoreboard.css";

const DIFFICULTY_ORDER = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Scoreboard() {
  const [allScores, setAllScores] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const scoresCollection = collection(firestore, "scores");
        const scoresSnapshot = await getDocs(scoresCollection);
        const scoresList = scoresSnapshot.docs.map((doc) => doc.data());
        scoresList.sort((a, b) => b.score - a.score);
        setAllScores(scoresList);
        setScores(scoresList);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const changeDifficultyDisplayed = (difficulty) => {
    if (difficulty === "AllScores") {
      setScores([...allScores]);
      return;
    }
    const filtered = allScores
      .filter((s) => s.difficulty === difficulty)
      .sort((a, b) => b.score - a.score);
    setScores(filtered);
  };

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <select
        className="scoreboard-select"
        onChange={(e) => changeDifficultyDisplayed(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>
          Filtrer par difficulté
        </option>
        {DIFFICULTY_ORDER.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value="AllScores">Tous les scores</option>
      </select>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">Aucun score pour cette difficulté.</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header">
            <span>#</span>
            <span>Joueur</span>
            <span>Score</span>
            <span>Difficulté</span>
          </div>
          {scores.map((s, index) => (
            <div
              key={index}
              className={`scoreboard-row ${index < 3 ? "scoreboard-row--top" : ""}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name">{s.name}</span>
              <span className="scoreboard-score">{s.score} pts</span>
              <span className="scoreboard-difficulty">{s.difficulty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
