// src/components/multiplayer/RoomConfig.jsx
// Creates a multiplayer room, like the mobile app: live or challenge, then one or more games with their options.
// GameEditor (one game) is also used in the room, when the host adds a game.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { GAME_TYPES } from '../../utils/gameTypes'
import { getSavedPseudo } from '../../utils/account'
import { containsProfanity } from '../../utils/profanity'
import { ASCENSION_PRESETS, matchPreset, presetLabel } from '../../utils/ascensionPresets'
import { QUIZ_DIFFICULTIES } from '../../utils/quizQuestions'
import { getTotalCountries } from '../../hooks/useGameState'
import { getTotalFlagCountries } from '../../hooks/useFlagGameState'
import { getTotalCapitalCountries } from '../../hooks/useCapitalsGameState'
import { parseSurvivalModes, survivalModesKey } from '../../utils/survivalConfig'
import SurvivalOptions, { SURVIVAL_ROUND_ICONS, defaultSurvivalOptions, rampLabel, timerLabel } from '../SurvivalOptions'
import { LISTED_ROOM_GAMES, ROOM_GAMES, roomGameIcon } from '../../utils/roomGames'
import './RoomConfig.css'

const DEFAULT_ASCENSION_PRESET = ASCENSION_PRESETS.find(p => p.name === 'Découverte') ?? ASCENSION_PRESETS[0]

const SETUP_TYPES = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]
const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const ASCENSION_DIFFS = ['Facile', 'Moyen', 'Difficile', 'Impossible']
const DIFFICULTY_COLORS = {
  Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24',
  Impossible: '#f97316', Hardcore: '#f87171',
}
const COUNTS = [5, 10, 15]
const QUIZ_COUNTS = [5, 10, 20]

function getCountFn(type) {
  if (type === GAME_TYPES.FLAGS) return getTotalFlagCountries
  if (type === GAME_TYPES.CAPITALS) return getTotalCapitalCountries
  return getTotalCountries
}

function Choices({ options, value, onChange }) {
  return (
    <div className="rc-mode-tabs">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={`rc-mode-tab${value === option.value ? ' active' : ''}`}
          onClick={() => onChange(option.value)}
        >{option.label}</button>
      ))}
    </div>
  )
}

// Placement / Flags / Capitals: a difficulty, or Ascension phases
function SetupSettings({ type, setup, onChange }) {
  const { t } = useTranslation()
  const countFn = getCountFn(type)
  const caps = Object.fromEntries(ASCENSION_DIFFS.map(d => [d, countFn(d)]))
  const detectedPreset = matchPreset(setup.phases)

  const handlePreset = (preset) => {
    onChange({ ...setup, phases: Object.fromEntries(ASCENSION_DIFFS.map(d => [d, Math.min(preset.phases[d] ?? 0, caps[d])])) })
  }

  return (
    <>
      <Choices
        options={[{ value: 'standard', label: t('modes.standard') }, { value: 'ascension', label: t('modes.ascension') }]}
        value={setup.mode}
        onChange={mode => onChange({ ...setup, mode })}
      />
      {setup.mode === 'standard' ? (
        <div className="rc-difficulties">
          {/* A continent comes from the game's settings on the home page; picking a difficulty replaces it */}
          {setup.continent && (
            <button type="button" className="rc-diff-btn active">
              <span>{t(`continents.${setup.continent}`, setup.continent)}</span>
              <span className="rc-diff-count">{t('selection.by_continent')}</span>
            </button>
          )}
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              type="button"
              className={`rc-diff-btn${!setup.continent && setup.difficulty === d ? ' active' : ''}`}
              onClick={() => onChange({ ...setup, difficulty: d, continent: null })}
            >
              <span style={{ color: DIFFICULTY_COLORS[d] }}>
                {d === 'Hardcore' ? '💀 Hardcore' : t(`difficulties.${d}`)}
              </span>
              <span className="rc-diff-count">{d === 'Hardcore' ? t('labels.all_countries') : countFn(d)}</span>
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
              >{p.icon} {presetLabel(p.name, t)}</button>
            ))}
          </div>
          {ASCENSION_DIFFS.map(d => (
            <label key={d} className="rc-asc-row">
              <span style={{ color: DIFFICULTY_COLORS[d] }}>{t(`difficulties.${d}`)}</span>
              <span className="rc-asc-val">{setup.phases[d] ?? 0} / {caps[d]}</span>
              <input
                type="range"
                min={0}
                max={caps[d]}
                value={setup.phases[d] ?? 0}
                onChange={e => onChange({ ...setup, phases: { ...setup.phases, [d]: Math.min(Number(e.target.value), caps[d]) } })}
              />
            </label>
          ))}
        </div>
      )}
    </>
  )
}

export const newDraft = () => ({
  gameId: 'placement',
  setup: { mode: 'standard', difficulty: 'Moyen', phases: { ...DEFAULT_ASCENSION_PRESET.phases } },
  count: 10,
  quizDifficulty: 'Moyen',
  answerMode: 'choices',
  survival: defaultSurvivalOptions(),
})

const typeOf = (gameId) => ROOM_GAMES.find(g => g.id === gameId).type

// An Ascension game needs at least one country, a survival game at least one kind of round
export const draftReady = ({ gameId, setup, survival }) =>
  !(SETUP_TYPES.includes(typeOf(gameId)) && setup.mode === 'ascension' && Object.values(setup.phases).every(n => !n))
  && !(typeOf(gameId) === GAME_TYPES.SURVIVAL && survival.modes.length === 0)

/** A game of the room, in the shared format (src/utils/multiplayerRoom.js). */
export function buildRoomGame({ gameId, setup, count, quizDifficulty, answerMode, survival }) {
  const type = typeOf(gameId)
  const ascension = SETUP_TYPES.includes(type) && setup.mode === 'ascension'
  const game = {
    id: gameId,
    type,
    difficulty: SETUP_TYPES.includes(type) && !ascension && !setup.continent ? setup.difficulty : null,
    continent: SETUP_TYPES.includes(type) && !ascension ? (setup.continent ?? null) : null,
    phases: ascension ? setup.phases : null,
    presetName: ascension ? (matchPreset(setup.phases) ?? null) : null,
  }
  if (type === GAME_TYPES.SURVIVAL) {
    return { ...game, modes: survivalModesKey(survival.modes), lives: survival.lives, timer: survival.timer, ramp: survival.ramp }
  }
  if (!SETUP_TYPES.includes(type)) game.count = count
  if (type === GAME_TYPES.QUIZ) Object.assign(game, { quizDifficulty, answerMode })
  return game
}

/** "🚩 Trouve le Drapeau · Moyen", "❤️ Survie · 3 ❤️ · ⏱ 30 s · 🎯 Normale · 🚩🧠" */
export function gameLabel(game, t) {
  const icon = roomGameIcon(game.id)
  if (game.type === GAME_TYPES.SURVIVAL) {
    const rounds = parseSurvivalModes(game.modes).map(type => SURVIVAL_ROUND_ICONS[type]).join('')
    const ramp = game.ramp ? ` · ${rampLabel(game.ramp, t)}` : ''
    return `${icon} ${t('games.survival.title')} · ${game.lives} ❤️ · ⏱ ${timerLabel(game.timer ?? 0, t)}${ramp} · ${rounds}`
  }
  const settings = game.phases
    ? 'Ascension'
    : game.continent
      ? t(`continents.${game.continent}`, game.continent)
      : (game.difficulty ?? game.quizDifficulty)
        ? t(`difficulties.${game.difficulty ?? game.quizDifficulty}`)
        : null
  return `${icon} ${t(`games.${game.id}.title`)}${settings ? ` · ${settings}` : ''}${game.count ? ` · ${game.count}` : ''}`
}

/** One game: which one, and its options. */
export function GameEditor({ draft, onChange }) {
  const { t } = useTranslation()
  const { gameId, setup, count, quizDifficulty, answerMode, survival } = draft
  const type = typeOf(gameId)
  const isQuiz = type === GAME_TYPES.QUIZ
  const isSurvival = type === GAME_TYPES.SURVIVAL
  const set = (patch) => onChange({ ...draft, ...patch })

  return (
    <>
      <div className="rc-game-grid">
        {LISTED_ROOM_GAMES.map(g => (
          <button
            key={g.id}
            type="button"
            className={`rc-game-pick${gameId === g.id ? ' active' : ''}`}
            onClick={() => set({ gameId: g.id, count: 10 })}
          >
            <span className="rc-game-icon">{g.icon}</span>
            {t(`games.${g.id}.title`)}
          </button>
        ))}
      </div>

      {SETUP_TYPES.includes(type) && <SetupSettings type={type} setup={setup} onChange={next => set({ setup: next })} />}

      {isSurvival && (
        <SurvivalOptions options={survival} onChange={update => set({ survival: update(survival) })} />
      )}

      {isQuiz && (
        <>
          <h3 className="rc-games-title">{t('mp_room.difficulty')}</h3>
          <div className="rc-difficulties">
            {QUIZ_DIFFICULTIES.map(d => (
              <button
                key={d}
                type="button"
                className={`rc-diff-btn${quizDifficulty === d ? ' active' : ''}`}
                onClick={() => set({ quizDifficulty: d })}
              >
                <span style={{ color: DIFFICULTY_COLORS[d] }}>{t(`difficulties.${d}`)}</span>
              </button>
            ))}
          </div>
          <h3 className="rc-games-title">{t('mp_room.answer_mode')}</h3>
          <Choices
            options={[{ value: 'choices', label: t('quiz.modes.choices') }, { value: 'free', label: t('quiz.modes.free') }]}
            value={answerMode}
            onChange={value => set({ answerMode: value })}
          />
        </>
      )}

      {!SETUP_TYPES.includes(type) && !isSurvival && (
        <>
          <h3 className="rc-games-title">{t(isQuiz ? 'mp_room.questions_count' : 'mp_room.countries_count')}</h3>
          <Choices
            options={(isQuiz ? QUIZ_COUNTS : COUNTS).map(n => ({ value: n, label: String(n) }))}
            value={count}
            onChange={value => set({ count: value })}
          />
        </>
      )}
    </>
  )
}

// `initialGameId`: the game picked before coming here (the multiplayer button of a home card), with `initialConfig`
// the choices made in its settings: { setup } (Placement / Flags / Capitals) or { survival }.
export default function RoomConfig({ onSubmit, submitting, initialGameId, initialConfig }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  // Signed in: the account's username until the player types another one
  const [typed, setTyped] = useState(null)
  const pseudo = typed ?? account?.username ?? getSavedPseudo()
  const [mode, setMode] = useState('live')
  // Games already added, then the one being edited (the last game of the room)
  const [games, setGames] = useState([])
  const [draft, setDraft] = useState(() => {
    const fresh = newDraft()
    if (!LISTED_ROOM_GAMES.some(g => g.id === initialGameId)) return fresh
    return {
      ...fresh,
      gameId: initialGameId,
      setup: { ...fresh.setup, ...initialConfig?.setup },
      survival: initialConfig?.survival ?? fresh.survival,
    }
  })
  const forbiddenPseudo = containsProfanity(pseudo)
  const canSubmit = pseudo.trim() && !forbiddenPseudo && draftReady(draft) && !submitting

  const addAnother = () => {
    if (!draftReady(draft)) return
    setGames(previous => [...previous, buildRoomGame(draft)])
    setDraft(newDraft())
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ pseudo: pseudo.trim(), mode, games: [...games, buildRoomGame(draft)] })
  }

  return (
    <form className="room-config" onSubmit={handleSubmit}>
      <h2 className="rc-title">{t('config.title')}</h2>

      <div className="rc-pseudo">
        <label htmlFor="pseudo-input">{t('labels.your_username')}</label>
        <input
          id="pseudo-input"
          value={pseudo}
          onChange={e => setTyped(e.target.value)}
          placeholder={t('placeholders.username')}
          maxLength={20}
          aria-invalid={forbiddenPseudo}
        />
        {forbiddenPseudo && <p className="rc-hint" role="alert">{t('account.errors.username_forbidden')}</p>}
      </div>

      <section className="rc-section">
        <Choices
          options={[{ value: 'live', label: t('mp_room.live') }, { value: 'challenge', label: t('mp_room.challenge') }]}
          value={mode}
          onChange={setMode}
        />
        <p className="rc-hint">{t(mode === 'live' ? 'mp_room.live_hint' : 'mp_room.challenge_hint')}</p>
      </section>

      {games.length > 0 && (
        <section className="rc-section">
          <h3 className="rc-games-title">{t('mp_room.games')}</h3>
          <ol className="rc-game-list">
            {games.map((game, index) => (
              <li key={index}>
                <span>{gameLabel(game, t)}</span>
                <button
                  type="button"
                  aria-label={t('mp_room.remove_game')}
                  onClick={() => setGames(previous => previous.filter((_, i) => i !== index))}
                >✕</button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rc-section">
        <h3 className="rc-games-title">{t('mp_room.game_n', { n: games.length + 1 })}</h3>
        <GameEditor draft={draft} onChange={setDraft} />
        <button type="button" className="rc-add-btn" onClick={addAnother} disabled={!draftReady(draft)}>
          + {t('mp_room.add_another')}
        </button>
      </section>

      <button type="submit" className="rc-submit" disabled={!canSubmit}>
        {submitting ? t('config.creating') : t('buttons.create_game')}
      </button>
    </form>
  )
}
