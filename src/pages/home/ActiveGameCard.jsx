import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ASCENSION_PRESETS, matchPreset } from "../../utils/ascensionPresets";
import {
  buildPresetPhases,
  getContinentsForGame,
  getDifficultiesForGame,
  getDifficultyCaps,
} from "./gameData";
import MultiButton from "./MultiButton";

export default function ActiveGameCard({ game }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState("standard");
  const [difficulty, setDifficulty] = useState("Facile");
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
      navigate(game.route, { state: { continent: continentOverride ?? selectedContinent, isTraining, gameType: game.id } });
      return;
    }

    navigate(game.route, { state: { difficulty: difficultyOverride ?? difficulty, isTraining, gameType: game.id } });
  };

  // The same choices for a multiplayer room (src/components/multiplayer/RoomConfig.jsx)
  const multiSetup =
    mode === "ascension"
      ? { mode: "ascension", phases: ascensionPhases }
      : selectionMode === "continent"
        ? { mode: "standard", continent: selectedContinent }
        : { mode: "standard", difficulty };

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
      <h2 className="game-card-title">{t(game.titleKey)}</h2>
      <p className="game-card-desc">{t(game.descKey)}</p>
      <div className="game-card-controls">
        <div className="game-mode-tabs">
          <button
            className={`game-mode-tab${mode === "standard" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("standard")}
          >
            {t('modes.standard')}
          </button>
          {!game.noAscension && <button
            className={`game-mode-tab${mode === "ascension" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("ascension")}
          >
            {t('modes.ascension')}
          </button>}
        </div>
        {mode === "standard" ? (
          <>
            <div className="game-mode-tabs">
              <button
                className={`game-mode-tab${selectionMode === "difficulty" ? " game-mode-tab--active" : ""}`}
                onClick={() => setSelectionMode("difficulty")}
              >
                {t('selection.by_difficulty')}
              </button>
              <button
                className={`game-mode-tab${selectionMode === "continent" ? " game-mode-tab--active" : ""}`}
                onClick={() => setSelectionMode("continent")}
              >
                {t('selection.by_continent')}
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
                      {difficultyOption.name === "Hardcore" ? t('difficulties.hardcore_all') : t(`difficulties.${difficultyOption.name}`)}
                    </span>
                    <span className="difficulty-btn-count">{t('units.countries', { count: difficultyOption.count })}</span>
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
                    <span className="difficulty-btn-name" style={{ color: cont.color }}>{t(`continents.${cont.name}`)}</span>
                    <span className="difficulty-btn-count">{t('units.countries', { count: cont.count })}</span>
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
                  <span className="ascension-preset-name">{preset.icon} {preset.name === "Progressif" ? t('presets.progressive') : preset.name}</span>
                  <span className="ascension-preset-count">
                    {t('units.countries', { count: Object.values(preset.phases).reduce((sum, count) => sum + count, 0) })}
                  </span>
                </button>
              ))}
            </div>
            <div className="ascension-status">
              <span className="ascension-status-label">{t('labels.configuration')}</span>
              <strong className="ascension-status-value">
                {detectedPreset ? `${detectedPreset.icon} ${detectedPreset.name === "Progressif" ? t('presets.progressive') : detectedPreset.name}` : t('presets.custom')}
              </strong>
              <span className="ascension-status-total">{totalAscensionCountries} {t('labels.total_countries')}</span>
            </div>
            {Object.entries(ascensionCaps).map(([difficultyName, maxCount]) => {
              const difficultyInfo = difficulties.find((item) => item.name === difficultyName);
              return (
                <label key={difficultyName} className="ascension-slider-row">
                  <div className="ascension-slider-head">
                    <span className="ascension-slider-name" style={{ color: difficultyInfo?.color }}>
                      {t(`difficulties.${difficultyName}`)}
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
          {t('buttons.scores')}
        </button>
        <div className="game-card-buttons">
          {game.multiId && (
            <MultiButton
              gameId={game.multiId}
              config={{ setup: multiSetup }}
              disabled={
                (mode === "ascension" && totalAscensionCountries === 0) ||
                (mode === "standard" && selectionMode === "continent" && !selectedContinent)
              }
            />
          )}
          <button
            className="btn-play"
            onClick={() => handlePlay(false)}
            disabled={
              (mode === "ascension" && totalAscensionCountries === 0) ||
              (mode === "standard" && selectionMode === "continent" && !selectedContinent)
            }
          >
            {t('buttons.play')}
          </button>
          <button
            className="btn-training"
            onClick={() => handlePlay(true)}
            disabled={mode === "standard" && selectionMode === "continent" && !selectedContinent}
          >
            {t('buttons.training')}
          </button>
        </div>
      </div>
    </div>
  );
}
