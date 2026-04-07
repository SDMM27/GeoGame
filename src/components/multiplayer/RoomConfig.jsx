// src/components/multiplayer/RoomConfig.jsx
import React, { useState } from 'react'
import { GAME_TYPES } from '../../utils/gameTypes'
import { ASCENSION_PRESETS, matchPreset } from '../../utils/ascensionPresets'
import { getTotalCountries } from '../../hooks/useGameState'
import { getTotalFlagCountries } from '../../hooks/useFlagGameState'
import { getTotalCapitalCountries } from '../../hooks/useCapitalsGameState'
import { BORDER_GUESS_COUNTRY_COUNT } from '../../hooks/useBorderGuessState'
import { COUNTRY_CLUE_COUNTRY_COUNT } from '../../hooks/useCountryClueState'
import './RoomConfig.css'

const GAME_META = {
  [GAME_TYPES.PLACEMENT]:    { label: 'Trouve le Pays',    icon: '🌍', hasMode: true },
  [GAME_TYPES.FLAGS]:        { label: 'Trouve le Drapeau', icon: '🚩', hasMode: true },
  [GAME_TYPES.CAPITALS]:     { label: 'Trouve la Capitale',icon: '🏛️', hasMode: true },
  [GAME_TYPES.BORDER_GUESS]: { label: 'BorderGuess',       icon: '🧭', hasMode: false },
  [GAME_TYPES.COUNTRY_CLUE]: { label: 'Country Clue',      icon: '🔎', hasMode: false },
}

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const ASCENSION_DIFFS = ['Facile', 'Moyen', 'Difficile', 'Impossible']
const DIFFICULTY_COLORS = {
  Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24',
  Impossible: '#f97316', Hardcore: '#f87171',
}

function getCountFn(type) {
  if (type === GAME_TYPES.FLAGS) return getTotalFlagCountries
  if (type === GAME_TYPES.CAPITALS) return getTotalCapitalCountries
  return getTotalCountries
}

function getCaps(type) {
  const fn = getCountFn(type)
  return Object.fromEntries(ASCENSION_DIFFS.map(d => [d, fn(d)]))
}

function defaultGame(type) {
  if (type === GAME_TYPES.BORDER_GUESS || type === GAME_TYPES.COUNTRY_CLUE) {
    return { type, countryCount: 10 }
  }
  return {
    type,
    mode: 'standard',
    difficulty: 'Moyen',
    phases: { Facile: 15, Moyen: 10, Difficile: 5, Impossible: 1 },
  }
}

function GameSettings({ game, onChange }) {
  const meta = GAME_META[game.type]

  if (!meta.hasMode) {
    const maxCount = game.type === GAME_TYPES.BORDER_GUESS
      ? BORDER_GUESS_COUNTRY_COUNT
      : COUNTRY_CLUE_COUNTRY_COUNT
    return (
      <div className="rc-game-settings">
        <label className="rc-slider-label">
          <span>Nombre de pays : <strong>{game.countryCount}</strong></span>
          <input
            type="range"
            min={1}
            max={maxCount}
            value={game.countryCount}
            onChange={e => onChange({ ...game, countryCount: Number(e.target.value) })}
          />
        </label>
      </div>
    )
  }

  const countFn = getCountFn(game.type)
  const caps = getCaps(game.type)
  const detectedPreset = matchPreset(game.phases ?? {})

  const handlePreset = (preset) => {
    const nextPhases = Object.fromEntries(
      ASCENSION_DIFFS.map(d => [d, Math.min(preset.phases[d] ?? 0, caps[d] ?? 0)])
    )
    onChange({ ...game, phases: nextPhases })
  }

  const handleSlider = (d, val) => {
    onChange({ ...game, phases: { ...game.phases, [d]: Number(val) } })
  }

  return (
    <div className="rc-game-settings">
      <div className="rc-mode-tabs">
        <button
          type="button"
          className={`rc-mode-tab${game.mode === 'standard' ? ' active' : ''}`}
          onClick={() => onChange({ ...game, mode: 'standard' })}
        >Standard</button>
        <button
          type="button"
          className={`rc-mode-tab${game.mode === 'ascension' ? ' active' : ''}`}
          onClick={() => onChange({ ...game, mode: 'ascension' })}
        >🚀 Ascension</button>
      </div>

      {game.mode === 'standard' ? (
        <div className="rc-difficulties">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              type="button"
              className={`rc-diff-btn${game.difficulty === d ? ' active' : ''}`}
              style={{ '--diff-color': DIFFICULTY_COLORS[d] }}
              onClick={() => onChange({ ...game, difficulty: d })}
            >
              <span style={{ color: DIFFICULTY_COLORS[d] }}>
                {d === 'Hardcore' ? '💀 Hardcore' : d}
              </span>
              <span className="rc-diff-count">
                {d === 'Hardcore' ? 'Tous' : countFn(d)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rc-ascension">
          <div className="rc-presets">
            {ASCENSION_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                className={`rc-preset${detectedPreset === p.name ? ' active' : ''}`}
                onClick={() => handlePreset(p)}
              >{p.icon} {p.name}</button>
            ))}
          </div>
          {ASCENSION_DIFFS.map(d => (
            <label key={d} className="rc-asc-row">
              <span style={{ color: DIFFICULTY_COLORS[d] }}>{d}</span>
              <span className="rc-asc-val">{game.phases?.[d] ?? 0} / {caps[d]}</span>
              <input
                type="range"
                min={0}
                max={caps[d]}
                value={game.phases?.[d] ?? 0}
                onChange={e => handleSlider(d, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RoomConfig({ onSubmit, submitting }) {
  const [pseudo, setPseudo] = useState('')
  const [games, setGames] = useState([defaultGame(GAME_TYPES.PLACEMENT)])

  const usedTypes = new Set(games.map(g => g.type))
  const availableToAdd = Object.keys(GAME_META).filter(t => !usedTypes.has(t))

  const addGame = (type) => setGames(prev => [...prev, defaultGame(type)])
  const removeGame = (i) => setGames(prev => prev.filter((_, idx) => idx !== i))

  const moveUp = (i) => setGames(prev => {
    if (i === 0) return prev
    const arr = [...prev]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    return arr
  })

  const moveDown = (i) => setGames(prev => {
    if (i === prev.length - 1) return prev
    const arr = [...prev]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    return arr
  })

  const updateGame = (i, updated) =>
    setGames(prev => prev.map((g, idx) => (idx === i ? updated : g)))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!pseudo.trim() || games.length === 0) return
    onSubmit({ pseudo: pseudo.trim(), config: { games } })
  }

  return (
    <form className="room-config" onSubmit={handleSubmit}>
      <h2 className="rc-title">Configurer la partie</h2>

      <div className="rc-pseudo">
        <label htmlFor="rc-pseudo-input">Ton pseudo</label>
        <input
          id="rc-pseudo-input"
          value={pseudo}
          onChange={e => setPseudo(e.target.value)}
          placeholder="Pseudo"
          maxLength={20}
          required
        />
      </div>

      <div className="rc-games">
        <h3 className="rc-games-title">Jeux ({games.length})</h3>
        {games.map((game, i) => {
          const meta = GAME_META[game.type]
          return (
            <div key={game.type} className="rc-game">
              <div className="rc-game-header">
                <span className="rc-game-label">{meta.icon} {meta.label}</span>
                <div className="rc-game-actions">
                  <button type="button" onClick={() => moveUp(i)} disabled={i === 0} aria-label="Monter">↑</button>
                  <button type="button" onClick={() => moveDown(i)} disabled={i === games.length - 1} aria-label="Descendre">↓</button>
                  <button type="button" onClick={() => removeGame(i)} disabled={games.length === 1} aria-label="Supprimer">✕</button>
                </div>
              </div>
              <GameSettings game={game} onChange={updated => updateGame(i, updated)} />
            </div>
          )
        })}

        {availableToAdd.length > 0 && (
          <div className="rc-add-games">
            <span className="rc-add-label">Ajouter un jeu :</span>
            {availableToAdd.map(type => {
              const meta = GAME_META[type]
              return (
                <button key={type} type="button" className="rc-add-btn" onClick={() => addGame(type)}>
                  + {meta.icon} {meta.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rc-submit"
        disabled={!pseudo.trim() || games.length === 0 || submitting}
      >
        {submitting ? 'Création en cours...' : 'Créer la partie'}
      </button>
    </form>
  )
}
