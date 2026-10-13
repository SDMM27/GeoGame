import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MultiIcon } from "../../components/NavIcons";

// The group button of a game's settings, as in the app: the same choices, played in a multiplayer room.
// `config`: what RoomConfig starts from, { setup } for Placement / Flags / Capitals, { survival } for Survival.
export default function MultiButton({ gameId, config, disabled }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn-multi"
      onClick={() => navigate("/multiplayer/create", { state: { gameId, config } })}
      disabled={disabled}
      aria-label={t("home.multi")}
      title={t("home.multi")}
    >
      <MultiIcon />
    </button>
  );
}
