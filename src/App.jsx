import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import FlagGamePage from "./pages/FlagGamePage";
import CapitalsGamePage from "./pages/CapitalsGamePage";
import BorderGuessPage from "./pages/BorderGuessPage";
import CountryCluePage from "./pages/CountryCluePage";
import RankingGamePage from "./pages/RankingGamePage";
import ScoresPage from "./pages/ScoresPage";
import MultiplayerHomePage from "./pages/multiplayer/MultiplayerHomePage";
import MultiplayerCreatePage from "./pages/multiplayer/MultiplayerCreatePage";
import MultiplayerRoomPage from "./pages/multiplayer/MultiplayerRoomPage";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/flag-game" element={<FlagGamePage />} />
        <Route path="/capitals-game" element={<CapitalsGamePage />} />
        <Route path="/border-guess" element={<BorderGuessPage />} />
        <Route path="/country-clue" element={<CountryCluePage />} />
        <Route path="/ranking" element={<RankingGamePage />} />
        <Route path="/scores" element={<ScoresPage />} />
        <Route path="/multiplayer" element={<MultiplayerHomePage />} />
        <Route path="/multiplayer/create" element={<MultiplayerCreatePage />} />
        <Route path="/multiplayer/room/:roomId" element={<MultiplayerRoomPage />} />
      </Routes>
    </Router>
  );
}
