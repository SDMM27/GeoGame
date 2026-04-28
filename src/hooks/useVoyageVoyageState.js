import { useState, useEffect, useRef, useCallback } from 'react'
import countries from '../data/countriesWithDifficulty_FR.json'
import { countryBorders } from '../data/countryBorders'
import {
  isNeighbor,
  selectRandomPair,
  getDailyPair,
  computeScore,
} from '../utils/voyageVoyageUtils'
import { checkAnswer } from '../utils/normalizeAnswer'

/** Finds a GeoJSON feature by its ISO A2 code */
function getFeatureByISO(iso) {
  return countries.features.find(f => f.properties.ISO_A2 === iso) ?? null
}

/** Finds a GeoJSON feature matching user text input (name or alias) */
function findFeatureByInput(input) {
  return countries.features.find(f =>
    checkAnswer(input, f.properties.ADMIN, f.properties.aliases)
  ) ?? null
}

export default function useVoyageVoyageState(mode = 'infinite') {
  const [startCountry, setStartCountry] = useState(null)
  const [targetCountry, setTargetCountry] = useState(null)
  const [validatedChain, setValidatedChain] = useState([])
  const [wrongGuesses, setWrongGuesses] = useState([])
  const [optimalLength, setOptimalLength] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [gameKey, setGameKey] = useState(0)
  const intervalRef = useRef(null)

  const initGame = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const { startISO, targetISO, optimalLength: ol } =
      mode === 'daily'
        ? getDailyPair(countryBorders, dateStr)
        : selectRandomPair(countryBorders)

    const start = getFeatureByISO(startISO)
    const target = getFeatureByISO(targetISO)
    if (!start || !target) return

    setStartCountry(start)
    setTargetCountry(target)
    setValidatedChain([start])
    setWrongGuesses([])
    setOptimalLength(ol)
    setIsGameOver(false)
    setScore(null)
    setElapsedTime(0)
    setGameKey(k => k + 1)
  }, [mode])

  // Initialize on mount and when mode changes
  useEffect(() => { initGame() }, [initGame])

  // Timer — stops when game is over
  useEffect(() => {
    clearInterval(intervalRef.current)
    if (isGameOver) return
    intervalRef.current = setInterval(() => {
      setElapsedTime(t => t + 100)
    }, 100)
    return () => clearInterval(intervalRef.current)
  }, [isGameOver, gameKey])

  const submitGuess = useCallback((input) => {
    if (isGameOver || !input.trim()) return

    const feature = findFeatureByInput(input)
    if (!feature) return // unknown country — silently ignore

    const guessISO = feature.properties.ISO_A2
    const lastISO = validatedChain[validatedChain.length - 1].properties.ISO_A2

    if (!isNeighbor(lastISO, guessISO, countryBorders)) {
      // Wrong guess — show in red
      setWrongGuesses(prev => [...prev, feature])
      return
    }

    // Valid neighbor — add to chain
    const newChain = [...validatedChain, feature]
    setValidatedChain(newChain)

    if (guessISO === targetCountry.properties.ISO_A2) {
      // Reached the destination!
      const stepsUsed = newChain.length - 1
      setScore(computeScore(optimalLength, stepsUsed, wrongGuesses.length))
      setIsGameOver(true)
    }
  }, [isGameOver, validatedChain, targetCountry, wrongGuesses, optimalLength])

  return {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    optimalLength,
    isGameOver,
    score,
    elapsedTime,
    submitGuess,
    resetGame: initGame,
  }
}
