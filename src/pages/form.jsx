import React from "react";
import { useTranslation } from 'react-i18next';
import "./form.css";
import { saveScore } from "../utils/saveScore";
import { formatTime } from "../utils/formatTime";
import { useAccount } from "../auth";
import { useScoreSave } from "../hooks/useScoreSave";
import LeaderboardSave from "../components/LeaderboardSave";

export default function Form({ finalScore, difficulty, elapsedTime, gameType, continent }) {
  const { t } = useTranslation();
  const saver = useScoreSave(useAccount(), (player) =>
    saveScore({ ...player, score: finalScore, difficulty, elapsedTime, gameType, continent })
  );

  return (
    <div className="form-container">
      <h2 className="form-title">{t('form.title')}</h2>
      <p className="form-score-display">
        {t('labels.score')} <strong>{finalScore} {t('units.pts')}</strong> — {difficulty}
      </p>
      <p className="form-score-display">
        {t('labels.time')} <strong>{formatTime(elapsedTime)}</strong>
      </p>

      <LeaderboardSave
        saver={saver}
        existingText={(existing) => `${existing.score} ${t('units.pts')} — ${formatTime(existing.elapsedTime)}`}
        blockedLabel={t('form.better_score_exists')}
        blockedHint={t('form.use_different_name')}
      />
    </div>
  );
}
