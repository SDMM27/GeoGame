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

const SCORE_TABLE = {
  Facile: [3, 2, 1],
  Moyen: [5, 3, 2],
  Difficile: [7, 5, 3],
  Impossible: [9, 7, 5],
}

function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return [difficulty]
}

export function getTotalCountries(difficulty) {
  const available = getAvailableDifficulties(difficulty)
  return countries.features.filter(c =>
    available.includes(c.properties.Difficulty)
  ).length
}

let alreadyChosenCountries = []

export default function useGameState(difficulty, isTraining, overrideCountries = null) {
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
  const startTimeRef = useRef(null)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const gameOverToastShownRef = useRef(false)
  const foundCountriesRef = useRef(new Set())
  const shownCountriesRef = useRef(new Set())

  // Redirect if no difficulty
  useEffect(() => {
    if (!difficulty && !overrideCountries) navigate('/')
  }, [difficulty, overrideCountries, navigate])

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

  const orderedIndexRef = useRef(0)

  // Start game on mount
  useEffect(() => {
    if (!difficulty && !overrideCountries) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries ? overrideCountries.length : getTotalCountries(difficulty)
    setStats({ found: 0, skipped: 0, total })
    const firstCountry = overrideCountries
      ? overrideCountries[orderedIndexRef.current++]
      : getRandomCountry(difficulty)
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

  // 3 consecutive errors: highlight country
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
        shownCountriesRef.current.add(targetCountryRef.current)
        const center = layer.getBounds().getCenter()
        zoomCountryMap(center.lat, center.lng)
      }
    }
  }, [consecutiveErrors, zoomCountryMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer counts UP; stops when all processed
  const allProcessed = stats.total > 0 && (stats.found + stats.skipped >= stats.total)

  useEffect(() => {
    if (!gameStarted || allProcessed) {
      // Si le jeu s'arrête, on s'assure que timerRef a la valeur exacte finale
      if (allProcessed && startTimeRef.current) {
        timerRef.current = performance.now() - startTimeRef.current;
      }
      return;
    }

    // On fixe le point de départ
    startTimeRef.current = performance.now() - (timerRef.current || 0);

    const id = setInterval(() => {
      const currentTime = performance.now() - startTimeRef.current;
      setTimer(currentTime);
      timerRef.current = currentTime; // La vérité est ici (en ms avec décimales)
    }, 100); // 100ms suffit pour l'affichage, le calcul reste précis à la ms près

    return () => clearInterval(id);
  }, [gameStarted, allProcessed]);

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

  const incrementScore = (diff, errorCount = 0) => {
    const row = SCORE_TABLE[diff]
    if (!row) return
    const gain = row[Math.min(errorCount, 2)]
    setScore(prev => prev + gain)
  }

  const changeCountry = useCallback(() => {
    const next = overrideCountries
      ? (overrideCountries[orderedIndexRef.current++] ?? null)
      : getRandomCountry(difficulty)
    if (next) {
      alreadyChosenCountries.push(next)
      setTargetCountry(next)
    }
  }, [difficulty, getRandomCountry, overrideCountries])

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
        incrementScore(targetDiff, consecutiveErrorsRef.current)
      }
      event.target.setStyle({ fillColor: '#4ade80', weight: 2, fillOpacity: 0.5 })
      shownCountriesRef.current.delete(clickedName)
      foundCountriesRef.current.add(clickedName)
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
    shownCountriesRef.current.add(targetCountryRef.current)
    const center = layer.getBounds().getCenter()
    zoomCountryMap(center.lat, center.lng)
  }

  const restartGame = () => {
    setGameStarted(false);
    gameStartedRef.current = false;

    alreadyChosenCountries = []
    setScore(0)
    setConsecutiveErrors(0)
    setClickOnSeeCountry(false)

    clickOnSeeCountryRef.current = false
    gameOverToastShownRef.current = false
    foundCountriesRef.current.clear()
    shownCountriesRef.current.clear()
    if (geoJsonRef.current) {
      geoJsonRef.current.getLayers().forEach(l => l.setStyle(COUNTRY_STYLE))
    }
    startTimeRef.current = null;
    timerRef.current = 0;
    setTimer(0);
    setTimeout(() => {
      const total = getTotalCountries(difficulty);
      setStats({ found: 0, skipped: 0, total });
      const next = getRandomCountry(difficulty);
      if (next) {
        alreadyChosenCountries.push(next);
        setTargetCountry(next);
        setGameStarted(true);
        gameStartedRef.current = true;
      }
    }, 0);
  }

  const goHome = () => {
    alreadyChosenCountries = []
    foundCountriesRef.current.clear()
    shownCountriesRef.current.clear()
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
