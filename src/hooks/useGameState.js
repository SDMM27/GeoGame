// src/hooks/useGameState.js
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import { saveSnapshot } from '../utils/multiplayerSnapshot'
import { getCountryName } from '../utils/getCountryName'
import { GAME_TYPES } from '../utils/gameTypes'
import { reportEloAnswer, flushElo } from '../utils/eloReport'
import { HARDCORE_COUNTRY_STYLE, HOVER_STYLE, MAP_COLORS } from '../utils/mapColors'
import { scoreHardcoreTap } from '../utils/hardcoreScoring'

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']

const COUNTRY_STYLE = {
  fillColor: 'transparent',
  color: MAP_COLORS.stroke,
  fillOpacity: 1,
  weight: 1,
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

export function getTotalCountriesByContinent(continent) {
  return countries.features.filter(c =>
    c.properties.continent === continent
  ).length
}

let alreadyChosenCountries = []

export default function useGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null, continent = null, gameType = GAME_TYPES.PLACEMENT) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(mpSnapshot?.score ?? 0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const geoJsonRef = useRef(null)
  const extraGeoJsonRefs = useRef([])
  const [mapRef, setMapRef] = useState(null)
  const [timer, setTimer] = useState(mpSnapshot?.elapsedMs ?? 0)
  const timerRef = useRef(mpSnapshot?.elapsedMs ?? 0)
  const startTimeRef = useRef(null)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const gameOverToastShownRef = useRef(false)
  const foundCountriesRef = useRef(new Set())
  const shownCountriesRef = useRef(new Set())
  // Room games (override list) are rated as duels, not as solo answers.
  const ratedRef = useRef(!overrideCountries)

  // Redirect if no difficulty
  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) navigate('/')
  }, [difficulty, overrideCountries, continent, navigate])

  const getRandomCountry = useCallback((diff, cont) => {
    const filtered = cont
      ? countries.features.filter(c =>
          c.properties.continent === cont &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
      : countries.features.filter(c =>
          getAvailableDifficulties(diff).includes(c.properties.Difficulty) &&
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

  // Refs for snapshot saves (always current, avoids stale closures in intervals)
  const statsForSnapRef = useRef({ found: 0, skipped: 0, total: 0, totalErrors: 0 })
  const scoreForSnapRef = useRef(mpSnapshot?.score ?? 0)

  // Start game on mount
  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries
      ? overrideCountries.length
      : continent
        ? getTotalCountriesByContinent(continent)
        : getTotalCountries(difficulty)

    if (mpSnapshot && overrideCountries && mpSnapshot.countryIndex > 0) {
      // Restore state — player refreshed mid-game
      const idx = mpSnapshot.countryIndex
      orderedIndexRef.current = idx
      for (let i = 0; i < idx; i++) alreadyChosenCountries.push(overrideCountries[i])
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
    const firstCountry = overrideCountries
      ? overrideCountries[orderedIndexRef.current++]
      : getRandomCountry(difficulty, continent)
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

  const setStyleForCountry = useCallback((name, style) => {
    const countryStyle = gameType === GAME_TYPES.HARDCORE ? { ...style, color: MAP_COLORS.stroke } : style
    const allRefs = [geoJsonRef, ...extraGeoJsonRefs.current]
    for (const ref of allRefs) {
      if (!ref.current) continue
      const layer = ref.current.getLayers().find(l => l.feature.properties.ADMIN === name)
      if (layer) layer.setStyle(countryStyle)
    }
  }, [gameType])

  // 3 consecutive errors: highlight country
  useEffect(() => {
    if (consecutiveErrors < 3) return
    toast.error(t('toasts.location_reveal', { name: getCountryName(countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)?.properties?.ISO_A2, i18n.language) || targetCountryRef.current }), {
      containerId: 'topRightToast',
    })
    const name = targetCountryRef.current
    setStyleForCountry(name, { fillColor: MAP_COLORS.wrong, weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(name)
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(
        l => l.feature.properties.ADMIN === name
      )
      if (layer) {
        const center = layer.getBounds().getCenter()
        zoomCountryMap(center.lat, center.lng)
      }
    }
  }, [consecutiveErrors, zoomCountryMap, setStyleForCountry]) // eslint-disable-line react-hooks/exhaustive-deps

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
    flushElo()
    if (isTraining) {
      toast.success(t('toasts.all_countries_found'), {
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
      : getRandomCountry(difficulty, continent)
    if (next) {
      alreadyChosenCountries.push(next)
      setTargetCountry(next)
    }
  }, [difficulty, continent, getRandomCountry, overrideCountries])

  const handleHardcoreTap = useCallback((point) => {
    if (gameType !== GAME_TYPES.HARDCORE || !gameStartedRef.current || clickOnSeeCountryRef.current) return
    const name = targetCountryRef.current
    const feature = countries.features.find((country) => country.properties.ADMIN === name)
    if (!feature) return

    const result = scoreHardcoreTap(point, feature)
    setScore((current) => current + result.points)
    if (ratedRef.current) reportEloAnswer(GAME_TYPES.HARDCORE, name, { found: result.inside, errors: 0 })
    setStyleForCountry(name, {
      fillColor: result.inside ? MAP_COLORS.right : MAP_COLORS.wrong,
      weight: 2,
      fillOpacity: 0.5,
    })
    if (result.inside) {
      foundCountriesRef.current.add(name)
      setStats((prev) => ({ ...prev, found: prev.found + 1, foundFirstTry: (prev.foundFirstTry ?? 0) + 1 }))
    } else {
      shownCountriesRef.current.add(name)
      setStats((prev) => ({ ...prev, skipped: prev.skipped + 1, totalErrors: (prev.totalErrors ?? 0) + 1 }))
    }
    changeCountry()
    const feedback = result.inside
      ? `${t('toasts.found_country', { name: getCountryName(feature.properties.ISO_A2, i18n.language) || name })} +${result.points}`
      : `${t('toasts.wrong')} +${result.points}`
    toast[result.inside ? 'success' : 'error'](feedback, {
      containerId: 'topRightToast',
    })
  }, [changeCountry, gameType, i18n.language, setStyleForCountry, t])

  const onMapClick = useCallback((event) => {
    if (gameType === GAME_TYPES.HARDCORE) handleHardcoreTap(event.latlng)
  }, [gameType, handleHardcoreTap])

  const onCountryMouseOver = (event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name)) return
    if (shownCountriesRef.current.has(name)) return
    if (gameType === GAME_TYPES.HARDCORE) return
    layer.setStyle(HOVER_STYLE)
  }

  const onCountryMouseOut = (event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name)) return
    if (shownCountriesRef.current.has(name)) return
    if (gameType === GAME_TYPES.HARDCORE) return
    layer.setStyle(COUNTRY_STYLE)
  }

  const handleCountrySelected = useCallback((clickedName) => {
    if (!gameStartedRef.current) return
    const targetDiff = countries.features.find(
      c => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty

    if (clickedName === targetCountryRef.current) {
      const wasSkipped =
        consecutiveErrorsRef.current >= 3 || clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success(t('toasts.found_country', { name: getCountryName(targetCountryISO, i18n.language) || targetCountryRef.current }), {
          containerId: 'topRightToast',
        })
        incrementScore(targetDiff, consecutiveErrorsRef.current)
      }
      if (ratedRef.current) reportEloAnswer(gameType, clickedName, { found: !wasSkipped, errors: consecutiveErrorsRef.current })
      setStyleForCountry(clickedName, { fillColor: MAP_COLORS.right, weight: 2, fillOpacity: 0.5 })
      shownCountriesRef.current.delete(clickedName)
      foundCountriesRef.current.add(clickedName)
      setStats(prev =>
        wasSkipped
          ? { ...prev, skipped: prev.skipped + 1 }
          : consecutiveErrorsRef.current === 0
            ? { ...prev, found: prev.found + 1, foundFirstTry: (prev.foundFirstTry ?? 0) + 1 }
            : { ...prev, found: prev.found + 1 }
      )
      changeCountry()
      setConsecutiveErrors(0)
      consecutiveErrorsRef.current = 0
      setClickOnSeeCountry(false)
      clickOnSeeCountryRef.current = false
    } else {
      toast.error(t('toasts.wrong'), { containerId: 'topRightToast' })
      const newErrors = consecutiveErrorsRef.current + 1
      setConsecutiveErrors(newErrors)
      consecutiveErrorsRef.current = newErrors
      setStats(prev => ({ ...prev, totalErrors: (prev.totalErrors ?? 0) + 1 }))
    }
  }, [changeCountry, gameType, setStyleForCountry])

  const onCountryClick = useCallback((event) => {
    if (gameType !== GAME_TYPES.HARDCORE) handleCountrySelected(event.target.feature.properties.ADMIN)
  }, [gameType, handleCountrySelected])

  const onCountryNameClick = useCallback((name) => {
    handleCountrySelected(name)
  }, [handleCountrySelected])

  const seeCountry = () => {
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    const name = targetCountryRef.current
    setStyleForCountry(name, { fillColor: MAP_COLORS.wrong, weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(name)
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === name
    )
    if (!layer) return
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
    for (const ref of [geoJsonRef, ...extraGeoJsonRefs.current]) {
      if (ref.current) ref.current.getLayers().forEach(l => l.setStyle(gameType === GAME_TYPES.HARDCORE ? HARDCORE_COUNTRY_STYLE : COUNTRY_STYLE))
    }
    startTimeRef.current = null;
    timerRef.current = 0;
    setTimer(0);
    setTimeout(() => {
      const total = continent ? getTotalCountriesByContinent(continent) : getTotalCountries(difficulty);
      setStats({ found: 0, skipped: 0, total, totalErrors: 0 });
      const next = getRandomCountry(difficulty, continent);
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

  const isGameOver = allProcessed && !isTraining
  const displayTimer = isTraining ? '∞' : formatTime(timer)

  const targetCountryISO = useMemo(
    () => countries.features.find(c => c.properties.ADMIN === targetCountry)?.properties?.ISO_A2 ?? null,
    [targetCountry]
  )

  return {
    targetCountry,
    targetCountryISO,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    geoJsonRef,
    extraGeoJsonRefs,
    mapRef,
    setMapRef,
    onCountryClick,
    onMapClick,
    onCountryNameClick,
    onCountryMouseOver,
    onCountryMouseOut,
    foundCountriesRef,
    shownCountriesRef,
    seeCountry,
    restartGame,
    goHome,
  }
}
