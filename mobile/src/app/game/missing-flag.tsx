// Identify a country from its flag with one horizontal band hidden.
import { useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import useFlagGameState from '@shared/hooks/useFlagGameState'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getAllCountryNames, getCountryName } from '@shared/utils/getCountryName'

import { TypingGame, type TypingGameConfig } from '@/components/game/TypingGame'
import { useTheme } from '@/theme'

const BASE_CONFIG: Omit<TypingGameConfig, 'accent'> = {
  game: 'missing_flag',
  gameType: GAME_TYPES.MISSING_FLAG,
  scoreGameType: GAME_TYPES.MISSING_FLAG,
  promptKey: 'mobile.game.which_country',
  placeholderKey: 'placeholders.country_name',
  shareDetailsKey: 'share.details_flags_timer',
  acceptedAnswers: ({ properties: p }) => getAllCountryNames(p.ISO_A2, p.ADMIN, p.aliases ?? []),
  answerLabel: ({ properties: p }, lang) => getCountryName(p.ISO_A2, lang) || p.ADMIN,
  missingFlag: true,
}

function useConfig(): TypingGameConfig {
  const accent = useTheme().gameColors.missing_flag
  return useMemo(() => ({ ...BASE_CONFIG, accent }), [accent])
}

type Params = { difficulty?: string; continent?: string; training?: string }

export default function MissingFlagScreen() {
  const params = useLocalSearchParams<Params>()
  const isTraining = params.training === '1'
  return <StandardGame difficulty={params.difficulty ?? null} continent={params.continent ?? null} isTraining={isTraining} />
}

function StandardGame({ difficulty, continent, isTraining }: { difficulty: string | null; continent: string | null; isTraining: boolean }) {
  const config = useConfig()
  const state = useFlagGameState(difficulty, isTraining, null, null, null, continent, GAME_TYPES.MISSING_FLAG)
  return <TypingGame config={config} state={state} difficulty={difficulty} continent={continent} isTraining={isTraining} ascension={null} />
}

