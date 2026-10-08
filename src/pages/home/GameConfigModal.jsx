import React, { useEffect } from "react";
import ActiveGameCard from "./ActiveGameCard";
import SurvivalCard from "./SurvivalCard";
import { GAME_TYPES } from "../../utils/gameTypes";

export default function GameConfigModal({ game, onClose }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="game-modal-overlay" onClick={onClose}>
      <div className="game-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="game-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        {game.id === GAME_TYPES.SURVIVAL ? <SurvivalCard game={game} /> : <ActiveGameCard game={game} />}
      </div>
    </div>
  );
}
