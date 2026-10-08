import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react"
import HomePage from "./pages/HomePage";
import RouteFallback from "./components/RouteFallback";
import RouteErrorBoundary, { ErrorBoundary } from "./components/RouteErrorBoundary";
import { loadCountryGeometries } from "./data/countryGeometry";

// Pages that draw the countries need the (separately loaded) geometries along with their code.
const lazyWithGeometries = (load) =>
  lazy(() => Promise.all([load(), loadCountryGeometries()]).then(([module]) => module));

const GamePage = lazyWithGeometries(() => import("./pages/GamePage"));
const FlagGamePage = lazy(() => import("./pages/FlagGamePage"));
const CapitalsGamePage = lazy(() => import("./pages/CapitalsGamePage"));
const BorderGuessPage = lazyWithGeometries(() => import("./pages/BorderGuessPage"));
const CountryCluePage = lazyWithGeometries(() => import("./pages/CountryCluePage"));
const RankingGamePage = lazy(() => import("./pages/RankingGamePage"));
const VoyageVoyagePage = lazyWithGeometries(() => import("./pages/VoyageVoyagePage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const SurvivalPage = lazyWithGeometries(() => import("./pages/SurvivalPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const PlayerPage = lazy(() => import("./pages/PlayerPage"));
const ScoresPage = lazy(() => import("./pages/ScoresPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const MultiplayerHomePage = lazy(() => import("./pages/multiplayer/MultiplayerHomePage"));
const MultiplayerCreatePage = lazy(() => import("./pages/multiplayer/MultiplayerCreatePage"));
const MultiplayerRoomPage = lazyWithGeometries(() => import("./pages/multiplayer/MultiplayerRoomPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/flag-game" element={<FlagGamePage />} />
              <Route path="/capitals-game" element={<CapitalsGamePage />} />
              <Route path="/border-guess" element={<BorderGuessPage />} />
              <Route path="/country-clue" element={<CountryCluePage />} />
              <Route path="/voyage-voyage" element={<VoyageVoyagePage />} />
              <Route path="/ranking" element={<RankingGamePage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/survival" element={<SurvivalPage />} />
              <Route path="/scores" element={<ScoresPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/player/:uid" element={<PlayerPage />} />
              <Route path="/multiplayer" element={<MultiplayerHomePage />} />
              <Route path="/multiplayer/create" element={<MultiplayerCreatePage />} />
              <Route path="/multiplayer/room/:roomId" element={<MultiplayerRoomPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
        <Analytics />
      </Router>
    </ErrorBoundary>
  );
}
