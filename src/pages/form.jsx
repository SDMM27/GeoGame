import React from "react";
import { useTranslation } from 'react-i18next';
import "./form.css";
import { saveScore } from "../utils/saveScore";
import { formatTime } from "../utils/formatTime";
import { useAccount } from "../auth";
import { useScoreSave } from "../hooks/useScoreSave";
import LeaderboardSave from "../components/LeaderboardSave";
import EndStamp from "../components/EndStamp";

export default function Form({ finalScore, difficulty, elapsedTime, gameType, continent }) {
  const { t } = useTranslation();
  const saver = useScoreSave(useAccount(), (player) =>
    saveScore({ ...player, score: finalScore, difficulty, elapsedTime, gameType, continent })
  );

  return (
    <div className="form-container gg-ticket form-ticket">
      <div className="form-ticket__main">
        <EndStamp />
        <p className="gg-kicker">{t('carnet_games.kicker_end')}</p>
        <h2 className="form-title">{t('form.title')}</h2>
        {difficulty && <p className="form-score-display">{difficulty}</p>}

        <LeaderboardSave
          saver={saver}
          existingText={(existing) => `${existing.score} ${t('units.pts')} — ${formatTime(existing.elapsedTime)}`}
          blockedLabel={t('form.better_score_exists')}
          blockedHint={t('form.use_different_name')}
        />
      </div>
      <div className="gg-ticket-stub form-ticket__stub">
        <span className="gg-field"><small>{t('game_hud.score')}</small><strong>{finalScore} {t('units.pts')}</strong></span>
        <span className="gg-field"><small>{t('game_hud.time')}</small><strong>{formatTime(elapsedTime)}</strong></span>
      </div>
    </div>
  );
}
