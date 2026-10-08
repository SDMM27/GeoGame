import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../components/NavBar";
import AppBanner from "../components/AppBanner";
import GameTile from "./home/GameTile";
import GameConfigModal from "./home/GameConfigModal";
import { GAMES } from "./home/gameData";
import "./HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [configGameId, setConfigGameId] = useState(null);
  const configGame = GAMES.find((game) => game.id === configGameId) ?? null;
  const closeConfig = useCallback(() => setConfigGameId(null), []);

  return (
    <div className="home-page">
      <NavBar />
      <main className="home-main">
        <AppBanner />
        <div className="home-hero">
          <h1 className="home-title">{t('home.title')}</h1>
          <img src="/logo.png" alt="GeoGame" className="home-logo" />
          <p className="home-subtitle">{t('home.subtitle')}</p>
        </div>
        <div className="home-multiplayer-banner">
          <button className="home-multiplayer-btn" onClick={() => navigate('/multiplayer')}>
            {t('home.multiplayer_button')}
          </button>
        </div>
        <div className="games-grid">
          {GAMES.filter((game) => game.active).map((game) => (
            <GameTile key={game.id} game={game} onConfigure={setConfigGameId} />
          ))}
        </div>
      </main>
      {configGame && <GameConfigModal game={configGame} onClose={closeConfig} />}
    </div>
  );
}
