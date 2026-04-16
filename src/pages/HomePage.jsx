import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { GAME_TYPES } from "../utils/gameTypes";
import { getTotalCountries, getTotalCountriesByContinent } from "../hooks/useGameState";
import { getTotalFlagCountries, getTotalFlagCountriesByContinent } from "../hooks/useFlagGameState";
import { getTotalCapitalCountries, getTotalCapitalCountriesByContinent } from "../hooks/useCapitalsGameState";
import { CONTINENTS } from "../utils/continents";
import { ASCENSION_PRESETS, matchPreset } from "../utils/ascensionPresets";
import "./HomePage.css";

const DIFFICULTY_COLORS = {
  Facile: "#4ade80",
  Moyen: "#00d4ff",
  Difficile: "#fbbf24",
  Impossible: "#f97316",
  Hardcore: "#f87171",
};

function getDifficultiesForGame(gameId) {
  const countFn =
    gameId === GAME_TYPES.FLAGS
      ? getTotalFlagCountries
      : gameId === GAME_TYPES.CAPITALS
        ? getTotalCapitalCountries
        : getTotalCountries;

  return [
    { name: "Facile", count: countFn("Facile"), color: DIFFICULTY_COLORS.Facile },
    { name: "Moyen", count: countFn("Moyen"), color: DIFFICULTY_COLORS.Moyen },
    { name: "Difficile", count: countFn("Difficile"), color: DIFFICULTY_COLORS.Difficile },
    { name: "Impossible", count: countFn("Impossible"), color: DIFFICULTY_COLORS.Impossible },
    { name: "Hardcore", count: countFn("Hardcore"), color: DIFFICULTY_COLORS.Hardcore },
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

function getContinentsForGame(gameId) {
  const countFn =
    gameId === GAME_TYPES.FLAGS
      ? getTotalFlagCountriesByContinent
      : gameId === GAME_TYPES.CAPITALS
        ? getTotalCapitalCountriesByContinent
        : getTotalCountriesByContinent;

  return CONTINENTS.map(c => ({ ...c, count: countFn(c.name) }));
}

function buildPresetPhases(name) {
  const preset = ASCENSION_PRESETS.find((item) => item.name === name) ?? ASCENSION_PRESETS[1];
  return { ...preset.phases };
}

const GAMES = [
  {
    id: GAME_TYPES.PLACEMENT,
    icon: "\u{1F30D}",
    title: "Trouve le Pays",
    description: "Trouve tous les pays de la difficulté choisie.",
    route: "/game",
    active: true,
  },
  {
    id: GAME_TYPES.FLAGS,
    icon: "\u{1F6A9}",
    title: "Trouve le Drapeau",
    description: "Identifie le pays à partir de son drapeau.",
    route: "/flag-game",
    active: true,
  },
  {
    id: GAME_TYPES.CAPITALS,
    icon: "\u{1F3DB}\uFE0F",
    title: "Trouve la Capitale",
    description: "Trouve la capitale à partir du drapeau et du nom du pays.",
    route: "/capitals-game",
    active: true,
  },
  {
    id: GAME_TYPES.BORDER_GUESS,
    icon: "\u{1F9ED}",
    title: "BorderGuess",
    description: "Devine un pays uniquement à partir de ses frontières.",
    route: "/border-guess",
    active: true,
  },
  {
    id: GAME_TYPES.COUNTRY_CLUE,
    icon: "\u{1F50E}",
    title: "Country Clue",
    description: "Retrouve le pays avec des indices de distance, direction et surface.",
    route: "/country-clue",
    active: true,
  },
  {
    id: "ranking",
    icon: "🏆",
    title: "Country Ranking",
    description: "Classe des pays du plus grand au plus petit selon un critère : population, superficie, PIB ou densité.",
    route: "/ranking",
    cardType: "ranking",
    active: true,
  },
  {
    id: "placement",
    icon: "\u{1F4CD}",
    title: "Placement Pays",
    description: "Place le pays au bon endroit sur la carte.",
    route: null,
    active: false,
  },
  {
    id: "lives",
    icon: "\u26A1",
    title: "Mode Vies",
    description: "Trouve un maximum de pays sans te tromper.",
    route: null,
    active: false,
  },
];

function BorderGuessCard({ game }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("daily");

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>
      <div className="game-card-controls">
        <div className="game-mode-tabs">
          <button
            className={`game-mode-tab${mode === "daily" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("daily")}
          >
            Journalier
          </button>
          <button
            className={`game-mode-tab${mode === "infinite" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("infinite")}
          >
            Infini
          </button>
        </div>
        <div className="border-guess-card-note">
          {mode === "daily"
            ? "Un seul pays par jour, avec progression sauvegardée localement."
            : "Enchaîne des silhouettes sans limite, avec un nouveau pays à chaque manche."}
        </div>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => navigate(game.route, { state: { mode } })}>
            Jouer
          </button>
        </div>
      </div>
    </div>
  );
}

function CountryClueCard({ game }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("daily");

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>
      <div className="game-card-controls">
        <div className="game-mode-tabs">
          <button
            className={`game-mode-tab${mode === "daily" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("daily")}
          >
            Journalier
          </button>
          <button
            className={`game-mode-tab${mode === "infinite" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("infinite")}
          >
            Infini
          </button>
        </div>
        <div className="border-guess-card-note">
          {mode === "daily"
            ? "Un pays mystère par jour avec progression mémorisée sur cet appareil."
            : "Enchaîne des énigmes de pays sans attendre le lendemain."}
        </div>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => navigate(game.route, { state: { mode } })}>
            Jouer
          </button>
        </div>
      </div>
    </div>
  );
}

function RankingCard({ game }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("daily");

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>
      <div className="game-card-controls">
        <div className="game-mode-tabs">
          <button
            className={`game-mode-tab${mode === "daily" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("daily")}
          >
            Journalier
          </button>
          <button
            className={`game-mode-tab${mode === "infinite" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("infinite")}
          >
            Infini
          </button>
        </div>
        <div className="border-guess-card-note">
          {mode === "daily"
            ? "Classe 6 pays selon le critère du jour. Un seul essai par jour."
            : "Enchaîne des rounds de classement avec difficulté au choix."}
        </div>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => navigate(game.route, { state: { mode } })}>
            Jouer
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveGameCard({ game }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("standard");
  const [difficulty, setDifficulty] = useState("Moyen");
  const [ascensionPhases, setAscensionPhases] = useState(() => buildPresetPhases("Progressif"));
  const [selectionMode, setSelectionMode] = useState("difficulty");
  const [selectedContinent, setSelectedContinent] = useState(null);
  const continents = useMemo(() => getContinentsForGame(game.id), [game.id]);
  const difficulties = getDifficultiesForGame(game.id);
  const ascensionCaps = useMemo(() => getDifficultyCaps(game.id), [game.id]);
  const detectedPresetName = matchPreset(ascensionPhases);
  const detectedPreset = ASCENSION_PRESETS.find((preset) => preset.name === detectedPresetName) ?? null;
  const totalAscensionCountries = Object.values(ascensionPhases).reduce((sum, count) => sum + count, 0);

  const handlePlay = (isTraining = false, difficultyOverride = null, continentOverride = null) => {
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

    if (selectionMode === "continent") {
      navigate(game.route, { state: { continent: continentOverride ?? selectedContinent, isTraining } });
      return;
    }

    navigate(game.route, { state: { difficulty: difficultyOverride ?? difficulty, isTraining } });
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
            {"\uD83D\uDE80"} Ascension
          </button>
        </div>
        {mode === "standard" ? (
          <>
            <div className="game-mode-tabs">
              <button
                className={`game-mode-tab${selectionMode === "difficulty" ? " game-mode-tab--active" : ""}`}
                onClick={() => setSelectionMode("difficulty")}
              >
                Par difficulté
              </button>
              <button
                className={`game-mode-tab${selectionMode === "continent" ? " game-mode-tab--active" : ""}`}
                onClick={() => setSelectionMode("continent")}
              >
                Par continent
              </button>
            </div>
            {selectionMode === "difficulty" ? (
              <div className="difficulty-grid">
                {difficulties.map((difficultyOption) => (
                  <button
                    key={difficultyOption.name}
                    className={`difficulty-btn${difficultyOption.name === "Hardcore" ? " difficulty-btn--wide" : ""}${difficulty === difficultyOption.name ? " difficulty-btn--active" : ""}`}
                    onClick={() => setDifficulty(difficultyOption.name)}
                    onDoubleClick={() => handlePlay(false, difficultyOption.name)}
                  >
                    <span className="difficulty-btn-name" style={{ color: difficultyOption.color }}>
                      {difficultyOption.name === "Hardcore" ? "\uD83D\uDC80 Hardcore - Tous les pays" : difficultyOption.name}
                    </span>
                    <span className="difficulty-btn-count">{difficultyOption.count} pays</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="difficulty-grid">
                {continents.map((cont) => (
                  <button
                    key={cont.name}
                    className={`difficulty-btn${selectedContinent === cont.name ? " difficulty-btn--active" : ""}`}
                    onClick={() => setSelectedContinent(cont.name)}
                    onDoubleClick={() => handlePlay(false, null, cont.name)}
                  >
                    <span className="difficulty-btn-name" style={{ color: cont.color }}>{cont.name}</span>
                    <span className="difficulty-btn-count">{cont.count} pays</span>
                  </button>
                ))}
              </div>
            )}
          </>
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
                    onChange={(event) => handleSliderChange(difficultyName, event.target.value)}
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
          {"\uD83C\uDFC6"} Scores
        </button>
        <div className="game-card-buttons">
          <button
            className="btn-play"
            onClick={() => handlePlay(false)}
            disabled={
              (mode === "ascension" && totalAscensionCountries === 0) ||
              (mode === "standard" && selectionMode === "continent" && !selectedContinent)
            }
          >
            Jouer
          </button>
          <button
            className="btn-training"
            onClick={() => handlePlay(true)}
            disabled={mode === "standard" && selectionMode === "continent" && !selectedContinent}
          >
            Entraînement
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="home-page">
      <NavBar />
      <main className="home-main">
        <div className="home-hero">
          <h1 className="home-title">Choisissez votre jeu</h1>
          <p className="home-subtitle">Explore - Découvre - Compète</p>
        </div>
        <div className="home-multiplayer-banner">
          <button className="home-multiplayer-btn" onClick={() => navigate('/multiplayer')}>
            🎮 Jouer en multijoueur →
          </button>
        </div>
        <div className="games-grid">
          {GAMES.filter((game) => game.active).map((game) =>
            game.id === GAME_TYPES.BORDER_GUESS ? (
              <BorderGuessCard key={game.id} game={game} />
            ) : game.id === GAME_TYPES.COUNTRY_CLUE ? (
              <CountryClueCard key={game.id} game={game} />
            ) : game.cardType === "ranking" ? (
              <RankingCard key={game.id} game={game} />
            ) : (
              <ActiveGameCard key={game.id} game={game} />
            )
          )}
        </div>
      </main>
    </div>
  );
}
