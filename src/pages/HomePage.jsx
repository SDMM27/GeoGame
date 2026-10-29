// The Play section, laid out like the app's home: the daily challenges, the games with settings, the Atlas.
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../components/NavBar";
import AppBanner from "../components/AppBanner";
import LegalLinks from "../components/LegalLinks";
import MissionsCard from "./home/MissionsCard";
import GameConfigModal from "./home/GameConfigModal";
import { DailyCard, HomeRow } from "./home/HomeCards";
import { useAccount } from "../auth";
import { useMissions } from "../hooks/useMissions";
import { gameColor } from "../utils/roomGames";
import { GAMES } from "./home/gameData";
import "./HomePage.css";

const DAILY_GAMES = GAMES.filter((game) => game.active && game.kind === "daily");
const SETUP_GAMES = GAMES.filter((game) => game.active && (game.kind === "setup" || game.kind === "survival"));

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [configGameId, setConfigGameId] = useState(null);
  const [configInitialMode, setConfigInitialMode] = useState("standard");
  const { account } = useAccount();
  // Loaded once for the missions card and the dailies played today (one history read)
  const missions = useMissions(account?.uid ?? null);
  const dailyStatus = missions.dailies?.status ?? null;
  const configGame = GAMES.find((game) => game.id === configGameId) ?? null;
  const closeConfig = useCallback(() => { setConfigGameId(null); setConfigInitialMode("standard"); }, []);

  return (
    <div className="home-page">
      <NavBar />
      <main className="home-main">
        <AppBanner />
        <header className="home-header">
          <h1 className="home-title">{t("home.greeting")}</h1>
          <p className="home-subtitle">{t("home.subtitle")}</p>
        </header>

        <section className="home-section" aria-labelledby="home-daily">
          <div className="home-section-head">
            <h2 id="home-daily">{t("home.daily_title")}</h2>
            <p>{t("home.daily_subtitle")}</p>
          </div>
          <div className="daily-row">
            {DAILY_GAMES.map((game) => (
              <DailyCard key={game.id} game={game} status={dailyStatus && (dailyStatus[game.id.toUpperCase()] ?? "todo")} />
            ))}
          </div>
        </section>

        <section className="home-section">
          <MissionsCard missions={missions} />
        </section>

        <section className="home-section" aria-labelledby="home-ascension">
          <button
            type="button"
            className="ascension-featured"
            onClick={() => { setConfigInitialMode("ascension"); setConfigGameId("PLACEMENT"); }}
          >
            <span className="ascension-featured-icon" aria-hidden="true">🏔️</span>
            <span className="ascension-featured-copy">
              <strong id="home-ascension">{t("modes.ascension")}</strong>
              <span>{t("games.placement.description")}</span>
            </span>
            <span className="ascension-featured-cta">{t("buttons.play")} →</span>
          </button>
        </section>

        <section className="home-section" aria-labelledby="home-games">
          <div className="home-section-head">
            <h2 id="home-games">{t("home.games_title")}</h2>
            <p>{t("home.games_subtitle")}</p>
          </div>
          <div className="home-rows">
            {SETUP_GAMES.map((game) => (
              <HomeRow
                key={game.id}
                icon={game.icon}
                color={gameColor(game.id)}
                title={t(game.titleKey)}
                description={t(game.descKey)}
                onClick={() => setConfigGameId(game.id)}
              />
            ))}
          </div>
        </section>

        <section className="home-section home-rows">
          <HomeRow
            icon="🗺️"
            color="var(--highlight)"
            title={t("atlas.title")}
            description={t("atlas.subtitle")}
            onClick={() => navigate("/atlas")}
          />
        </section>
      </main>
      <LegalLinks />
      {configGame && <GameConfigModal game={configGame} initialMode={configInitialMode} onClose={closeConfig} />}
    </div>
  );
}
