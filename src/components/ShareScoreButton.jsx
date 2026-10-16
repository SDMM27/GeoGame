import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { shareScoreText, exportShareCard, canShareImage } from '../utils/shareScore'
import { buildChallengeUrl } from '../utils/challenge'
import NudgeFriends from './NudgeFriends'
import './ShareScoreButton.css'

// `challenge` ({ route, dailyKey, solved }) : à fournir en mode daily pour afficher
// le bouton « Défier un ami », qui partage un lien vers le même défi du jour.
// `nudge` : false pour masquer « Défie un ami » quand la partie n'est pas enregistrée (modes infinis), le serveur
// refuserait la notification faute de partie récente.
// `scoreText` (« 9/12 ») et `grid` (les manches du Challenge du jour) : voir generateShareText.
export default function ShareScoreButton({ score, gameType, difficulty, scoreLabel = 'POINTS', scoreText, details, grid, challenge, nudge = true }) {
  const { t } = useTranslation()
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('geogame_pseudo') ?? '')
  const [copied, setCopied] = useState(false)
  const [challengeCopied, setChallengeCopied] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  // Native image share when the browser supports files, PNG download otherwise.
  const imageShareable = canShareImage()

  const handleCopy = async () => {
    localStorage.setItem('geogame_pseudo', pseudo)
    try {
      const result = await shareScoreText({ score, gameType, difficulty, pseudo, scoreLabel, scoreText, details, grid })
      if (result === 'copied') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleChallenge = async () => {
    localStorage.setItem('geogame_pseudo', pseudo)
    const challengeUrl = buildChallengeUrl({
      route: challenge.route,
      pseudo,
      score,
      dailyKey: challenge.dailyKey,
      solved: challenge.solved,
    })
    try {
      const result = await shareScoreText({ score, gameType, difficulty, pseudo, scoreLabel, scoreText, details, grid, challengeUrl })
      if (result === 'copied') {
        setChallengeCopied(true)
        setTimeout(() => setChallengeCopied(false), 2000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleImage = async () => {
    localStorage.setItem('geogame_pseudo', pseudo)
    setImageBusy(true)
    try {
      await exportShareCard({ score, gameType, difficulty, pseudo, scoreLabel, scoreText })
    } catch (err) {
      console.error(err)
    } finally {
      setImageBusy(false)
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
      {challenge ? (
        <button
          className="share-copy-btn share-challenge-btn"
          onClick={handleChallenge}
          aria-label={challengeCopied ? t('challenge.link_copied') : t('challenge.button')}
        >
          {challengeCopied ? t('challenge.link_copied') : t('challenge.button')}
        </button>
      ) : (
        <button
          className="share-copy-btn"
          onClick={handleCopy}
          aria-label={copied ? t('share.copied') : t('share.copy_button')}
        >
          {copied ? t('share.copied') : t('share.copy_button')}
        </button>
      )}
      <button
        className="share-copy-btn share-image-btn"
        onClick={handleImage}
        disabled={imageBusy}
      >
        {imageShareable ? t('share.share_image') : t('share.download_image')}
      </button>
      {nudge && <NudgeFriends gameType={gameType} recent={!challenge} />}
    </div>
  )
}
