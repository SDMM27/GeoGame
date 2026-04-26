// src/components/multiplayer/chill/ChillReview.jsx

/**
 * Revue de fin de manche.
 * Affiche d'abord tous les bons résultats, puis les mauvais un par un.
 *
 * @param {{
 *   mancheCountries: Array<string|object>,  // pays de la manche (string pour placement, feature pour les autres)
 *   mancheStartIndex: number,
 *   playerAnswers: object,                   // chillState.playerAnswers
 *   reviewStep: number,                      // chillState.reviewStep
 *   isHost: boolean,
 *   players: object,                         // room.players { [playerId]: { pseudo } }
 *   gameType: string,
 *   onNext: () => void,                      // host avance d'un pas
 *   onContinue: () => void,                  // host termine la review
 * }} props
 */
export default function ChillReview({
  mancheCountries,
  mancheStartIndex,
  playerAnswers,
  reviewStep,
  isHost,
  players,
  gameType,
  onNext,
  onContinue,
}) {
  // Construire la liste de toutes les mauvaises réponses de la manche
  const wrongAnswers = mancheCountries.flatMap((country, i) => {
    const idx = mancheStartIndex + i
    const countryName = typeof country === 'string' ? country : country.properties?.ADMIN
    return Object.entries(players)
      .filter(([pid]) => {
        const ans = playerAnswers?.[pid]?.[String(idx)]
        return ans !== undefined && ans !== null && !ans.correct
      })
      .map(([pid]) => ({
        pid,
        pseudo: players[pid].pseudo,
        country,
        countryName,
        answer: playerAnswers[pid][String(idx)],
      }))
  })

  // Construire la synthèse des bons résultats (step 0)
  const correctSummary = Object.entries(players).map(([pid, p]) => {
    const correctCount = mancheCountries.filter((_, i) => {
      const idx = mancheStartIndex + i
      return playerAnswers?.[pid]?.[String(idx)]?.correct === true
    }).length
    return { pid, pseudo: p.pseudo, correctCount, total: mancheCountries.length }
  }).sort((a, b) => b.correctCount - a.correctCount)

  const isAllDone = reviewStep > wrongAnswers.length

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color: '#f1f5f9', marginBottom: 16 }}>
        📋 Revue de manche — {mancheCountries.length} pays
      </h2>

      {reviewStep === 0 && (
        <div>
          <h3 style={{ color: '#22c55e', marginBottom: 12 }}>✓ Résultats</h3>
          {correctSummary.map(({ pid, pseudo, correctCount, total }) => (
            <div key={pid} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 14px', borderRadius: 8, marginBottom: 6,
              background: correctCount === total ? '#166534' : '#1e293b',
            }}>
              <span style={{ color: '#f1f5f9' }}>{pseudo}</span>
              <span style={{ color: correctCount === total ? '#86efac' : '#94a3b8' }}>
                {correctCount} / {total}
              </span>
            </div>
          ))}
          {wrongAnswers.length > 0 && isHost && (
            <button onClick={onNext} style={btnStyle('#1d4ed8')}>
              Voir les erreurs »
            </button>
          )}
          {wrongAnswers.length === 0 && isHost && (
            <button onClick={onContinue} style={btnStyle('#166534')}>
              Continuer →
            </button>
          )}
          {!isHost && (
            <p style={{ color: '#64748b', marginTop: 12 }}>En attente de l'hôte…</p>
          )}
        </div>
      )}

      {reviewStep >= 1 && !isAllDone && (() => {
        const current = wrongAnswers[reviewStep - 1]
        if (!current) return null
        const correctName = typeof current.country === 'string'
          ? current.country
          : gameType === 'CAPITALS'
            ? (current.country.properties?.capital ?? current.country.properties?.ADMIN)
            : current.country.properties?.ADMIN
        const guessesArr = current.answer.guesses
        const givenAnswer = current.answer.answer ?? current.answer.clickedAdmin ?? null

        return (
          <div>
            <h3 style={{ color: '#ef4444', marginBottom: 12 }}>
              ✗ Erreur {reviewStep} / {wrongAnswers.length}
            </h3>
            <div style={{
              background: '#1e293b', borderRadius: 10, padding: '16px 20px', marginBottom: 16,
            }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>Joueur</span>
                <div style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{current.pseudo}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>Réponse donnée</span>
                {guessesArr?.length > 0
                  ? <>
                      <div style={{ color: '#94a3b8', fontSize: '0.85em', marginTop: 2 }}>
                        {guessesArr.length} tentative{guessesArr.length > 1 ? 's' : ''}
                      </div>
                      <div style={{ color: '#fca5a5' }}>{guessesArr.join(' → ')}</div>
                    </>
                  : <div style={{ color: '#fca5a5' }}>{givenAnswer || '(rien)'}</div>
                }
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>Réponse correcte</span>
                <div style={{ color: '#86efac', fontWeight: 'bold' }}>{correctName}</div>
              </div>
            </div>
            {isHost && reviewStep < wrongAnswers.length && (
              <button onClick={onNext} style={btnStyle('#1d4ed8')}>
                Suivant »
              </button>
            )}
            {isHost && reviewStep === wrongAnswers.length && (
              <button onClick={onContinue} style={btnStyle('#166534')}>
                Continuer →
              </button>
            )}
            {!isHost && (
              <p style={{ color: '#64748b' }}>En attente de l'hôte…</p>
            )}
          </div>
        )
      })()}

      {isAllDone && isHost && (
        <button onClick={onContinue} style={btnStyle('#166534')}>
          Continuer →
        </button>
      )}
      {isAllDone && !isHost && (
        <p style={{ color: '#64748b', marginTop: 12 }}>En attente de l'hôte…</p>
      )}
    </div>
  )
}

function btnStyle(bg) {
  return {
    marginTop: 16, padding: '10px 24px', borderRadius: 8,
    background: bg, color: 'white', border: 'none',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '1em',
  }
}
