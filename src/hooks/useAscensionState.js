// src/hooks/useAscensionState.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import { GAME_TYPES } from '../utils/gameTypes'
import { checkAnswer } from '../utils/normalizeAnswer'
import { buildPhaseSequence } from '../utils/ascensionPresets'

// Which country property name holds the difficulty for each game type
const DIFFICULTY_PROP = {
  [GAME_TYPES.PLACEMENT]: 'Difficulty',
  [GAME_TYPES.FLAGS]:     'DifficultyFlag',
  [GAME_TYPES.CAPITALS]:  'DifficultyCapitals',
}

// Extra per-game country filter (beyond the difficulty match)
const COUNTRY_FILTER = {
  [GAME_TYPES.PLACEMENT]: () => true,
  [GAME_TYPES.FLAGS]:     c => !!c.properties.ISO_A2,
  [GAME_TYPES.CAPITALS]:  c => !!c.properties.ISO_A2 && !!c.properties.capital,
}

const SCORE_TABLE = {
  Facile:     [3, 2, 1],
  Moyen:      [5, 3, 2],
  Difficile:  [7, 5, 3],
  Impossible: [9, 7, 5],
}

const COUNTRY_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }

// Module-level pool avoids stale closures (same pattern as existing hooks)
let alreadyChosenCountries = []

function getPool(difficulty, gameType, alreadyChosen) {
  const diffProp = DIFFICULTY_PROP[gameType]
  const extraFilter = COUNTRY_FILTER[gameType]
  return countries.features.filter(c =>
    c.properties[diffProp] === difficulty &&
    extraFilter(c) &&
    !alreadyChosen.includes(c.properties.ADMIN)
  )
}

export default function useAscensionState(gameType, phases, isTraining, isAscensionMode = true, overridesByDifficulty = null) {
  const navigate = useNavigate()
  // Static: computed once from props — do not recompute during game
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const phaseSequence = useRef(buildPhaseSequence(phases)).current

  // ── Phase state ──────────────────────────────────────────────
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const currentPhaseIndexRef = useRef(0)
  const [phaseCountRemaining, setPhaseCountRemaining] = useState(phaseSequence[0]?.count ?? 0)
  const phaseCountRemainingRef = useRef(phaseSequence[0]?.count ?? 0)
  const phaseFoundRef = useRef(0)   // found count in current phase
  const phaseSkippedRef = useRef(0) // skipped count in current phase
  const phaseStatsRef = useRef([])  // completed phase records
  const phaseStartTimeRef = useRef(null)

  // ── Common game state ────────────────────────────────────────
  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const statsRef = useRef({ found: 0, skipped: 0, total: 0 })
  const [isGameOver, setIsGameOver] = useState(false)

  // ── Timer ────────────────────────────────────────────────────
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(0)
  const startTimeRef = useRef(null)

  // ── PLACEMENT-only state ─────────────────────────────────────
  const geoJsonRef = useRef(null)
  const extraGeoJsonRefs = useRef([])
  const [mapRef, setMapRef] = useState(null)
  const mapRefRef = useRef(null)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const foundCountriesRef = useRef(new Set())
  const shownCountriesRef = useRef(new Set())

  // ── FLAGS / CAPITALS state ───────────────────────────────────
  const [inputValue, setInputValue] = useState('')
  const [revealedName, setRevealedName] = useState(null)

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  useEffect(() => { if (isAscensionMode && !phaseSequence.length) navigate('/') }, []) // eslint-disable-line
  useEffect(() => { targetCountryRef.current = targetCountry }, [targetCountry])
  useEffect(() => { consecutiveErrorsRef.current = consecutiveErrors }, [consecutiveErrors])
  useEffect(() => { clickOnSeeCountryRef.current = clickOnSeeCountry }, [clickOnSeeCountry])
  useEffect(() => { mapRefRef.current = mapRef }, [mapRef])

  const setTargetFromFeature = useCallback((feature) => {
    setTargetCountry(gameType === GAME_TYPES.PLACEMENT ? feature.properties.ADMIN : feature)
  }, [gameType])

  const getRandomCountry = useCallback((difficulty) => {
    if (overridesByDifficulty?.[difficulty]) {
      const remaining = overridesByDifficulty[difficulty].filter(
        c => !alreadyChosenCountries.includes(c.properties.ADMIN)
      )
      return remaining[0] ?? null  // ordre déterministe : prend le premier non utilisé
    }
    const pool = getPool(difficulty, gameType, alreadyChosenCountries)
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }, [gameType, overridesByDifficulty])

  const incrementScore = useCallback((difficulty, errorCount) => {
    const row = SCORE_TABLE[difficulty]
    if (!row) return
    setScore(prev => prev + row[Math.min(errorCount, 2)])
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAscensionMode || !phaseSequence.length) return
    alreadyChosenCountries = []
    phaseStatsRef.current = []
    phaseFoundRef.current = 0
    phaseSkippedRef.current = 0
    const total = phaseSequence.reduce((s, p) => s + p.count, 0)
    const initialStats = { found: 0, skipped: 0, total }
    setStats(initialStats)
    statsRef.current = initialStats
    phaseStartTimeRef.current = performance.now()
    const first = getRandomCountry(phaseSequence[0].difficulty)
    if (first) {
      alreadyChosenCountries.push(first.properties.ADMIN)
      setTargetFromFeature(first)
      gameStartedRef.current = true
      setGameStarted(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────
  // Global timer (continuous across phases)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted || isGameOver) {
      if (isGameOver && startTimeRef.current) {
        timerRef.current = performance.now() - startTimeRef.current
      }
      return
    }
    startTimeRef.current = performance.now() - (timerRef.current || 0)
    const id = setInterval(() => {
      const t = performance.now() - startTimeRef.current
      setTimer(t)
      timerRef.current = t
    }, 100)
    return () => clearInterval(id)
  }, [gameStarted, isGameOver])

  // ─────────────────────────────────────────────────────────────
  // Core: advance game after a country is resolved
  // ─────────────────────────────────────────────────────────────
  const advanceGame = useCallback((wasFound) => {
    // Update global stats
    const newStats = wasFound
      ? { ...statsRef.current, found: statsRef.current.found + 1 }
      : { ...statsRef.current, skipped: statsRef.current.skipped + 1 }
    setStats(newStats)
    statsRef.current = newStats

    // Update phase counters
    if (wasFound) phaseFoundRef.current += 1
    else phaseSkippedRef.current += 1

    const newRemaining = phaseCountRemainingRef.current - 1
    setPhaseCountRemaining(newRemaining)
    phaseCountRemainingRef.current = newRemaining

    // Reset per-country state
    setConsecutiveErrors(0)
    consecutiveErrorsRef.current = 0
    if (gameType !== GAME_TYPES.PLACEMENT) {
      setInputValue('')
      setRevealedName(null)
      setClickOnSeeCountry(false)
      clickOnSeeCountryRef.current = false
    }

    if (newRemaining <= 0) {
      // Record completed phase stats
      const phaseDurationMs = performance.now() - phaseStartTimeRef.current
      const phaseIdx = currentPhaseIndexRef.current
      phaseStatsRef.current.push({
        difficulty: phaseSequence[phaseIdx].difficulty,
        count: phaseSequence[phaseIdx].count,
        found: phaseFoundRef.current,
        skipped: phaseSkippedRef.current,
        timeMs: phaseDurationMs,
      })

      const nextIdx = phaseIdx + 1
      if (nextIdx < phaseSequence.length) {
        // Advance to next phase
        const nextPhase = phaseSequence[nextIdx]
        currentPhaseIndexRef.current = nextIdx
        setCurrentPhaseIndex(nextIdx)
        phaseCountRemainingRef.current = nextPhase.count
        setPhaseCountRemaining(nextPhase.count)
        phaseFoundRef.current = 0
        phaseSkippedRef.current = 0
        phaseStartTimeRef.current = performance.now()
        toast.info(`🚀 Phase ${nextPhase.difficulty} commencée !`, { containerId: 'topRightToast', autoClose: 2000 })
        const next = getRandomCountry(nextPhase.difficulty)
        if (next) {
          alreadyChosenCountries.push(next.properties.ADMIN)
          setTargetFromFeature(next)
        }
      } else {
        // All phases done
        setIsGameOver(true)
      }
    } else {
      // Same phase, next country
      const next = getRandomCountry(phaseSequence[currentPhaseIndexRef.current].difficulty)
      if (next) {
        alreadyChosenCountries.push(next.properties.ADMIN)
        setTargetFromFeature(next)
      }
    }
  }, [gameType, phaseSequence, getRandomCountry, setTargetFromFeature])

  // ─────────────────────────────────────────────────────────────
  // PLACEMENT-specific: map interaction
  // ─────────────────────────────────────────────────────────────
  const zoomCountryMap = useCallback((lat, lng, diff) => {
    const map = mapRefRef.current
    if (!map) return
    if (targetCountryRef.current === 'Vatican') map.setView([lat, lng], 20)
    else if (diff === 'Difficile') map.setView([lat, lng], 7)
    else if (diff === 'Impossible') map.setView([lat, lng], 9)
    else map.setView([lat, lng], 4)
  }, [])

  const setStyleForCountry = useCallback((name, style) => {
    const allRefs = [geoJsonRef, ...extraGeoJsonRefs.current]
    for (const ref of allRefs) {
      if (!ref.current) continue
      const layer = ref.current.getLayers().find(l => l.feature.properties.ADMIN === name)
      if (layer) layer.setStyle(style)
    }
  }, [])

  // 3 consecutive errors → show country on map
  useEffect(() => {
    if (gameType !== GAME_TYPES.PLACEMENT || consecutiveErrors < 3) return
    toast.error('Dommage ! C\'est ici : ' + targetCountryRef.current, { containerId: 'topRightToast' })
    const name = targetCountryRef.current
    setStyleForCountry(name, { fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(name)
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(l => l.feature.properties.ADMIN === name)
      if (layer) {
        const center = layer.getBounds().getCenter()
        const feat = countries.features.find(c => c.properties.ADMIN === name)
        zoomCountryMap(center.lat, center.lng, feat?.properties.Difficulty)
      }
    }
  }, [consecutiveErrors, gameType, zoomCountryMap, setStyleForCountry])

  const onCountryMouseOver = useCallback((event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name) || shownCountriesRef.current.has(name)) return
    layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
  }, [])

  const onCountryMouseOut = useCallback((event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name) || shownCountriesRef.current.has(name)) return
    layer.setStyle(COUNTRY_STYLE)
  }, [])

  const onCountryClick = useCallback((event) => {
    if (!gameStartedRef.current) return
    const clickedName = event.target.feature.properties.ADMIN
    const feat = countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
    const diff = feat?.properties.Difficulty

    if (clickedName === targetCountryRef.current) {
      const wasSkipped = consecutiveErrorsRef.current >= 3 || clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + targetCountryRef.current + ' !', { containerId: 'topRightToast' })
        // PLACEMENT scoring: each error reduces score (matches useGameState.js)
        incrementScore(diff, consecutiveErrorsRef.current)
      }
      setStyleForCountry(clickedName, { fillColor: '#4ade80', weight: 2, fillOpacity: 0.5 })
      shownCountriesRef.current.delete(clickedName)
      foundCountriesRef.current.add(clickedName)
      advanceGame(!wasSkipped)
    } else {
      toast.error('Dommage !', { containerId: 'topRightToast' })
      setConsecutiveErrors(prev => prev + 1)
    }
  }, [advanceGame, incrementScore, setStyleForCountry])

  const seeCountry = useCallback(() => {
    if (gameType !== GAME_TYPES.PLACEMENT) {
      // FLAGS / CAPITALS
      if (revealedName) return
      setClickOnSeeCountry(true)
      clickOnSeeCountryRef.current = true
      const props = targetCountryRef.current?.properties
      setRevealedName(gameType === GAME_TYPES.FLAGS ? props?.ADMIN : props?.capital)
      return
    }
    // PLACEMENT
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    const name = targetCountryRef.current
    setStyleForCountry(name, { fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(name)
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(l => l.feature.properties.ADMIN === name)
      if (layer) {
        const center = layer.getBounds().getCenter()
        const feat = countries.features.find(c => c.properties.ADMIN === name)
        zoomCountryMap(center.lat, center.lng, feat?.properties.Difficulty)
      }
    }
  }, [gameType, revealedName, zoomCountryMap, setStyleForCountry])

  // ─────────────────────────────────────────────────────────────
  // FLAGS / CAPITALS: auto-advance after reveal + submit handler
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameType === GAME_TYPES.PLACEMENT || !revealedName) return
    const id = setTimeout(() => advanceGame(false), 2000)
    return () => clearTimeout(id)
  }, [revealedName, gameType, advanceGame])

  const handleSubmit = useCallback(() => {
    if (!gameStartedRef.current || !targetCountryRef.current || revealedName) return
    const props = targetCountryRef.current.properties
    const isFlags = gameType === GAME_TYPES.FLAGS
    const answer    = isFlags ? props.ADMIN    : props.capital
    const aliases   = isFlags ? (props.aliases ?? []) : (props.capitalAliases ?? [])
    const diffProp  = isFlags ? props.DifficultyFlag  : props.DifficultyCapitals
    const revLabel  = answer

    if (checkAnswer(inputValue, answer, aliases)) {
      const wasSkipped = clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + revLabel + ' !', { containerId: 'topRightToast' })
        // FLAGS/CAPITALS are more lenient: 1 error still gives full points (matches useFlagGameState/useCapitalsGameState)
        const adjustedErrors = Math.max(0, consecutiveErrorsRef.current - 1)
        incrementScore(diffProp, adjustedErrors)
      }
      advanceGame(!wasSkipped)
    } else {
      const n = consecutiveErrorsRef.current + 1
      setConsecutiveErrors(n)
      consecutiveErrorsRef.current = n
      if (n >= 3) {
        toast.error('Dommage ! C\'est ' + revLabel, { containerId: 'topRightToast' })
        setRevealedName(revLabel)
      } else {
        toast.error('Dommage !', { containerId: 'topRightToast' })
      }
      setInputValue('')
    }
  }, [gameType, inputValue, revealedName, advanceGame, incrementScore])

  // ─────────────────────────────────────────────────────────────
  // Restart / Go home
  // ─────────────────────────────────────────────────────────────
  const restartGame = useCallback(() => {
    setGameStarted(false)
    gameStartedRef.current = false
    setIsGameOver(false)
    alreadyChosenCountries = []
    phaseStatsRef.current = []
    phaseFoundRef.current = 0
    phaseSkippedRef.current = 0
    setScore(0)
    setConsecutiveErrors(0)
    consecutiveErrorsRef.current = 0
    setClickOnSeeCountry(false)
    clickOnSeeCountryRef.current = false
    setInputValue('')
    setRevealedName(null)
    foundCountriesRef.current.clear()
    shownCountriesRef.current.clear()
    for (const ref of [geoJsonRef, ...extraGeoJsonRefs.current]) {
      if (ref.current) ref.current.getLayers().forEach(l => l.setStyle(COUNTRY_STYLE))
    }
    startTimeRef.current = null
    timerRef.current = 0
    setTimer(0)
    currentPhaseIndexRef.current = 0
    setCurrentPhaseIndex(0)
    phaseCountRemainingRef.current = phaseSequence[0]?.count ?? 0
    setPhaseCountRemaining(phaseSequence[0]?.count ?? 0)

    setTimeout(() => {
      const total = phaseSequence.reduce((s, p) => s + p.count, 0)
      const initialStats = { found: 0, skipped: 0, total }
      setStats(initialStats)
      statsRef.current = initialStats
      phaseStartTimeRef.current = performance.now()
      const first = getRandomCountry(phaseSequence[0].difficulty)
      if (first) {
        alreadyChosenCountries.push(first.properties.ADMIN)
        setTargetFromFeature(first)
        setGameStarted(true)
        gameStartedRef.current = true
      }
    }, 0)
  }, [phaseSequence, getRandomCountry, setTargetFromFeature])

  const goHome = useCallback(() => {
    alreadyChosenCountries = []
    foundCountriesRef.current.clear()
    shownCountriesRef.current.clear()
    navigate('/')
  }, [navigate])

  // ─────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────
  const currentPhase = phaseSequence[currentPhaseIndex]
  const displayTimer = isTraining ? '∞' : formatTime(timer)

  return {
    // Common (compatible with existing hooks)
    targetCountry,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    seeCountry,
    restartGame,
    goHome,
    // Ascension-specific
    currentPhase: currentPhase?.difficulty ?? null,
    phaseCountRemaining,
    totalPhaseCount: currentPhase?.count ?? 0,
    phaseStats: phaseStatsRef.current,
    // PLACEMENT-specific
    geoJsonRef,
    extraGeoJsonRefs,
    mapRef,
    setMapRef,
    onCountryClick,
    onCountryMouseOver,
    onCountryMouseOut,
    // FLAGS / CAPITALS-specific
    inputValue,
    setInputValue,
    handleSubmit,
    revealedName,
  }
}
