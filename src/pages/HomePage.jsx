import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Scoreboard from "./Scoreboard";
import "./HomePage.css";

const DIFFICULTIES = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];

const GAMES = [
  {
    id: "country",
    icon: "🌍",
    title: "Trouve le Pays",
    description: "Clique sur le bon pays en 60 secondes",
    active: true,
  },
  {
    id: "flags",
    icon: "🚩",
    title: "Trouve le Drapeau",
    description: "Identifie le pays à partir de son drapeau",
    active: false,
  },
  {
    id: "placement",
    icon: "📍",
    title: "Placement Pays",
    description: "Place le pays au bon endroit sur la carte",
    active: false,
  },
  {
    id: "lives",
    icon: "⚡",
    title: "Mode Vies",
    description: "Trouve un maximum de pays sans te tromper",
    active: false,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("Moyen");
  const [showScoreboard, setShowScoreboard] = useState(false);

  const handlePlay = (isTraining = false) => {
    navigate("/game", { state: { difficulty, isTraining } });
  };

  return (
    <div className="home-page">
      <nav className="home-nav">
        <span className="home-logo">
          GEO<span className="home-logo-accent">GAME</span>
        </span>
        <button
          className="nav-scores-btn"
          onClick={() => setShowScoreboard((v) => !v)}
        >
          🏆 Scores
        </button>
      </nav>

      <main className="home-main">
        <div className="home-hero">
          <h1 className="home-title">Choisissez votre jeu</h1>
          <p className="home-subtitle">Explore • Découvre • Compète</p>
        </div>

        <div className="games-grid">
          {GAMES.map((game) =>
            game.active ? (
              <div key={game.id} className="game-card game-card--active">
                <div className="game-card-icon">{game.icon}</div>
                <h2 className="game-card-title">{game.title}</h2>
                <p className="game-card-desc">{game.description}</p>

                <div className="game-card-controls">
                  <select
                    className="difficulty-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="game-card-buttons">
                    <button
                      className="btn-play"
                      onClick={() => handlePlay(false)}
                    >
                      Jouer
                    </button>
                    <button
                      className="btn-training"
                      onClick={() => handlePlay(true)}
                    >
                      Entraînement
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={game.id} className="game-card game-card--soon">
                <div className="game-card-icon game-card-icon--dim">
                  {game.icon}
                </div>
                <h2 className="game-card-title game-card-title--dim">
                  {game.title}
                </h2>
                <p className="game-card-desc game-card-desc--dim">
                  {game.description}
                </p>
                <span className="badge-soon">BIENTÔT</span>
              </div>
            )
          )}
        </div>

        {showScoreboard && (
          <div className="scoreboard-section">
            <Scoreboard />
          </div>
        )}
      </main>
    </div>
  );
}
