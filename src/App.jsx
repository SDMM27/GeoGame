import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import FlagGamePage from "./pages/FlagGamePage";
import ScoresPage from "./pages/ScoresPage";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/flag-game" element={<FlagGamePage />} />
        <Route path="/scores" element={<ScoresPage />} />
      </Routes>
    </Router>
  );
}
