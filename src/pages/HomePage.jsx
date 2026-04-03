import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { GAME_TYPES } from "../utils/gameTypes";
import { getTotalCountries } from "../hooks/useGameState";
import { getTotalFlagCountries } from "../hooks/useFlagGameState";
import { getTotalCapitalCountries } from "../hooks/useCapitalsGameState";
import { ASCENSION_PRESETS, matchPreset } from "../utils/ascensionPresets";
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

function getDifficultyCaps(gameId) {
  return getDifficultiesForGame(gameId)
    .filter((difficulty) => difficulty.name !== "Hardcore")
    .reduce((acc, difficulty) => {
      acc[difficulty.name] = difficulty.count;
      return acc;
    }, {});
}

function buildPresetPhases(name) {
  const preset = ASCENSION_PRESETS.find((item) => item.name === name) ?? ASCENSION_PRESETS[1];
  return { ...preset.phases };
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
  const [mode, setMode] = useState("standard");
  const [difficulty, setDifficulty] = useState("Moyen");
  const [ascensionPhases, setAscensionPhases] = useState(() => buildPresetPhases("Progressif"));
  const difficulties = getDifficultiesForGame(game.id);
  const ascensionCaps = useMemo(() => getDifficultyCaps(game.id), [game.id]);
  const detectedPresetName = matchPreset(ascensionPhases);
  const detectedPreset = ASCENSION_PRESETS.find((preset) => preset.name === detectedPresetName) ?? null;
  const totalAscensionCountries = Object.values(ascensionPhases).reduce((sum, count) => sum + count, 0);

  const handlePlay = (isTraining = false) => {
    if (mode === "ascension") {
      navigate(game.route, {
        state: {
          isAscension: true,
          phases: ascensionPhases,
          presetName: detectedPresetName,
          isTraining,
        },
      });
      return;
    }

    navigate(game.route, { state: { difficulty, isTraining } });
  };

  const handlePresetClick = (preset) => {
    const nextPhases = Object.entries(preset.phases).reduce((acc, [name, count]) => {
      acc[name] = Math.min(count, ascensionCaps[name] ?? 0);
      return acc;
    }, {});
    setAscensionPhases(nextPhases);
  };

  const handleSliderChange = (difficultyName, value) => {
    setAscensionPhases((prev) => ({
      ...prev,
      [difficultyName]: Number(value),
    }));
  };

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>
      <div className="game-card-controls">
        <div className="game-mode-tabs">
          <button
            className={`game-mode-tab${mode === "standard" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("standard")}
          >
            Standard
          </button>
          <button
            className={`game-mode-tab${mode === "ascension" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("ascension")}
          >
            🚀 Ascension
          </button>
        </div>
        {mode === "standard" ? (
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
        ) : (
          <div className="ascension-panel">
            <div className="ascension-presets">
              {ASCENSION_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className={`ascension-preset${detectedPresetName === preset.name ? " ascension-preset--active" : ""}`}
                  onClick={() => handlePresetClick(preset)}
                >
                  <span className="ascension-preset-name">{preset.icon} {preset.name}</span>
                  <span className="ascension-preset-count">
                    {Object.values(preset.phases).reduce((sum, count) => sum + count, 0)} pays
                  </span>
                </button>
              ))}
            </div>
            <div className="ascension-status">
              <span className="ascension-status-label">Configuration</span>
              <strong className="ascension-status-value">
                {detectedPreset ? `${detectedPreset.icon} ${detectedPreset.name}` : "Custom"}
              </strong>
              <span className="ascension-status-total">{totalAscensionCountries} pays au total</span>
            </div>
            {Object.entries(ascensionCaps).map(([difficultyName, maxCount]) => {
              const difficultyInfo = difficulties.find((item) => item.name === difficultyName);
              return (
                <label key={difficultyName} className="ascension-slider-row">
                  <div className="ascension-slider-head">
                    <span className="ascension-slider-name" style={{ color: difficultyInfo?.color }}>
                      {difficultyName}
                    </span>
                    <span className="ascension-slider-value">
                      {ascensionPhases[difficultyName] ?? 0} / {maxCount}
                    </span>
                  </div>
                  <input
                    className="ascension-slider"
                    type="range"
                    min="0"
                    max={maxCount}
                    value={ascensionPhases[difficultyName] ?? 0}
                    onChange={(e) => handleSliderChange(difficultyName, e.target.value)}
                  />
                </label>
              );
            })}
          </div>
        )}
        <button
          className="nav-scores-btn"
          onClick={() => navigate(`/scores?game=${game.id}${mode === "ascension" ? "&mode=ascension" : ""}`)}
        >
          🏆 Scores
        </button>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => handlePlay(false)} disabled={mode === "ascension" && totalAscensionCountries === 0}>Jouer</button>
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
