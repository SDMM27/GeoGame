import { useEffect, useRef } from 'react'

// Reports a multiplayer placement game to its room: each new country found, then the final result.
// `initialFound`: countries already found when the game was restored from a snapshot.
export default function useRoomReporting(state, initialFound, onCountryFound, onGameFinished) {
  const prevFoundRef = useRef(initialFound)
  const totalErrorsRef = useRef(0)
  const scoreRef = useRef(0)
  totalErrorsRef.current = state.stats.totalErrors ?? 0
  scoreRef.current = state.score

  useEffect(() => {
    if (state.stats.found > prevFoundRef.current) {
      onCountryFound()
      prevFoundRef.current = state.stats.found
    }
  }, [state.stats.found, onCountryFound])

  useEffect(() => {
    if (!state.isGameOver) return
    const perfects = state.stats.foundFirstTry ?? 0
    onGameFinished({
      attempts: totalErrorsRef.current,
      elapsedTime: state.timer,
      countriesSolved: state.stats.found,
      weightedScore: scoreRef.current,
      perfects,
      stumbles: state.stats.found - perfects,
      failures: state.stats.skipped,
    })
  }, [state.isGameOver, onGameFinished, state.stats.found, state.stats.skipped, state.timer])
}
