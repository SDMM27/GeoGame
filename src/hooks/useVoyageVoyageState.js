import { useState, useEffect, useRef, useCallback } from 'react'
import countries from '../data/countriesWithDifficulty_FR.json'
import { countryBorders } from '../data/countryBorders'
import {
  selectRandomPair,
  getDailyPair,
  computeScore,
  bfsDistances,
  isPathComplete,
  findShortestPath,
} from '../utils/voyageVoyageUtils'
import { checkAnswer } from '../utils/normalizeAnswer'
import { getDailyKey } from '../utils/dailyKey'

function getFeatureByISO(iso) {
  return countries.features.find(f => f.properties.ISO_A2 === iso) ?? null
}

function findFeatureByInput(input) {
  return countries.features.find(f =>
    f.properties.ISO_A2 &&
    checkAnswer(input, f.properties.ADMIN, f.properties.aliases)
  ) ?? null
}

function isNeighborOfChain(iso, chain, borders) {
  return chain.some(f => (borders[f.properties.ISO_A2] ?? []).includes(iso))
}

function dailyKey(dateStr) {
  return `vv_daily_${dateStr}`
}

export default function useVoyageVoyageState(mode = 'infinite') {
  const [startCountry, setStartCountry] = useState(null)
  const [targetCountry, setTargetCountry] = useState(null)
  const [guessHistory, setGuessHistory] = useState([])
  const [optimalLength, setOptimalLength] = useState(0)
  const [optimalPath, setOptimalPath] = useState([])
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [hintsUsed, setHintsUsed] = useState([]) // 'next' | 'all' | 'initials'
  const [nextHintISO, setNextHintISO] = useState(null)

  const distFromStartRef = useRef({})
  const distToTargetRef = useRef({})
  const optimalRef = useRef(0)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const unguessedOptimalPathRef = useRef([])

  function computeColor(iso, chain) {
    const d1 = distFromStartRef.current[iso] ?? Infinity
    const d2 = distToTargetRef.current[iso] ?? Infinity
    if (d1 + d2 === optimalRef.current) return 'green'
    if (!isNeighborOfChain(iso, chain, countryBorders)) return 'red'
    return 'yellow'
  }

  const setupGame = useCallback((startISO, targetISO, ol) => {
    const start = getFeatureByISO(startISO)
    const target = getFeatureByISO(targetISO)
    if (!start || !target) return false

    distFromStartRef.current = bfsDistances(startISO, countryBorders)
    distToTargetRef.current = bfsDistances(targetISO, countryBorders)
    optimalRef.current = ol

    const path = findShortestPath(startISO, targetISO, countryBorders) ?? []
    setOptimalPath(path.map(getFeatureByISO).filter(Boolean))

    setStartCountry(start)
    setTargetCountry(target)
    setOptimalLength(ol)
    return true
  }, [])

  const initGame = useCallback(() => {
    const dateStr = getDailyKey()

    if (mode === 'daily') {
      const saved = localStorage.getItem(dailyKey(dateStr))
      if (saved) {
        try {
          const { startISO, targetISO, ol, historyData, isOver, savedScore } = JSON.parse(saved)
          if (!setupGame(startISO, targetISO, ol)) throw new Error()

          const history = historyData
            .map(({ iso, color }) => {
              const feature = getFeatureByISO(iso)
              return feature ? { feature, color } : null
            })
            .filter(Boolean)

          setGuessHistory(history)
          setIsGameOver(isOver)
          setScore(savedScore)
          return
        } catch {
          // données corrompues → partie fraîche
        }
      }
    }

    const { startISO, targetISO, optimalLength: ol } =
      mode === 'daily'
        ? getDailyPair(countryBorders, dateStr)
        : selectRandomPair(countryBorders)

    if (!setupGame(startISO, targetISO, ol)) return

    const start = getFeatureByISO(startISO)
    const initialHistory = [{ feature: start, color: 'start' }]
    setGuessHistory(initialHistory)
    setIsGameOver(false)
    setScore(null)
    setHintsUsed([])
    setNextHintISO(null)

    if (mode === 'daily') {
      localStorage.setItem(dailyKey(dateStr), JSON.stringify({
        startISO,
        targetISO,
        ol,
        historyData: [{ iso: startISO, color: 'start' }],
        isOver: false,
        savedScore: null,
      }))
    }
  }, [mode, setupGame])

  useEffect(() => { initGame() }, [initGame])

  const resetGame = useCallback(() => {
    const { startISO, targetISO, optimalLength: ol } = selectRandomPair(countryBorders)
    if (!setupGame(startISO, targetISO, ol)) return
    const start = getFeatureByISO(startISO)
    setGuessHistory([{ feature: start, color: 'start' }])
    setIsGameOver(false)
    setScore(null)
    setHintsUsed([])
    setNextHintISO(null)
  }, [setupGame])

  // Sauvegarde de la progression en mode journalier
  useEffect(() => {
    if (modeRef.current !== 'daily' || !startCountry || !targetCountry || guessHistory.length === 0) return
    const dateStr = getDailyKey()
    const key = dailyKey(dateStr)
    const existing = localStorage.getItem(key)
    if (!existing) return

    const base = JSON.parse(existing)
    localStorage.setItem(key, JSON.stringify({
      ...base,
      historyData: guessHistory.map(g => ({
        iso: g.feature.properties.ISO_A2,
        color: g.color,
      })),
      isOver: isGameOver,
      savedScore: score,
    }))
  }, [guessHistory, isGameOver, score, startCountry, targetCountry])

  const submitGuess = useCallback((input) => {
    if (isGameOver || !input.trim()) return

    const feature = findFeatureByInput(input)
    if (!feature) return

    const guessISO = feature.properties.ISO_A2

    setGuessHistory(prev => {
      if (prev.some(g => g.feature.properties.ISO_A2 === guessISO)) return prev

      const chain = prev.filter(g => g.color !== 'red').map(g => g.feature)
      const color = computeColor(guessISO, chain)

      const newEntry = { feature, color }

      let validChain = [...prev.filter(g => g.color !== 'red'), ...(color !== 'red' ? [newEntry] : [])]
      let reds = [...prev.filter(g => g.color === 'red'), ...(color === 'red' ? [newEntry] : [])]

      // Cascade : erreurs qui deviennent voisines → yellow, ajoutées en fin de chaîne
      if (color !== 'red') {
        let changed = true
        while (changed) {
          changed = false
          const chainFeatures = validChain.map(g => g.feature)
          const promoted = reds.filter(g => {
            const iso = g.feature.properties.ISO_A2
            const d1 = distFromStartRef.current[iso] ?? Infinity
            const d2 = distToTargetRef.current[iso] ?? Infinity
            return d1 + d2 !== optimalRef.current &&
              isNeighborOfChain(iso, chainFeatures, countryBorders)
          })
          if (promoted.length > 0) {
            changed = true
            reds = reds.filter(g => !promoted.includes(g))
            validChain = [...validChain, ...promoted.map(g => ({ ...g, color: 'yellow' }))]
          }
        }
      }

      return [...validChain, ...reds]
    })
  }, [isGameOver])

  // Victoire : chemin connecté de départ à arrivée (la cible est ajoutée virtuellement)
  useEffect(() => {
    if (isGameOver || !startCountry || !targetCountry || guessHistory.length === 0) return
    const startISO = startCountry.properties.ISO_A2
    const targetISO = targetCountry.properties.ISO_A2
    const chainISOs = guessHistory.filter(g => g.color !== 'red').map(g => g.feature.properties.ISO_A2)

    // Inclure la cible virtuellement pour ne pas forcer l'utilisateur à la saisir
    const virtualChain = chainISOs.includes(targetISO) ? chainISOs : [...chainISOs, targetISO]

    if (isPathComplete(virtualChain, startISO, targetISO, countryBorders)) {
      const stepsUsed = virtualChain.length - 1
      const wrongCount = guessHistory.filter(g => g.color === 'red').length

      // Ajouter la cible à la chaîne affichée si pas encore dedans
      if (!chainISOs.includes(targetISO)) {
        setGuessHistory(prev => {
          const nonRed = prev.filter(g => g.color !== 'red')
          const reds = prev.filter(g => g.color === 'red')
          return [...nonRed, { feature: targetCountry, color: 'green' }, ...reds]
        })
      }

      setScore(computeScore(optimalLength, stepsUsed, wrongCount))
      setIsGameOver(true)
    }
  }, [guessHistory, isGameOver, startCountry, targetCountry, optimalLength])

  const useHint = useCallback((type) => {
    setHintsUsed(prev => prev.includes(type) ? prev : [...prev, type])
    if (type === 'next') {
      setNextHintISO(unguessedOptimalPathRef.current[0]?.properties.ISO_A2 ?? null)
    }
  }, [])

  // Chaîne triée pour l'affichage : verts/start par distanceDépart, jaunes après
  const chainHistory = [
    ...guessHistory
      .filter(g => g.color === 'start' || g.color === 'green')
      .sort((a, b) => {
        const dA = distFromStartRef.current[a.feature.properties.ISO_A2] ?? Infinity
        const dB = distFromStartRef.current[b.feature.properties.ISO_A2] ?? Infinity
        return dA - dB
      }),
    ...guessHistory.filter(g => g.color === 'yellow'),
  ]

  const validatedChain = chainHistory.map(g => g.feature)
  const wrongGuesses = guessHistory.filter(g => g.color === 'red').map(g => g.feature)

  // Pays du chemin optimal pas encore devinés
  const guessedISOs = new Set(validatedChain.map(f => f.properties.ISO_A2))
  const unguessedOptimalPath = optimalPath.filter(f => !guessedISOs.has(f.properties.ISO_A2))
  unguessedOptimalPathRef.current = unguessedOptimalPath

  // ISOs révélés comme outlines selon les indices utilisés
  const revealedISOs = new Set()
  if (hintsUsed.includes('next') && nextHintISO && !guessedISOs.has(nextHintISO)) {
    revealedISOs.add(nextHintISO)
  }
  if (hintsUsed.includes('all')) {
    unguessedOptimalPath.forEach(f => revealedISOs.add(f.properties.ISO_A2))
  }

  return {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    guessHistory,
    chainHistory,
    optimalLength,
    optimalPath,
    unguessedOptimalPath,
    isGameOver,
    score,
    hintsUsed,
    revealedISOs,
    showInitials: hintsUsed.includes('initials'),
    useHint,
    submitGuess,
    resetGame,
    dailyKey: getDailyKey(),
  }
}
