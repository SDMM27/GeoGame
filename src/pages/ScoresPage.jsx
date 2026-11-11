import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import Scoreboard from './Scoreboard'
import AscensionScoreboard from './AscensionScoreboard'
import EloScoreboard from './EloScoreboard'
import SurvivalScoreboard from './survival/SurvivalScoreboard'
import DailyLeaderboard from './DailyLeaderboard'
import ChallengeLeaderboard from './ChallengeLeaderboard'
import RankingLeaderboard from './RankingLeaderboard'
import CountryOfDayLeaderboard from '../components/countryOfDay/CountryOfDayLeaderboard'
import useDailyKey from '../hooks/useDailyKey'
import { GAMES } from './home/gameData'
import { GAME_TYPES } from '../utils/gameTypes'
import './scoreboard.css'

const MODES = ['standard', 'ascension', 'continent', 'elo', 'daily']
// The daily games shown on the home page, like the app's « Du jour » rankings
const DAILY_GAMES = GAMES.filter((game) => game.kind === 'daily' && game.active)

function DailyScoreboard({ initialGame }) {
  const { t } = useTranslation()
  const dailyKey = useDailyKey()
  const [game, setGame] = React.useState(
    DAILY_GAMES.some((item) => item.id === initialGame) ? initialGame : DAILY_GAMES[0].id,
  )

  const board = !dailyKey
    ? <p className="daily-lb__loading">{t('messages.loading')}</p>
    : game === GAME_TYPES.DAILY_CHALLENGE
      ? <ChallengeLeaderboard dailyKey={dailyKey} />
      : game === GAME_TYPES.COUNTRY_OF_DAY
        ? <CountryOfDayLeaderboard dailyKey={dailyKey} />
        : game === 'ranking' || game === GAME_TYPES.RANKING
          ? <RankingLeaderboard dailyKey={dailyKey} />
          : game === GAME_TYPES.VOYAGE_VOYAGE
            ? (
              <DailyLeaderboard
                gameType={game}
                dailyKey={dailyKey}
                // Voyage Voyage stores its error count in elapsedTime
                secondaryFormatter={(n) => `${n} ${n === 1 ? t('units.error_one') : t('units.error_other')}`}
              />
            )
            : (
              <DailyLeaderboard
                gameType={game}
                dailyKey={dailyKey}
                guessesTitle={game === GAME_TYPES.QUIZ ? t('quiz.guesses_title') : undefined}
              />
            )

  return (
    <div className="scores-daily">
      <div className="scoreboard-mode-tabs scores-daily__games">
        {DAILY_GAMES.map((item) => (
          <button
            key={item.id}
            className={`scoreboard-mode-tab ${game === item.id ? 'scoreboard-mode-tab--active' : ''}`}
            onClick={() => setGame(item.id)}
          >
            {t(item.titleKey)}
          </button>
        ))}
      </div>
      {/* key: each game starts back on today */}
      <React.Fragment key={game}>{board}</React.Fragment>
    </div>
  )
}

export default function ScoresPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game') ?? GAME_TYPES.PLACEMENT
  const requestedMode = searchParams.get('mode')
  const initialMode = MODES.includes(requestedMode)
    ? requestedMode
    : DAILY_GAMES.some((item) => item.id === game) ? 'daily' : 'standard'
  const [mode, setMode] = React.useState(initialMode)
  if (game === GAME_TYPES.SURVIVAL) {
    return (
      <div className="scores-page">
        <NavBar />
        <SurvivalScoreboard
          initialLives={Number(searchParams.get('lives')) || null}
          initialTimer={searchParams.get('timer') != null ? Number(searchParams.get('timer')) : null}
          initialRamp={searchParams.get('ramp')}
          initialModes={searchParams.get('modes')}
        />
      </div>
    )
  }
  const labels = {
    standard: t('modes.standard'),
    ascension: t('modes.ascension'),
    continent: t('modes.continent'),
    elo: t('elo.tab'),
    daily: t('modes.daily'),
  }
  return (
    <div className="scores-page">
      <NavBar />
      <div className="scoreboard-mode-tabs">
        {MODES.map((item) => (
          <button
            key={item}
            className={`scoreboard-mode-tab ${mode === item ? 'scoreboard-mode-tab--active' : ''}`}
            onClick={() => setMode(item)}
          >
            {labels[item]}
          </button>
        ))}
      </div>
      {mode === 'ascension'
        ? <AscensionScoreboard defaultGame={game} />
        : mode === 'elo'
          ? <EloScoreboard />
          : mode === 'daily'
            ? <DailyScoreboard initialGame={game} />
            : <Scoreboard defaultGame={game} continentMode={mode === 'continent'} />
      }
    </div>
  )
}
