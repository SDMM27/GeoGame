// The home page's cards, as in the app: a card per daily challenge, a row per game with settings, the Atlas.
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MultiIcon } from "../../components/NavIcons";

// The game's own color, as in the app (--game-placement, --game-border-guess... in styles/theme.css)
export const gameColor = (id) => `var(--game-${id.toLowerCase().replace(/_/g, "-")})`;

const Chevron = () => (
  <svg className="home-row-chevron" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function DailyCard({ game }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <article className="daily-card" style={{ "--game": gameColor(game.id) }}>
      <span className="home-icon" aria-hidden="true">{game.icon}</span>
      <h3 className="daily-card-title">{t(game.titleKey)}</h3>
      <p className="daily-card-desc">{t(game.descKey)}</p>
      <div className="daily-card-actions">
        <button type="button" className="daily-card-primary" onClick={() => navigate(game.route, { state: { mode: "daily" } })}>
          📅 {t("home.daily")}
        </button>
        <button
          type="button"
          className="daily-card-secondary"
          onClick={() => navigate(game.route, { state: { mode: "infinite" } })}
          aria-label={t("home.infinite")}
          title={t("home.infinite")}
        >
          <span aria-hidden="true">∞</span>
        </button>
        {game.multiId && (
          <button
            type="button"
            className="daily-card-secondary"
            onClick={() => navigate("/multiplayer/create", { state: { gameId: game.multiId } })}
            aria-label={t("home.multi")}
            title={t("home.multi")}
          >
            <MultiIcon />
          </button>
        )}
      </div>
    </article>
  );
}

export function HomeRow({ icon, color, title, description, onClick }) {
  return (
    <button type="button" className="home-row" style={{ "--game": color }} onClick={onClick}>
      <span className="home-icon home-icon--large" aria-hidden="true">{icon}</span>
      <span className="home-row-text">
        <span className="home-row-title">{title}</span>
        <span className="home-row-desc">{description}</span>
      </span>
      <Chevron />
    </button>
  );
}
