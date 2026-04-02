// src/hooks/useCapitalsGameState.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import { checkAnswer } from '../utils/normalizeAnswer'

const SCORE_TABLE = {
  Facile:     [3, 2, 1],
  Moyen:      [5, 3, 2],
  Difficile:  [7, 5, 3],
  Impossible: [9, 7, 5],
}

function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return [difficulty]
}

export function getTotalCapitalCountries(difficulty) {
  const available = getAvailableDifficulties(difficulty)
  return countries.features.filter(c =>
    available.includes(c.properties.Difficulty) &&
    c.properties.ISO_A2 &&
    c.properties.capital
  ).length
}

let alreadyChosenCountries = []

export default function useCapitalsGameState(difficulty, isTraining) {
  const navigate = useNavigate()

  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const [inputValue, setInputValue] = useState('')
  const [revealedName, setRevealedName] = useState(null)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(0)
  const startTimeRef = useRef(null)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const gameOverToastShownRef = useRef(false)

  useEffect(() => {
    if (!difficulty) navigate('/')
  }, [difficulty, navigate])

  const getRandomCountry = useCallback((diff) => {
    const available = getAvailableDifficulties(diff)
    const filtered = countries.features.filter(c =>
      available.includes(c.properties.Difficulty) &&
      c.properties.ISO_A2 &&
      c.properties.capital &&
      !alreadyChosenCountries.includes(c.properties.ADMIN)
    )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)]
  }, [])

  useEffect(() => {
    if (!difficulty) return
    alreadyChosenCountries = []
    const total = getTotalCapitalCountries(difficulty)
    setStats({ found: 0, skipped: 0, total })
    const first = getRandomCountry(difficulty)
    if (first) {
      alreadyChosenCountries.push(first.properties.ADMIN)
      setTargetCountry(first)
      gameStartedRef.current = true
      setGameStarted(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { targetCountryRef.current = targetCountry }, [targetCountry])
  useEffect(() => { consecutiveErrorsRef.current = consecutiveErrors }, [consecutiveErrors])
  useEffect(() => { clickOnSeeCountryRef.current = clickOnSeeCountry }, [clickOnSeeCountry])

  const allProcessed = stats.total > 0 && (stats.found + stats.skipped >= stats.total)

  useEffect(() => {
    if (!gameStarted || allProcessed) {
      if (allProcessed && startTimeRef.current) {
        timerRef.current = performance.now() - startTimeRef.current
      }
      return
    }
    startTimeRef.current = performance.now() - (timerRef.current || 0)
    const id = setInterval(() => {
      const currentTime = performance.now() - startTimeRef.current
      setTimer(currentTime)
      timerRef.current = currentTime
    }, 100)
    return () => clearInterval(id)
  }, [gameStarted, allProcessed])

  useEffect(() => {
    if (!allProcessed || !gameStarted || gameOverToastShownRef.current) return
    gameOverToastShownRef.current = true
    if (isTraining) {
      toast.success('Bravo ! Vous avez trouvé toutes les capitales !', {
        containerId: 'centerToast',
      })
    }
  }, [allProcessed, gameStarted, isTraining])

  const incrementScore = (diff, errorCount) => {
    const row = SCORE_TABLE[diff]
    if (!row) return
    const adjustedErrors = Math.max(0, errorCount - 1)
    const gain = row[Math.min(adjustedErrors, 2)]
    setScore(prev => prev + gain)
  }

  const changeCountry = useCallback(() => {
    const next = getRandomCountry(difficulty)
    if (next) {
      alreadyChosenCountries.push(next.properties.ADMIN)
      setTargetCountry(next)
    }
    setInputValue('')
    setRevealedName(null)
    setConsecutiveErrors(0)
    consecutiveErrorsRef.current = 0
    setClickOnSeeCountry(false)
    clickOnSeeCountryRef.current = false
  }, [difficulty, getRandomCountry])

  // Auto-avance après révélation (3 erreurs ou bouton "Voir")
  useEffect(() => {
    if (!revealedName) return
    const id = setTimeout(() => {
      setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
      changeCountry()
    }, 2000)
    return () => clearTimeout(id)
  }, [revealedName, changeCountry])

  const handleSubmit = () => {
    if (!gameStartedRef.current || !targetCountryRef.current || revealedName) return
    const props = targetCountryRef.current.properties
    const isCorrect = checkAnswer(inputValue, props.capital, props.capitalAliases ?? [])

    if (isCorrect) {
      const wasSkipped = clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + props.capital + ' !', { containerId: 'topRightToast' })
        incrementScore(props.Difficulty, consecutiveErrorsRef.current)
      }
      setStats(prev =>
        wasSkipped
          ? { ...prev, skipped: prev.skipped + 1 }
          : { ...prev, found: prev.found + 1 }
      )
      changeCountry()
    } else {
      const newErrors = consecutiveErrorsRef.current + 1
      setConsecutiveErrors(newErrors)
      consecutiveErrorsRef.current = newErrors
      if (newErrors >= 3) {
        toast.error('Dommage ! La capitale est ' + props.capital, { containerId: 'topRightToast' })
        setRevealedName(props.capital)
      } else {
        toast.error('Dommage !', { containerId: 'topRightToast' })
      }
      setInputValue('')
    }
  }

  const seeCountry = () => {
    if (revealedName) return
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    setRevealedName(targetCountryRef.current?.properties?.capital ?? null)
  }

  const restartGame = () => {
    setGameStarted(false)
    gameStartedRef.current = false
    alreadyChosenCountries = []
    setScore(0)
    setConsecutiveErrors(0)
    setInputValue('')
    setRevealedName(null)
    setClickOnSeeCountry(false)
    clickOnSeeCountryRef.current = false
    gameOverToastShownRef.current = false
    startTimeRef.current = null
    timerRef.current = 0
    setTimer(0)
    setTimeout(() => {
      const total = getTotalCapitalCountries(difficulty)
      setStats({ found: 0, skipped: 0, total })
      const next = getRandomCountry(difficulty)
      if (next) {
        alreadyChosenCountries.push(next.properties.ADMIN)
        setTargetCountry(next)
        setGameStarted(true)
        gameStartedRef.current = true
      }
    }, 0)
  }

  const goHome = () => {
    alreadyChosenCountries = []
    navigate('/')
  }

  const isGameOver = allProcessed && !isTraining
  const displayTimer = isTraining ? '∞' : formatTime(timer)

  return {
    targetCountry,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    inputValue,
    setInputValue,
    handleSubmit,
    revealedName,
    seeCountry,
    restartGame,
    goHome,
  }
}
