// src/hooks/useGameState.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']

const COUNTRY_STYLE = {
  fillColor: 'transparent',
  color: '#334155',
  fillOpacity: 1,
  weight: 0.85,
}

function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Impossible']
  return DIFFICULTIES.slice(0, DIFFICULTIES.indexOf(difficulty) + 1)
}

export function getTotalCountries(difficulty) {
  const available = getAvailableDifficulties(difficulty)
  return countries.features.filter(c =>
    available.includes(c.properties.Difficulty)
  ).length
}

let alreadyChosenCountries = []

export default function useGameState(difficulty, isTraining) {
  const navigate = useNavigate()

  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const geoJsonRef = useRef(null)
  const [mapRef, setMapRef] = useState(null)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(0)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const gameOverToastShownRef = useRef(false)
  const foundCountriesRef = useRef(new Set())
  const shownCountriesRef = useRef(new Set())

  // Redirect if no difficulty
  useEffect(() => {
    if (!difficulty) navigate('/')
  }, [difficulty, navigate])

  const getRandomCountry = useCallback((diff) => {
    const available = getAvailableDifficulties(diff)
    const filtered = countries.features.filter(c =>
      available.includes(c.properties.Difficulty) &&
      !alreadyChosenCountries.includes(c.properties.ADMIN)
    )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)].properties.ADMIN
  }, [])

  const zoomCountryMap = useCallback((lat, lng) => {
    if (!mapRef) return
    const targetDiff = countries.features.find(
      c => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty
    if (targetCountryRef.current === 'Vatican') {
      mapRef.setView([lat, lng], 20)
    } else if (targetDiff === 'Difficile') {
      mapRef.setView([lat, lng], 7)
    } else if (targetDiff === 'Impossible') {
      mapRef.setView([lat, lng], 9)
    } else {
      mapRef.setView([lat, lng], 4)
    }
  }, [mapRef])

  // Start game on mount
  useEffect(() => {
    if (!difficulty) return
    alreadyChosenCountries = []
    const total = getTotalCountries(difficulty)
    setStats({ found: 0, skipped: 0, total })
    const firstCountry = getRandomCountry(difficulty)
    if (firstCountry) {
      alreadyChosenCountries.push(firstCountry)
      setTargetCountry(firstCountry)
      gameStartedRef.current = true
      setGameStarted(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { targetCountryRef.current = targetCountry }, [targetCountry])
  useEffect(() => { consecutiveErrorsRef.current = consecutiveErrors }, [consecutiveErrors])
  useEffect(() => { clickOnSeeCountryRef.current = clickOnSeeCountry }, [clickOnSeeCountry])

  // 3 consecutive errors: highlight country, decrement score
  useEffect(() => {
    if (consecutiveErrors < 3) return
    toast.error('Dommage ! C\'est ici que se trouvait ' + targetCountryRef.current, {
      containerId: 'topRightToast',
    })
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(
        l => l.feature.properties.ADMIN === targetCountryRef.current
      )
      if (layer) {
        layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
        const center = layer.getBounds().getCenter()
        zoomCountryMap(center.lat, center.lng)
      }
    }
    decrementScore(
      countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
        ?.properties.Difficulty || 'Difficile'
    )
  }, [consecutiveErrors, zoomCountryMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer counts UP; stops when all processed
  const allProcessed = stats.total > 0 && (stats.found + stats.skipped >= stats.total)

  useEffect(() => {
    if (!gameStarted || allProcessed) return
    const id = setInterval(() => {
      setTimer(t => { timerRef.current = t + 1; return t + 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [gameStarted, allProcessed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toast when training mode finishes all countries
  useEffect(() => {
    if (!allProcessed || !gameStarted || gameOverToastShownRef.current) return
    gameOverToastShownRef.current = true
    if (isTraining) {
      toast.success('Bravo ! Vous avez trouvé tous les pays !', {
        containerId: 'centerToast',
      })
    }
  }, [allProcessed, gameStarted, isTraining])

  const decrementScore = (diff) => {
    const amounts = { Facile: 3, Moyen: 2, Difficile: 1, Impossible: 0.5 }
    setScore(prev => Math.max(0, prev - (amounts[diff] ?? 1)))
  }

  const incrementScore = (diff) => {
    const amounts = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 4 }
    setScore(prev => prev + (amounts[diff] ?? 1))
  }

  const changeCountry = useCallback(() => {
    const next = getRandomCountry(difficulty)
    if (next) {
      alreadyChosenCountries.push(next)
      setTargetCountry(next)
    }
  }, [difficulty, getRandomCountry])

  const onCountryMouseOver = (event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name)) return
    if (shownCountriesRef.current.has(name)) return
    layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
  }

  const onCountryMouseOut = (event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name)) return
    if (shownCountriesRef.current.has(name)) return
    layer.setStyle(COUNTRY_STYLE)
  }

  const onCountryClick = (event) => {
    if (!gameStartedRef.current) return
    const clickedName = event.target.feature.properties.ADMIN
    const targetDiff = countries.features.find(
      c => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty

    if (clickedName === targetCountryRef.current) {
      const wasSkipped =
        consecutiveErrorsRef.current >= 3 || clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + targetCountryRef.current + ' !', {
          containerId: 'topRightToast',
        })
        incrementScore(targetDiff)
      }
      event.target.setStyle({ fillColor: '#4ade80', weight: 2, fillOpacity: 0.5 })
      setStats(prev =>
        wasSkipped
          ? { ...prev, skipped: prev.skipped + 1 }
          : { ...prev, found: prev.found + 1 }
      )
      changeCountry()
      setConsecutiveErrors(0)
      setClickOnSeeCountry(false)
      clickOnSeeCountryRef.current = false
    } else {
      toast.error('Dommage !', { containerId: 'topRightToast' })
      setConsecutiveErrors(prev => prev + 1)
    }
  }

  const seeCountry = () => {
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === targetCountryRef.current
    )
    if (!layer) return
    layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    const center = layer.getBounds().getCenter()
    zoomCountryMap(center.lat, center.lng)
    decrementScore('Difficile')
  }

  const restartGame = () => {
    alreadyChosenCountries = []
    setScore(0)
    setConsecutiveErrors(0)
    setClickOnSeeCountry(false)
    clickOnSeeCountryRef.current = false
    gameOverToastShownRef.current = false
    if (geoJsonRef.current) {
      geoJsonRef.current.getLayers().forEach(l => l.setStyle(COUNTRY_STYLE))
    }
    setTimer(0)
    timerRef.current = 0
    const total = getTotalCountries(difficulty)
    setStats({ found: 0, skipped: 0, total })
    changeCountry()
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
    geoJsonRef,
    mapRef,
    setMapRef,
    onCountryClick,
    onCountryMouseOver,
    onCountryMouseOut,
    seeCountry,
    restartGame,
    goHome,
  }
}
