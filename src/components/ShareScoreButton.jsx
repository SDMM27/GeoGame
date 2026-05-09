import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { copyShareText } from '../utils/shareScore'
import './ShareScoreButton.css'

export default function ShareScoreButton({ score, gameType, difficulty, scoreLabel = 'POINTS', details }) {
  const { t } = useTranslation()
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('geogame_pseudo') ?? '')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    localStorage.setItem('geogame_pseudo', pseudo)
    try {
      await copyShareText({ score, gameType, difficulty, pseudo, scoreLabel, details })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="share-score-block">
      <input
        aria-label={t('share.pseudo_placeholder')}
        className="share-pseudo-input"
        type="text"
        placeholder={t('share.pseudo_placeholder')}
        value={pseudo}
        onChange={e => setPseudo(e.target.value)}
        maxLength={30}
      />
      <button
        className="share-copy-btn"
        onClick={handleCopy}
        aria-label={copied ? t('share.copied') : t('share.copy_button')}
      >
        {copied ? t('share.copied') : t('share.copy_button')}
      </button>
    </div>
  )
}
