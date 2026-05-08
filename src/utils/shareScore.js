export const GAME_LABELS = {
  PLACEMENT: 'Placement',
  FLAGS: 'Jeu des Drapeaux',
  CAPITALS: 'Capitales',
  BORDER_GUESS: 'BorderGuess',
  COUNTRY_CLUE: 'Country Clue',
  RANKING: 'Ranking',
  VOYAGE_VOYAGE: 'Voyage Voyage',
}

export function generateShareCard({ score, gameType, difficulty, pseudo, scoreLabel = 'POINTS' }) {
  return new Promise((resolve, reject) => {
    try {
      const W = 1200, H = 630
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')

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
        ctx.roundRect(bX, bY, bW, 28, 14)
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
      const label = GAME_LABELS[gameType] ?? gameType
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
      const displayPseudo = pseudo?.trim() || 'Anonyme'
      ctx.save()
      ctx.font = '13px "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.globalAlpha = 0.45
      ctx.fillStyle = '#ffffff'
      const prefixW = ctx.measureText('joué par ').width
      ctx.fillText('joué par ', padX, bottomY)
      ctx.globalAlpha = 1
      ctx.font = '600 13px "Segoe UI", sans-serif'
      ctx.fillText(displayPseudo, padX + prefixW, bottomY)
      ctx.restore()

      // CTA (bottom-right)
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#ffffff'
      ctx.font = 'italic 12px "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('peux-tu faire mieux ?', W - padX, bottomY)
      ctx.restore()

      canvas.toBlob(resolve, 'image/png')
    } catch (err) {
      reject(err)
    }
  })
}

export async function exportShareCard(data) {
  const blob = await generateShareCard(data)
  const file = new File([blob], 'geogame-score.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Mon score GeoGame' })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'geogame-score.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
