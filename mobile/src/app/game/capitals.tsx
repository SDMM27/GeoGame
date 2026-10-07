// "Capitales": name the capital of the country (flag + country name as clues).
import { useLocalSearchParams } from 'expo-router'

import useAscensionState from '@shared/hooks/useAscensionState'
import useCapitalsGameState from '@shared/hooks/useCapitalsGameState'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getAllCapitalNames, getCapitalName, getCountryName } from '@shared/utils/getCountryName'

import { TypingGame, type TypingGameConfig } from '@/components/game/TypingGame'
import { RoomGate, type RoomPlay } from '@/multiplayer/RoomPlay'
import { gameColors } from '@/theme'

const CONFIG: TypingGameConfig = {
  gameType: GAME_TYPES.CAPITALS,
  scoreGameType: 'CAPITALS',
  accent: gameColors.capitals,
  promptKey: 'mobile.game.which_capital',
  placeholderKey: 'placeholders.capital_name',
  shareDetailsKey: 'share.details_capitals_timer',
  acceptedAnswers: ({ properties: p }) => getAllCapitalNames(p.ISO_A2, p.capital, p.capitalAliases ?? []),
  answerLabel: ({ properties: p }, lang) => getCapitalName(p.ISO_A2, lang) || p.capital,
  clue: ({ properties: p }, lang) => getCountryName(p.ISO_A2, lang) || p.ADMIN,
}

type Params = { difficulty?: string; continent?: string; training?: string; ascension?: string; preset?: string; room?: string }

function StandardGame({ difficulty, continent, isTraining }: { difficulty: string | null; continent: string | null; isTraining: boolean }) {
  const state = useCapitalsGameState(difficulty, isTraining, null, null, null, continent)
  return <TypingGame config={CONFIG} state={state} difficulty={difficulty} continent={continent} isTraining={isTraining} ascension={null} />
}

function AscensionGame({ phases, presetName, isTraining }: { phases: Record<string, number>; presetName: string | null; isTraining: boolean }) {
  const state = useAscensionState(GAME_TYPES.CAPITALS, phases, isTraining, true)
  return <TypingGame config={CONFIG} state={state} difficulty={null} continent={null} isTraining={isTraining} ascension={{ presetName }} />
}

function RoomGame({ play }: { play: RoomPlay }) {
  const { list, byDifficulty } = play.content
  return byDifficulty ? (
    <RoomAscensionGame play={play} phases={play.room.game.phases!} byDifficulty={byDifficulty} />
  ) : (
    <RoomStandardGame play={play} list={list!} />
  )
}

function RoomStandardGame({ play, list }: { play: RoomPlay; list: unknown[] }) {
  const { difficulty = null, continent = null } = play.room.game
  const state = useCapitalsGameState(difficulty, false, list, null, null, continent)
  return <TypingGame config={CONFIG} state={state} difficulty={difficulty} continent={continent} isTraining={false} ascension={null} play={play} />
}

function RoomAscensionGame({ play, phases, byDifficulty }: { play: RoomPlay; phases: Record<string, number>; byDifficulty: Record<string, unknown[]> }) {
  const state = useAscensionState(GAME_TYPES.CAPITALS, phases, false, true, byDifficulty)
  return <TypingGame config={CONFIG} state={state} difficulty={null} continent={null} isTraining={false} ascension={{ presetName: null }} play={play} />
}

export default function FlagsScreen() {
  const params = useLocalSearchParams<Params>()
  const isTraining = params.training === '1'
  if (params.room) return <RoomGate code={params.room}>{(play) => <RoomGame play={play} />}</RoomGate>
  if (params.ascension) {
    return <AscensionGame phases={JSON.parse(params.ascension)} presetName={params.preset ?? null} isTraining={isTraining} />
  }
  return <StandardGame difficulty={params.difficulty ?? null} continent={params.continent ?? null} isTraining={isTraining} />
}
