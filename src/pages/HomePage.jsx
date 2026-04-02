import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { GAME_TYPES } from "../utils/gameTypes";
import { getTotalCountries } from "../hooks/useGameState";
import { getTotalFlagCountries } from "../hooks/useFlagGameState";
import { getTotalCapitalCountries } from "../hooks/useCapitalsGameState";
import "./HomePage.css";

const DIFFICULTY_COLORS = {
  Facile:     '#4ade80',
  Moyen:      '#00d4ff',
  Difficile:  '#fbbf24',
  Impossible: '#f97316',
  Hardcore:   '#f87171',
};

function getDifficultiesForGame(gameId) {
  const countFn =
    gameId === GAME_TYPES.FLAGS     ? getTotalFlagCountries :
    gameId === GAME_TYPES.CAPITALS  ? getTotalCapitalCountries :
                                      getTotalCountries;
  return [
    { name: 'Facile',     count: countFn('Facile'),     color: DIFFICULTY_COLORS.Facile },
    { name: 'Moyen',      count: countFn('Moyen'),      color: DIFFICULTY_COLORS.Moyen },
    { name: 'Difficile',  count: countFn('Difficile'),  color: DIFFICULTY_COLORS.Difficile },
    { name: 'Impossible', count: countFn('Impossible'), color: DIFFICULTY_COLORS.Impossible },
    { name: 'Hardcore',   count: countFn('Hardcore'),   color: DIFFICULTY_COLORS.Hardcore },
  ];
}

const GAMES = [
  {
    id: GAME_TYPES.PLACEMENT,
    icon: "🌍",
    title: "Trouve le Pays",
    description: "Trouve tous les pays de la difficulté choisie.",
    route: "/game",
    active: true,
  },
  {
    id: GAME_TYPES.FLAGS,
    icon: "🚩",
    title: "Trouve le Drapeau",
    description: "Identifie le pays à partir de son drapeau",
    route: "/flag-game",
    active: true,
  },
  {
    id: GAME_TYPES.CAPITALS,
    icon: "🏛️",
    title: "Trouve la Capitale",
    description: "Trouve la capitale à partir du drapeau et du nom du pays",
    route: "/capitals-game",
    active: true,
  },
  {
    id: "placement",
    icon: "📍",
    title: "Placement Pays",
    description: "Place le pays au bon endroit sur la carte",
    route: null,
    active: false,
  },
  {
    id: "lives",
    icon: "⚡",
    title: "Mode Vies",
    description: "Trouve un maximum de pays sans te tromper",
    route: null,
    active: false,
  },
];

function ActiveGameCard({ game }) {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("Moyen");
  const difficulties = getDifficultiesForGame(game.id);

  const handlePlay = (isTraining = false) => {
    navigate(game.route, { state: { difficulty, isTraining } });
  };

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>
      <div className="game-card-controls">
        <div className="difficulty-grid">
          {difficulties.map(d => (
            <button
              key={d.name}
              className={`difficulty-btn${d.name === 'Hardcore' ? ' difficulty-btn--wide' : ''}${difficulty === d.name ? ' difficulty-btn--active' : ''}`}
              onClick={() => setDifficulty(d.name)}
            >
              <span className="difficulty-btn-name" style={{ color: d.color }}>
                {d.name === 'Hardcore' ? '💀 Hardcore — Tous les pays' : d.name}
              </span>
              <span className="difficulty-btn-count">{d.count} pays</span>
            </button>
          ))}
        </div>
        <button
          className="nav-scores-btn"
          onClick={() => navigate(`/scores?game=${game.id}`)}
        >
          🏆 Scores
        </button>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => handlePlay(false)}>Jouer</button>
          <button className="btn-training" onClick={() => handlePlay(true)}>Entraînement</button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home-page">
      <NavBar />
      <main className="home-main">
        <div className="home-hero">
          <h1 className="home-title">Choisissez votre jeu</h1>
          <p className="home-subtitle">Explore • Découvre • Compète</p>
        </div>
        <div className="games-grid">
          {GAMES.map((game) =>
            game.active ? (
              <ActiveGameCard key={game.id} game={game} />
            ) : (
              <div key={game.id} className="game-card game-card--soon">
                <div className="game-card-icon game-card-icon--dim">{game.icon}</div>
                <h2 className="game-card-title game-card-title--dim">{game.title}</h2>
                <p className="game-card-desc game-card-desc--dim">{game.description}</p>
                <span className="badge-soon">BIENTÔT</span>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
