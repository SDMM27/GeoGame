import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SurvivalOptions from "../../components/SurvivalOptions";
import { GAME_TYPES } from "../../utils/gameTypes";
import { DEFAULT_SURVIVAL_LIVES, SURVIVAL_ROUND_TYPES } from "../../utils/survivalConfig";

// Survival setup: the games of the rounds and the number of lives.
export default function SurvivalCard({ game }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [options, setOptions] = useState({ modes: SURVIVAL_ROUND_TYPES, lives: DEFAULT_SURVIVAL_LIVES });

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{t(game.titleKey)}</h2>
      <p className="game-card-desc">{t(game.descKey)}</p>
      <div className="game-card-controls">
        <SurvivalOptions modes={options.modes} lives={options.lives} onChange={setOptions} />
        <button className="nav-scores-btn" onClick={() => navigate(`/scores?game=${GAME_TYPES.SURVIVAL}`)}>
          {t('buttons.scores')}
        </button>
        <div className="game-card-buttons">
          <button
            className="btn-play"
            onClick={() => navigate(game.route, { state: options })}
            disabled={options.modes.length === 0}
          >
            {t('buttons.play')}
          </button>
        </div>
      </div>
    </div>
  );
}
