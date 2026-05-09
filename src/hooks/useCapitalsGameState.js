// src/hooks/useCapitalsGameState.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import { checkAnswer } from '../utils/normalizeAnswer'
import { saveSnapshot } from '../utils/multiplayerSnapshot'
import { getCountryName, getAllCapitalNames } from '../utils/getCountryName'

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
    available.includes(c.properties.DifficultyCapitals) &&
    c.properties.ISO_A2 &&
    c.properties.capital
  ).length
}

export function getTotalCapitalCountriesByContinent(continent) {
  return countries.features.filter(c =>
    c.properties.continent === continent &&
    c.properties.ISO_A2 &&
    c.properties.capital
  ).length
}

let alreadyChosenCountries = []

export default function useCapitalsGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null, continent = null) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(mpSnapshot?.score ?? 0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const [inputValue, setInputValue] = useState('')
  const [revealedName, setRevealedName] = useState(null)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const [timer, setTimer] = useState(mpSnapshot?.elapsedMs ?? 0)
  const timerRef = useRef(mpSnapshot?.elapsedMs ?? 0)
  const startTimeRef = useRef(null)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const gameOverToastShownRef = useRef(false)

  // Refs for snapshot saves (always current, avoids stale closures in intervals)
  const statsForSnapRef = useRef({ found: 0, skipped: 0, total: 0, totalErrors: 0 })
  const scoreForSnapRef = useRef(mpSnapshot?.score ?? 0)

  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) navigate('/')
  }, [difficulty, overrideCountries, continent, navigate])

  const getRandomCountry = useCallback((diff, cont) => {
    const filtered = cont
      ? countries.features.filter(c =>
          c.properties.continent === cont &&
          c.properties.ISO_A2 &&
          c.properties.capital &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
      : countries.features.filter(c =>
          getAvailableDifficulties(diff).includes(c.properties.DifficultyCapitals) &&
          c.properties.ISO_A2 &&
          c.properties.capital &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)]
  }, [])

  const orderedIndexRef = useRef(0)

  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries
      ? overrideCountries.length
      : continent
        ? getTotalCapitalCountriesByContinent(continent)
        : getTotalCapitalCountries(difficulty)

    if (mpSnapshot && overrideCountries && mpSnapshot.countryIndex > 0) {
      // Restore state — player refreshed mid-game
      const idx = mpSnapshot.countryIndex
      orderedIndexRef.current = idx
      for (let i = 0; i < idx; i++) alreadyChosenCountries.push(overrideCountries[i].properties.ADMIN)
      const restoredStats = {
        found: mpSnapshot.found,
        skipped: mpSnapshot.skipped,
        total,
        totalErrors: mpSnapshot.totalErrors ?? 0,
        foundFirstTry: mpSnapshot.foundFirstTry ?? 0,
      }
      setStats(restoredStats)
      statsForSnapRef.current = restoredStats
      scoreForSnapRef.current = mpSnapshot.score ?? 0
      setConsecutiveErrors(mpSnapshot.consecutiveErrors ?? 0)
      consecutiveErrorsRef.current = mpSnapshot.consecutiveErrors ?? 0
      const currentCountry = overrideCountries[idx - 1] ?? null
      if (currentCountry) {
        setTargetCountry(currentCountry)
        gameStartedRef.current = true
        setGameStarted(true)
      }
      return
    }

    setStats({ found: 0, skipped: 0, total, totalErrors: 0 })
    const first = overrideCountries
      ? overrideCountries[orderedIndexRef.current++]
      : getRandomCountry(difficulty, continent)
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
      toast.success(t('toasts.all_capitals_found'), {
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
    const next = overrideCountries
      ? (overrideCountries[orderedIndexRef.current++] ?? null)
      : getRandomCountry(difficulty, continent)
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
  }, [difficulty, continent, getRandomCountry, overrideCountries])

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
    // revealedName is read from state (render closure) as a gate — correct here.
    // consecutiveErrors is read from ref because it may be incremented in the same call.
    if (!gameStartedRef.current || !targetCountryRef.current || revealedName) return
    const props = targetCountryRef.current.properties
    const iso = targetCountryRef.current?.properties?.ISO_A2
    const capital = props.capital
    const capitalAliases = props.capitalAliases ?? []
    const extraCapitals = getAllCapitalNames(iso, capital, capitalAliases)
    const isCorrect = checkAnswer(inputValue, capital, capitalAliases, extraCapitals)

    if (isCorrect) {
      const wasSkipped = clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success(t('toasts.found_country', { name: getCountryName(iso, i18n.language) || props.ADMIN }), { containerId: 'topRightToast' })
        incrementScore(props.DifficultyCapitals, consecutiveErrorsRef.current)
      }
      setStats(prev =>
        wasSkipped
          ? { ...prev, skipped: prev.skipped + 1 }
          : consecutiveErrorsRef.current === 0
            ? { ...prev, found: prev.found + 1, foundFirstTry: (prev.foundFirstTry ?? 0) + 1 }
            : { ...prev, found: prev.found + 1 }
      )
      changeCountry()
    } else {
      const newErrors = consecutiveErrorsRef.current + 1
      setConsecutiveErrors(newErrors)
      consecutiveErrorsRef.current = newErrors
      setStats(prev => ({ ...prev, totalErrors: (prev.totalErrors ?? 0) + 1 }))
      if (newErrors >= 3) {
        toast.error(t('toasts.wrong'), { containerId: 'topRightToast' })
        setRevealedName(props.capital)
      } else {
        toast.error(t('toasts.wrong'), { containerId: 'topRightToast' })
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

  // Keep snapshot refs in sync
  useEffect(() => { statsForSnapRef.current = stats }, [stats])
  useEffect(() => { scoreForSnapRef.current = score }, [score])

  // Save state immediately on action (country found/skipped/error)
  useEffect(() => {
    if (!mpSnapshotKey || !gameStarted || allProcessed) return
    saveSnapshot(mpSnapshotKey, {
      savedAt: Date.now(),
      elapsedMs: timerRef.current,
      countryIndex: orderedIndexRef.current,
      found: stats.found,
      skipped: stats.skipped,
      totalErrors: stats.totalErrors ?? 0,
      foundFirstTry: stats.foundFirstTry ?? 0,
      score,
      consecutiveErrors,
    })
  }, [stats, score, consecutiveErrors]) // eslint-disable-line react-hooks/exhaustive-deps

  // Also save timer every 5s so elapsed time stays accurate
  useEffect(() => {
    if (!mpSnapshotKey || !gameStarted || allProcessed) return
    const id = setInterval(() => {
      saveSnapshot(mpSnapshotKey, {
        savedAt: Date.now(),
        elapsedMs: timerRef.current,
        countryIndex: orderedIndexRef.current,
        found: statsForSnapRef.current.found,
        skipped: statsForSnapRef.current.skipped,
        totalErrors: statsForSnapRef.current.totalErrors ?? 0,
        foundFirstTry: statsForSnapRef.current.foundFirstTry ?? 0,
        score: scoreForSnapRef.current,
        consecutiveErrors: consecutiveErrorsRef.current,
      })
    }, 5000)
    return () => clearInterval(id)
  }, [gameStarted, allProcessed, mpSnapshotKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const total = continent
        ? getTotalCapitalCountriesByContinent(continent)
        : getTotalCapitalCountries(difficulty)
      setStats({ found: 0, skipped: 0, total, totalErrors: 0 })
      const next = getRandomCountry(difficulty, continent)
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
    targetCountryISO: targetCountry?.properties?.ISO_A2 ?? null,
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
