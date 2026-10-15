import i18n from '../i18n'

// Static fallback labels (used when i18n is not initialised, e.g. in tests)
export const GAME_LABELS = {
  PLACEMENT: 'Placement',
  FLAGS: 'Jeu des Drapeaux',
  CAPITALS: 'Capitales',
  BORDER_GUESS: 'Border Guess',
  COUNTRY_CLUE: 'Country Clue',
  RANKING: 'Country Ranking',
  VOYAGE_VOYAGE: 'Voyage Voyage',
  QUIZ: 'Quiz Géo',
}

// Maps game type keys → i18n locale paths
const GAME_TYPE_LOCALE_KEYS = {
  FLAGS: 'games.flags.title',
  PLACEMENT: 'games.placement.title',
  CAPITALS: 'games.capitals.title',
  BORDER_GUESS: 'games.border_guess.title',
  COUNTRY_CLUE: 'games.country_clue.title',
  RANKING: 'games.ranking.title',
  VOYAGE_VOYAGE: 'games.voyage_voyage.title',
  QUIZ: 'games.quiz.title',
}

function getGameLabel(gameType) {
  const key = GAME_TYPE_LOCALE_KEYS[gameType]
  if (key && i18n.isInitialized) return i18n.t(key)
  return GAME_LABELS[gameType] ?? gameType
}

function translateDifficulty(diff) {
  if (!diff) return ''
  if (!i18n.isInitialized) return diff
  if (i18n.exists(`difficulties.${diff}`)) return i18n.t(`difficulties.${diff}`)
  const modeMap = {
    'Daily': 'modes.daily',
    'Infini': 'modes.infinite',
    'Infinite': 'modes.infinite',
    'Journalier': 'modes.daily',
    'daily': 'modes.daily',
    'infinite': 'modes.infinite',
  }
  if (modeMap[diff]) return i18n.t(modeMap[diff])
  return diff
}

function t(key, fallback) {
  if (i18n.isInitialized) return i18n.t(key)
  return fallback
}

export function generateShareCard({ score, gameType, difficulty, pseudo, scoreLabel = 'POINTS' }) {
  return new Promise((resolve, reject) => {
    try {
      const W = 1200, H = 630
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D context unavailable')

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, '#0f2027')
      grad.addColorStop(0.5, '#203a43')
      grad.addColorStop(1, '#2c5364')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Decorative circles (top-right corner)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(W + 60, -60, 260, 0, Math.PI * 2)
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(W + 30, -30, 160, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      const padX = 72
      const padY = 50

      // Branding (top-left)
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 16px "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('🌍 GEOGAME', padX, padY + 16)
      ctx.restore()

      // Difficulty badge (top-right)
      const badgeText = difficulty ?? ''
      if (badgeText) {
        ctx.save()
        ctx.font = '13px "Segoe UI", sans-serif'
        const bW = ctx.measureText(badgeText).width + 28
        const bX = W - padX - bW
        const bY = padY - 4
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(bX, bY, bW, 28, 14)
        } else {
          const r = 14, x = bX, y = bY, w = bW, h = 28
          ctx.moveTo(x + r, y)
          ctx.lineTo(x + w - r, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + r)
          ctx.lineTo(x + w, y + h - r)
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
          ctx.lineTo(x + r, y + h)
          ctx.quadraticCurveTo(x, y + h, x, y + h - r)
          ctx.lineTo(x, y + r)
          ctx.quadraticCurveTo(x, y, x + r, y)
          ctx.closePath()
        }
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.globalAlpha = 0.8
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(badgeText, bX + bW / 2, bY + 18)
        ctx.restore()
      }

      // Game mode label (center, above score)
      const label = getGameLabel(gameType)
      const centerY = H / 2
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label.toUpperCase(), W / 2, centerY - 60)
      ctx.restore()

      // Score (large, center)
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 96px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(Math.round(score ?? 0)), W / 2, centerY + 28)
      ctx.restore()

      // Score label (below score)
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.fillStyle = '#ffffff'
      ctx.font = '13px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(scoreLabel, W / 2, centerY + 60)
      ctx.restore()

      // Pseudo (bottom-left)
      const bottomY = H - padY
      const displayPseudo = pseudo?.trim() || t('share.anonymous', 'Anonyme')
      const playedBy = t('share.played_by', 'joué par')
      ctx.save()
      ctx.font = '13px "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.globalAlpha = 0.45
      ctx.fillStyle = '#ffffff'
      const prefixW = ctx.measureText(`${playedBy} `).width
      ctx.fillText(`${playedBy} `, padX, bottomY)
      ctx.globalAlpha = 1
      ctx.font = '600 13px "Segoe UI", sans-serif'
      ctx.fillText(displayPseudo, padX + prefixW, bottomY)
      ctx.restore()

      // CTA (bottom-right)
      const canYouBeat = t('share.can_you_beat', 'peux-tu faire mieux ?')
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#ffffff'
      ctx.font = 'italic 12px "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(canYouBeat, W - padX, bottomY)
      ctx.restore()

      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      }, 'image/png')
    } catch (err) {
      reject(err)
    }
  })
}

export async function exportShareCard(data) {
  const blob = await generateShareCard(data)
  const file = new File([blob], 'geogame-score.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'GeoGame' })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'geogame-score.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 150)
  }
}

const SITE_URL = 'https://geo-game-delta.vercel.app'

export function generateShareText({ score, gameType, difficulty, pseudo, scoreLabel = 'POINTS', details, challengeUrl, siteUrl }) {
  const label = getGameLabel(gameType)
  const displayPseudo = pseudo?.trim() || t('share.anonymous', 'Anonyme')
  const playedBy = t('share.played_by', 'joué par')
  const canYouBeat = t('share.can_you_beat', 'Peux-tu faire mieux ?')
  const translatedDiff = translateDifficulty(difficulty)
  // Full address with the protocol, otherwise messaging apps don't make the link clickable.
  const site = siteUrl ?? (typeof window !== 'undefined' && /^https?:/.test(window.location?.origin ?? '') ? window.location.origin : SITE_URL)

  const lines = [
    `🌍 GeoGame — ${label}`,
    `🏆 ${Math.round(score ?? 0)} ${scoreLabel} | ${translatedDiff ?? ''}`.trimEnd().replace(/\|$/, '').trim(),
  ]
  if (details) lines.push(`📊 ${details}`)
  lines.push(`${playedBy} ${displayPseudo}`)
  lines.push('')
  if (challengeUrl) {
    lines.push(`${t('challenge.share_cta', '🎯 Je te défie ! Bats mon score :')} ${challengeUrl}`)
  } else {
    lines.push(`${canYouBeat} ${site}`)
  }

  return lines.join('\n')
}

export async function copyShareText(data) {
  await copyText(generateShareText(data))
}

// Défi : feuille de partage native sur mobile, presse-papier ailleurs.
// Retourne 'shared' | 'copied' | 'cancelled'.
export async function shareChallenge(data) {
  const text = generateShareText(data)
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  if (isTouch && navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  await copyText(text)
  return 'copied'
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fallback for environments without clipboard API
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
