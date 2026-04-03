import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import FlagGamePage from "./pages/FlagGamePage";
import CapitalsGamePage from "./pages/CapitalsGamePage";
import BorderGuessPage from "./pages/BorderGuessPage";
import ScoresPage from "./pages/ScoresPage";
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
        <Route path="/scores" element={<ScoresPage />} />
      </Routes>
    </Router>
  );
}
