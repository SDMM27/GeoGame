// The Play section as a « carnet de vol »: the hero (split-flap motto, countdown to the next dailies, the interactive
// globe), the daily challenges as boarding passes, the missions and league as a passport, the games as a departures
// board, the Atlas.
import React, { lazy, Suspense, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../components/NavBar";
import AppBanner from "../components/AppBanner";
import LegalLinks from "../components/LegalLinks";
import MissionsCard from "./home/MissionsCard";
import LeagueCard from "./home/LeagueCard";
import LeagueVictoryOverlay from "../components/league/LeagueVictoryOverlay";
import GameConfigModal from "./home/GameConfigModal";
import BoardingPass from "./home/flight/BoardingPass";
import Countdown from "./home/flight/Countdown";
import DeparturesBoard from "./home/flight/DeparturesBoard";
import FlapText from "./home/flight/FlapText";
import NextFlightBoard from "./home/flight/NextFlightBoard";
import PassportStamps from "./home/flight/PassportStamps";
import { useAccount } from "../auth";
import { useMissions } from "../hooks/useMissions";
import { GAMES } from "./home/gameData";
import { nextFlight } from "../utils/nextFlight";
import "./HomePage.css";
import "./home/flight/flight.css";

// The globe (d3-geo, the land, the canvas code) is not needed for the first paint
const FlightGlobe = lazy(() => import("../components/globe/FlightGlobe"));

const DAILY_GAMES = GAMES.filter((game) => game.active && game.kind === "daily");
const SETUP_GAMES = GAMES.filter((game) => game.active && (game.kind === "setup" || game.kind === "survival"));
// What the globe can offer once the city is found (utils/nextFlight.js): the dailies first, then the other games
const GLOBE_FLIGHTS = [
  ...DAILY_GAMES.map((game) => ({ type: game.id.toUpperCase(), daily: true, game })),
  ...SETUP_GAMES.map((game) => ({ type: game.id.toUpperCase(), daily: false, game })),
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [configGameId, setConfigGameId] = useState(null);
  const [configInitialMode, setConfigInitialMode] = useState("standard");
  const [globeScore, setGlobeScore] = useState(0);
  const { account } = useAccount();
  // Loaded once for the missions card and the dailies played today (one history read)
  const missions = useMissions(account?.uid ?? null);
  const dailyStatus = missions.dailies?.status ?? null;
  // The player's finds on the globe: each one swings down the board with the next flight to take
  const [globeFinds, setGlobeFinds] = useState(0);
  const [offerOpen, setOfferOpen] = useState(false);
  const onGlobeFind = useCallback(() => { setGlobeFinds((n) => n + 1); setOfferOpen(true); }, []);
  const closeOffer = useCallback(() => setOfferOpen(false), []);
  const configGame = GAMES.find((game) => game.id === configGameId) ?? null;
  const closeConfig = useCallback(() => { setConfigGameId(null); setConfigInitialMode("standard"); }, []);
  // « Explore - Découvre - Voyage » → « EXPLORE · DÉCOUVRE · VOYAGE »
  const motto = t("home.subtitle").split(/\s+-\s+/).join(" · ").toLocaleUpperCase(i18n.resolvedLanguage);
  const firstDaily = DAILY_GAMES[0];
  const offer = offerOpen ? nextFlight(GLOBE_FLIGHTS, { dailyStatus, playedToday: missions.playedToday, turn: globeFinds - 1 }) : null;
  const boardFlight = (flight) => {
    setOfferOpen(false);
    if (flight.daily) navigate(flight.game.route, { state: { mode: "daily" } });
    else setConfigGameId(flight.game.id);
  };

  const boardRows = [
    ...SETUP_GAMES.map((game, i) => ({
      id: game.id,
      game: game.id,
      title: t(game.titleKey),
      description: t(game.descKey),
      status: i === 0 ? "boarding" : "on_time",
      onClick: () => setConfigGameId(game.id),
    })),
    { id: "atlas", title: t("atlas.title"), description: t("atlas.subtitle"), status: "open", onClick: () => navigate("/atlas") },
  ];

  return (
    <div className="home-page">
      <NavBar />
      <main className="home-main">
        <AppBanner />

        <section className="flight-hero" aria-labelledby="home-title">
          <div className="flight-hero-copy">
            <p className="gg-mono flight-hero-motto"><FlapText text={motto} duration={1200} /></p>
            <h1 id="home-title" className="flight-hero-title">{t("home.greeting")}</h1>
            <p className="flight-hero-lead">{t("home.hero_lead", { count: DAILY_GAMES.length })}</p>
            <div className="flight-hero-panels">
              <div className="flight-panel">
                <span className="gg-mono flight-panel-label">{t("home.next_departure")}</span>
                <Countdown className="flight-panel-value flight-panel-value--accent" />
              </div>
              <div className="flight-panel">
                <span className="gg-mono flight-panel-label">{t("home.globe_score")}</span>
                <span className="flight-panel-value" aria-live="polite">{globeScore}</span>
              </div>
            </div>
            {firstDaily && (
              <button
                type="button"
                className="flight-cta sd-spring"
                onClick={() => navigate(firstDaily.route, { state: { mode: "daily" } })}
              >
                {t("home.board_cta")}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            )}
          </div>
          <div className="flight-hero-globe">
            <Suspense fallback={<div className="flight-globe-placeholder" aria-hidden="true" />}>
              <FlightGlobe
                onScore={setGlobeScore}
                onFind={onGlobeFind}
                overlay={offerOpen && (
                  <NextFlightBoard
                    key={globeFinds}
                    flight={offer && { game: offer.game.id, title: t(offer.game.titleKey), daily: offer.daily }}
                    onBoard={() => boardFlight(offer)}
                    onClose={closeOffer}
                  />
                )}
              />
            </Suspense>
          </div>
        </section>

        <section className="home-section" aria-labelledby="home-daily">
          <div className="flight-section-head">
            <h2 id="home-daily">{t("home.passes_title")}</h2>
            <p className="gg-mono">{t("home.passes_note", { count: DAILY_GAMES.length })}</p>
          </div>
          <div className="boarding-passes">
            {DAILY_GAMES.map((game, i) => (
              <BoardingPass
                key={game.id}
                game={game}
                index={i}
                status={dailyStatus && (dailyStatus[game.id.toUpperCase()] ?? "todo")}
              />
            ))}
          </div>
        </section>

        <section className="passport" aria-labelledby="home-passport">
          <div className="passport-head">
            <div className="passport-intro">
              <h2 id="home-passport">{t("home.passport_title")}</h2>
              <p>{t("home.passport_intro")}</p>
            </div>
            <PassportStamps missions={account ? missions : null} />
          </div>
          <div className="passport-cards">
            <MissionsCard missions={missions} />
            <LeagueCard />
          </div>
        </section>

        <section className="home-section" aria-labelledby="home-ascension">
          <button
            type="button"
            className="ascension-featured"
            onClick={() => { setConfigInitialMode("ascension"); setConfigGameId("PLACEMENT"); }}
          >
            <span className="ascension-featured-icon" aria-hidden="true">🏔️</span>
            <span className="ascension-featured-copy">
              <span className="gg-mono ascension-featured-kicker">{t("home.special_flight")}</span>
              <strong id="home-ascension">{t("modes.ascension")}</strong>
              <span>{t("games.placement.description")}</span>
            </span>
            <span className="ascension-featured-cta">{t("buttons.play")} →</span>
          </button>
        </section>

        <section className="home-section" aria-labelledby="home-games">
          <div className="flight-section-head">
            <h2 id="home-games">{t("home.board_title")}</h2>
            <p className="gg-mono">{t("home.games_subtitle")}</p>
          </div>
          <DeparturesBoard rows={boardRows} labelledBy="home-games" />
        </section>
      </main>
      <LegalLinks />
      <LeagueVictoryOverlay />
      {configGame && <GameConfigModal game={configGame} initialMode={configInitialMode} onClose={closeConfig} />}
    </div>
  );
}
