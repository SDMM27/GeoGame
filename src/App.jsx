import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react"
import HomePage from "./pages/HomePage";
import RouteFallback from "./components/RouteFallback";
import RouteMeta from "./components/RouteMeta";
import XpToast from "./components/XpToast";
import FragmentToast from "./components/collection/FragmentToast";
import FlagUnlockOverlay from "./components/collection/FlagUnlockOverlay";
import PresenceHeartbeat from "./components/PresenceHeartbeat";
import InviteBanner from "./components/multiplayer/InviteBanner";
import RouteErrorBoundary, { ErrorBoundary } from "./components/RouteErrorBoundary";
import { loadCountryGeometries } from "./data/countryGeometry";

// Pages that draw the countries need the (separately loaded) geometries along with their code.
const lazyWithGeometries = (load) =>
  lazy(() => Promise.all([load(), loadCountryGeometries()]).then(([module]) => module));

const GamePage = lazyWithGeometries(() => import("./pages/GamePage"));
const FlagGamePage = lazy(() => import("./pages/FlagGamePage"));
const MissingFlagGamePage = lazy(() => import("./pages/FlagGamePage").then((module) => ({ default: module.MissingFlagGamePage })));
const CapitalsGamePage = lazy(() => import("./pages/CapitalsGamePage"));
const BorderGuessPage = lazyWithGeometries(() => import("./pages/BorderGuessPage"));
const CountryCluePage = lazyWithGeometries(() => import("./pages/CountryCluePage"));
const RankingGamePage = lazy(() => import("./pages/RankingGamePage"));
const VoyageVoyagePage = lazyWithGeometries(() => import("./pages/VoyageVoyagePage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const DailyChallengePage = lazyWithGeometries(() => import("./pages/DailyChallengePage"));
const CountryOfDayPage = lazyWithGeometries(() => import("./pages/CountryOfDayPage"));
const SurvivalPage = lazyWithGeometries(() => import("./pages/SurvivalPage"));
const AtlasPage = lazyWithGeometries(() => import("./pages/atlas/AtlasPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const PlayerPage = lazy(() => import("./pages/PlayerPage"));
const AddFriendPage = lazy(() => import("./pages/AddFriendPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const ScoresPage = lazy(() => import("./pages/ScoresPage"));
const LegalPage = lazy(() => import("./pages/legal/LegalPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const MultiplayerHomePage = lazy(() => import("./pages/multiplayer/MultiplayerHomePage"));
const MultiplayerCreatePage = lazy(() => import("./pages/multiplayer/MultiplayerCreatePage"));
const MultiplayerRoomPage = lazyWithGeometries(() => import("./pages/multiplayer/MultiplayerRoomPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <RouteMeta />
        <InviteBanner />
        <XpToast />
        <FragmentToast />
        <FlagUnlockOverlay />
        <PresenceHeartbeat />
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/flag-game" element={<FlagGamePage />} />
              <Route path="/missing-flag" element={<MissingFlagGamePage />} />
              <Route path="/capitals-game" element={<CapitalsGamePage />} />
              <Route path="/border-guess" element={<BorderGuessPage />} />
              <Route path="/country-clue" element={<CountryCluePage />} />
              <Route path="/voyage-voyage" element={<VoyageVoyagePage />} />
              <Route path="/ranking" element={<RankingGamePage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/challenge" element={<DailyChallengePage />} />
              <Route path="/country-of-the-day" element={<CountryOfDayPage />} />
              <Route path="/survival" element={<SurvivalPage />} />
              <Route path="/atlas" element={<AtlasPage />} />
              <Route path="/scores" element={<ScoresPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/player/:uid" element={<PlayerPage />} />
              <Route path="/add/:username" element={<AddFriendPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/multiplayer" element={<MultiplayerHomePage />} />
              <Route path="/multiplayer/create" element={<MultiplayerCreatePage />} />
              <Route path="/multiplayer/room/:roomId" element={<MultiplayerRoomPage />} />
              <Route path="/privacy" element={<LegalPage doc="privacy" />} />
              <Route path="/terms" element={<LegalPage doc="terms" />} />
              <Route path="/legal" element={<LegalPage doc="legal" />} />
              <Route path="/delete-account" element={<LegalPage doc="deleteAccount" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
        <Analytics />
      </Router>
    </ErrorBoundary>
  );
}
