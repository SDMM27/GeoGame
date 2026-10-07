import React, { useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import "./form.css";
import "react-toastify/dist/ReactToastify.css";
import { saveScore } from "../utils/saveScore";
import { toast } from "react-toastify";
import { formatTime } from "../utils/formatTime";
import { getSavedPseudo } from "../utils/account";

export default function Form({ finalScore, difficulty, elapsedTime, gameType, continent }) {
  const { t } = useTranslation();
  const nameRef = useRef();
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockedByBetterScore, setBlockedByBetterScore] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (submitting || saved) return;
    const name = nameRef.current.value.trim();
    if (!name) {
      toast.error(t('messages.please_enter_username'), { containerId: "topRightToast" });
      return;
    }
    setSubmitting(true);

    try {
      const result = await saveScore({ name, score: finalScore, difficulty, elapsedTime, gameType, continent });
      if (result.status === "blocked") {
        setBlockedByBetterScore(result.existing);
        setSubmitting(false);
        return;
      }
      toast.success(
        result.status === "updated" ? "Score mis à jour !" : `Score de ${name} sauvegardé !`,
        { containerId: "topRightToast" }
      );
      setSaved(true);
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde", { containerId: "topRightToast" });
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">{t('form.title')}</h2>
      <p className="form-score-display">
        {t('labels.score')} <strong>{finalScore} {t('units.pts')}</strong> — {difficulty}
      </p>
      <p className="form-score-display">
        {t('labels.time')} <strong>{formatTime(elapsedTime)}</strong>
      </p>

      {blockedByBetterScore && (
        <div className="form-blocked">
          <p className="form-blocked-message">
            ⚠️ {t('form.better_score_exists')}
          </p>
          <p className="form-blocked-score">
            <strong>{blockedByBetterScore.score} {t('units.pts')}</strong> — {formatTime(blockedByBetterScore.elapsedTime)}
          </p>
          <p className="form-blocked-hint">{t('form.use_different_name')}</p>
        </div>
      )}
      <form onSubmit={handleSave}>
        <label htmlFor="name" className="form-label">{t('labels.username')}</label>
        <input
          type="text"
          id="name"
          ref={nameRef}
          defaultValue={getSavedPseudo()}
          className="form-input"
          placeholder={t('placeholders.username')}
          maxLength={20}
        />
        <button type="submit" className="form-submit" disabled={saved || submitting}>
          {saved ? t('form.score_saved') : submitting ? t('form.saving') : t('buttons.save_score')}
        </button>
      </form>
    </div>
  );
}
