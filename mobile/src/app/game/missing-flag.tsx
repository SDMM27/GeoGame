// Identify a country from its flag with one horizontal band hidden.
import { useLocalSearchParams } from 'expo-router'

import useFlagGameState from '@shared/hooks/useFlagGameState'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getAllCountryNames, getCountryName } from '@shared/utils/getCountryName'

import { TypingGame, type TypingGameConfig } from '@/components/game/TypingGame'
import { gameColors } from '@/theme'

const CONFIG: TypingGameConfig = {
  gameType: GAME_TYPES.MISSING_FLAG,
  scoreGameType: GAME_TYPES.MISSING_FLAG,
  accent: gameColors.missing_flag,
  promptKey: 'mobile.game.which_country',
  placeholderKey: 'placeholders.country_name',
  shareDetailsKey: 'share.details_flags_timer',
  acceptedAnswers: ({ properties: p }) => getAllCountryNames(p.ISO_A2, p.ADMIN, p.aliases ?? []),
  answerLabel: ({ properties: p }, lang) => getCountryName(p.ISO_A2, lang) || p.ADMIN,
  missingFlag: true,
}

type Params = { difficulty?: string; continent?: string; training?: string }

export default function MissingFlagScreen() {
  const params = useLocalSearchParams<Params>()
  const isTraining = params.training === '1'
  return <StandardGame difficulty={params.difficulty ?? null} continent={params.continent ?? null} isTraining={isTraining} />
}

function StandardGame({ difficulty, continent, isTraining }: { difficulty: string | null; continent: string | null; isTraining: boolean }) {
  const state = useFlagGameState(difficulty, isTraining, null, null, null, continent, GAME_TYPES.MISSING_FLAG)
  return <TypingGame config={CONFIG} state={state} difficulty={difficulty} continent={continent} isTraining={isTraining} ascension={null} />
}

