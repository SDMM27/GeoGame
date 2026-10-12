import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GAME_TYPES } from "../../utils/gameTypes";

// Jeux lancés directement depuis la tuile, avec un bouton par mode
const DAILY_INFINITE_GAMES = new Set([
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.COUNTRY_CLUE,
  GAME_TYPES.VOYAGE_VOYAGE,
  "ranking",
  GAME_TYPES.QUIZ,
]);

// The game's own color, as in the app (--game-placement, --game-border-guess... in styles/theme.css)
const gameColor = (id) => `var(--game-${id.toLowerCase().replace(/_/g, "-")})`;

export default function GameTile({ game, onConfigure }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isDailyInfinite = DAILY_INFINITE_GAMES.has(game.id);

  return (
    <div className="game-tile" style={{ "--game": gameColor(game.id) }}>
      <div className="game-tile-head">
        <span className="game-tile-icon">{game.icon}</span>
        <h2 className="game-tile-title">{t(game.titleKey)}</h2>
      </div>
      <p className="game-tile-desc">{t(game.descKey)}</p>
      <div className="game-tile-actions">
        {isDailyInfinite ? (
          <>
            <button className="btn-play" onClick={() => navigate(game.route, { state: { mode: "daily" } })}>
              {t('modes.daily')}
            </button>
            <button className="btn-tile-secondary" onClick={() => navigate(game.route, { state: { mode: "infinite" } })}>
              {t('modes.infinite')}
            </button>
          </>
        ) : game.directLaunch ? (
          <button className="btn-play" onClick={() => navigate(game.route)}>
            {t('buttons.play')}
          </button>
        ) : (
          <button className="btn-play" onClick={() => onConfigure(game.id)}>
            {t('buttons.play')}
          </button>
        )}
      </div>
      {!isDailyInfinite && !game.directLaunch && (
        <button className="nav-scores-btn game-tile-scores" onClick={() => navigate(`/scores?game=${game.id}`)}>
          {t('buttons.scores')}
        </button>
      )}
    </div>
  );
}
