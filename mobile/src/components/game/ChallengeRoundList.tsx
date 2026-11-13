// The rounds of a daily game, each with what it asked and whether it was right: the Daily Challenge result screen and
// the leaderboard rows (Daily Challenge, Country of the Day) show the same list. The website's ChallengeRoundList.
import type React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { CHALLENGE_ROUND_EMOJI } from '@shared/utils/dailyChallenge'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { getCountryName } from '@shared/utils/getCountryName'

import { roundAnswer, type SurvivalRound } from '@/components/survival/SurvivalRounds'
import { makeStyles, radius, space } from '@/theme'
import { Text } from '../ui'

// What a round asked and its answer: "Paris (France)" for a capital
export function answerLabel(round: SurvivalRound, lang: string, t: Parameters<typeof roundAnswer>[2]) {
  const answer = roundAnswer(round, lang, t)
  if (round.type !== GAME_TYPES.CAPITALS || !round.country) return answer
  const p = round.country.properties
  return `${answer} (${getCountryName(p.ISO_A2, lang) || p.ADMIN})`
}

// One round: its icon, its label, and the result (✅ / ❌, or a text such as "2/3 ✅"), framed green or red
export function RoundItem({ icon, label, right, result }: { icon: string; label: string; right: boolean; result?: string }) {
  const styles = useStyles()
  return (
    <View style={[styles.item, right ? styles.itemRight : styles.itemWrong]}>
      <Text variant="body">{icon}</Text>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Text variant="body">{result ?? (right ? '✅' : '❌')}</Text>
    </View>
  )
}

// rights: one boolean per round
export function ChallengeRoundList({ rounds, rights }: { rounds: SurvivalRound[]; rights: boolean[] }) {
  const { t, i18n } = useTranslation()
  return (
    <RoundList>
      {rounds.map((round, index) => (
        <RoundItem
          key={index}
          icon={CHALLENGE_ROUND_EMOJI[round.type as keyof typeof CHALLENGE_ROUND_EMOJI]}
          label={answerLabel(round, i18n.language, t)}
          right={Boolean(rights[index])}
        />
      ))}
    </RoundList>
  )
}

export function RoundList({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  return <View style={styles.list}>{children}</View>
}

const useStyles = makeStyles((colors) => ({
  list: { gap: space.xs, alignSelf: 'stretch' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  itemRight: { borderColor: colors.success, backgroundColor: `${colors.success}1F` },
  itemWrong: { borderColor: colors.danger, backgroundColor: `${colors.danger}1F` },
  label: { flex: 1 },
}))
