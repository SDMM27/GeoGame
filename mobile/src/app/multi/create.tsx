// Creates a multiplayer room for one game: live or challenge, plus the game's options.
// Placement / Flags / Capitals get their difficulty, continent or Ascension from the setup sheet (`config`).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { QUIZ_DIFFICULTIES } from '@shared/utils/quizQuestions'

import { Button, Segmented, Text } from '@/components/ui'
import { DIFFICULTY_COLORS, getGame } from '@/games'
import { createRoom, getSavedPseudo, type RoomGame, type RoomMode } from '@/multiplayer/room'
import { colors, fonts, radius, space } from '@/theme'

type SetupConfig = { difficulty?: string; continent?: string; phases?: Record<string, number>; presetName?: string | null }

const COUNTS = ['5', '10', '15'] as const
const QUIZ_COUNTS = ['5', '10', '20'] as const

export default function CreateRoomSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ game: string; config?: string }>()
  const game = getGame(params.game)!
  const setup: SetupConfig = params.config ? JSON.parse(params.config) : {}

  const [mode, setMode] = useState<RoomMode>('live')
  const [count, setCount] = useState<string>('10')
  const [quizDifficulty, setQuizDifficulty] = useState('Moyen')
  const [answerMode, setAnswerMode] = useState<'choices' | 'free'>('choices')
  const [pseudo, setPseudo] = useState(getSavedPseudo)
  const [creating, setCreating] = useState(false)
  const [failed, setFailed] = useState(false)

  const isQuiz = game.id === 'quiz'
  const isRounds = game.id === 'border_guess' || game.id === 'country_clue'

  const setupLabel = setup.phases
    ? `${t('mobile.setup.ascension')} · ${setup.presetName === 'Progressif' ? t('presets.progressive') : (setup.presetName ?? t('presets.custom'))}`
    : setup.continent
      ? t(`continents.${setup.continent}`)
      : setup.difficulty
        ? t(`difficulties.${setup.difficulty}`)
        : null

  const onCreate = async () => {
    const name = pseudo.trim()
    if (!name) return
    const roomGame: RoomGame = {
      id: game.id,
      type: game.type,
      difficulty: setup.difficulty ?? null,
      continent: setup.continent ?? null,
      phases: setup.phases ?? null,
      presetName: setup.presetName ?? null,
    }
    if (isRounds || isQuiz) roomGame.count = Number(count)
    if (isQuiz) Object.assign(roomGame, { quizDifficulty, answerMode })
    setCreating(true)
    setFailed(false)
    try {
      const code = await createRoom({ game: roomGame, mode, pseudo: name })
      router.replace({ pathname: '/multi/[code]', params: { code } })
    } catch (error) {
      console.error(error)
      setFailed(true)
      setCreating(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: `${game.color}22` }]}>
            <MaterialCommunityIcons name={game.icon} size={28} color={game.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" color={game.color}>
              {t('mobile.multi.title')}
            </Text>
            <Text variant="title" style={{ fontSize: 26 }}>
              {t(game.titleKey)}
            </Text>
            {setupLabel && <Text variant="caption">{setupLabel}</Text>}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Segmented<RoomMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'live', label: t('mobile.multi.live') },
              { value: 'challenge', label: t('mobile.multi.challenge') },
            ]}
          />
          <Text variant="caption">{t(mode === 'live' ? 'mobile.multi.live_hint' : 'mobile.multi.challenge_hint')}</Text>
        </View>

        {isQuiz && (
          <>
            <View style={{ gap: space.sm }}>
              <Text variant="label">{t('mobile.multi.difficulty')}</Text>
              <View style={styles.grid}>
                {(QUIZ_DIFFICULTIES as string[]).map((difficulty) => {
                  const active = quizDifficulty === difficulty
                  const color = DIFFICULTY_COLORS[difficulty]
                  return (
                    <Button
                      key={difficulty}
                      label={t(`difficulties.${difficulty}`)}
                      variant="secondary"
                      onPress={() => setQuizDifficulty(difficulty)}
                      style={[styles.option, active && { borderColor: color, backgroundColor: `${color}22` }]}
                    />
                  )
                })}
              </View>
            </View>
            <View style={{ gap: space.sm }}>
              <Text variant="label">{t('mobile.multi.answer_mode')}</Text>
              <Segmented<'choices' | 'free'>
                value={answerMode}
                onChange={setAnswerMode}
                options={[
                  { value: 'choices', label: t('quiz.modes.choices') },
                  { value: 'free', label: t('quiz.modes.free') },
                ]}
              />
            </View>
          </>
        )}

        {(isRounds || isQuiz) && (
          <View style={{ gap: space.sm }}>
            <Text variant="label">{t(isQuiz ? 'mobile.multi.questions_count' : 'mobile.multi.countries_count')}</Text>
            <Segmented<string>
              value={count}
              onChange={setCount}
              options={(isQuiz ? QUIZ_COUNTS : COUNTS).map((value) => ({ value, label: value }))}
            />
          </View>
        )}

        <View style={{ gap: space.sm }}>
          <Text variant="label">{t('mobile.multi.pseudo')}</Text>
          <TextInput
            value={pseudo}
            onChangeText={setPseudo}
            placeholder={t('labels.your_username')}
            placeholderTextColor={colors.textFaint}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onCreate}
            style={styles.input}
          />
          {failed && (
            <Text variant="caption" color={colors.danger}>
              {t('mobile.game.load_error')}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          label={t('mobile.multi.create')}
          onPress={onCreate}
          loading={creating}
          disabled={!pseudo.trim()}
          color={game.color}
          icon={<MaterialCommunityIcons name="account-group" size={20} color={colors.onAccent} />}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { flexBasis: '48%', flexGrow: 1, borderWidth: 1.5, borderColor: colors.border },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
})
