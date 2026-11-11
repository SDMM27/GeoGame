// Creates a multiplayer room for one game: live or challenge, plus the game's options.
// With `add` (a room code), adds the game at the end of that room instead (host, from multi/add).
// Placement / Flags / Capitals get their difficulty, continent or Ascension from the setup sheet (`config`).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { presetLabel } from '@shared/utils/ascensionPresets'
import { containsProfanity } from '@shared/utils/profanity'
import { matchSurvivalRamp, parseSurvivalModes } from '@shared/utils/survivalConfig'
import { QUIZ_DIFFICULTIES } from '@shared/utils/quizQuestions'

import { useAccount } from '@/account/auth'
import { BoardStrip, type BoardCell, Kicker, ScreenTitle, Stamp } from '@/components/flight'
import { SheetCloseButton } from '@/components/SheetCloseButton'
import { Button, Segmented, Text } from '@/components/ui'
import { DIFFICULTY_COLORS, getGame } from '@/games'
import { addGameToRoom, createRoom, getSavedPseudo, type RoomGame, type RoomMode } from '@/multiplayer/room'
import GameEmblem from '@/components/GameEmblem'
import { colors, fonts, radius, space } from '@/theme'

// From the setup sheet: Placement / Flags / Capitals (difficulty, continent or Ascension), Survival (modes and lives)
type SetupConfig = {
  difficulty?: string
  continent?: string
  phases?: Record<string, number>
  presetName?: string | null
  modes?: string
  lives?: number
  timer?: number
  ramp?: Record<string, number>
}

const COUNTS = ['5', '10', '15'] as const
const QUIZ_COUNTS = ['5', '10', '20'] as const

export default function CreateRoomSheet() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ game: string; config?: string; add?: string }>()
  const addTo = params.add
  const game = getGame(params.game)!
  const setup: SetupConfig = params.config ? JSON.parse(params.config) : {}

  const [mode, setMode] = useState<RoomMode>('live')
  const [count, setCount] = useState<string>('10')
  const [quizDifficulty, setQuizDifficulty] = useState('Moyen')
  const [answerMode, setAnswerMode] = useState<'choices' | 'free'>('choices')
  const { account } = useAccount()
  // Signed in: the account's username until the player types another one
  const [typed, setPseudo] = useState<string | null>(null)
  const pseudo = typed ?? account?.username ?? getSavedPseudo()
  const [creating, setCreating] = useState(false)
  const [failed, setFailed] = useState(false)
  const forbidden = containsProfanity(pseudo)

  const isQuiz = game.id === 'quiz'
  const isRounds = game.id === 'border_guess' || game.id === 'country_clue'

  const isSurvival = game.id === 'survival'

  const setupLabel = isSurvival
    ? `${t('survival.lives_count', { count: setup.lives ?? 0 })} · ⏱ ${
        setup.timer ? t('survival.timer_seconds', { count: setup.timer }) : t('survival.timer_none')
      } · ${t(`survival.ramp.${matchSurvivalRamp(setup.ramp) ?? 'custom'}`)} · ${parseSurvivalModes(setup.modes)
        .map((type: string) => t(`survival.round_type.${type}`))
        .join(', ')}`
    : setup.phases
    ? `${t('mobile.setup.ascension')} · ${setup.presetName ? presetLabel(setup.presetName, t) : t('presets.custom')}`
    : setup.continent
      ? t(`continents.${setup.continent}`)
      : setup.difficulty
        ? t(`difficulties.${setup.difficulty}`)
        : null

  const boardCells: BoardCell[] = [
    { label: t('mobile.flight.flight').toLocaleUpperCase(), value: game.code, color: colors.gold },
    ...(addTo ? [] : [{ label: t('mobile.flight.mode').toLocaleUpperCase(), value: t(mode === 'live' ? 'mobile.multi.live' : 'mobile.multi.challenge').toUpperCase(), color: mode === 'live' ? colors.warning : colors.text }]),
    ...(isRounds || isQuiz ? [{ label: t('mobile.flight.stops').toLocaleUpperCase(), value: count, color: colors.accent }] : []),
  ]

  const onCreate = async () => {
    const name = pseudo.trim()
    if ((!name || forbidden) && !addTo) return
    const roomGame: RoomGame = {
      id: game.id,
      type: game.type,
      difficulty: setup.difficulty ?? null,
      continent: setup.continent ?? null,
      phases: setup.phases ?? null,
      presetName: setup.presetName ?? null,
    }
    if (isRounds || isQuiz) roomGame.count = Number(count)
    if (isSurvival) Object.assign(roomGame, { modes: setup.modes, lives: setup.lives, timer: setup.timer ?? 0, ramp: setup.ramp })
    if (isQuiz) Object.assign(roomGame, { quizDifficulty, answerMode })
    setCreating(true)
    setFailed(false)
    try {
      if (addTo) {
        await addGameToRoom(addTo, roomGame)
        router.back()
        return
      }
      const code = await createRoom({ game: roomGame, mode, pseudo: name, uid: account?.uid })
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
            <GameEmblem game={game.id} variant="glyph" size={28} color={game.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Kicker color={game.color}>{t('mobile.multi.title')}</Kicker>
            <ScreenTitle size={28} numberOfLines={2}>
              {t(game.titleKey)}
            </ScreenTitle>
            {setupLabel && <Text variant="caption">{setupLabel}</Text>}
          </View>
          <SheetCloseButton />
        </View>

        <BoardStrip cells={boardCells} />

        {!addTo && (
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
        )}

        {isQuiz && (
          <>
            <View style={{ gap: space.sm }}>
              <Kicker>{t('mobile.multi.difficulty')}</Kicker>
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
              <Kicker>{t('mobile.multi.answer_mode')}</Kicker>
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
            <Kicker>{t(isQuiz ? 'mobile.multi.questions_count' : 'mobile.multi.countries_count')}</Kicker>
            <Segmented<string>
              value={count}
              onChange={setCount}
              options={(isQuiz ? QUIZ_COUNTS : COUNTS).map((value) => ({ value, label: value }))}
            />
          </View>
        )}

        <View style={{ gap: space.sm }}>
          {!addTo && (
            <>
              <Kicker>{t('mobile.multi.pseudo')}</Kicker>
              <View style={styles.inputBox}>
              <MaterialCommunityIcons name="account-outline" size={22} color={colors.textMuted} />
              <TextInput
                accessibilityLabel={t('mobile.multi.pseudo')}
                value={pseudo}
                onChangeText={setPseudo}
                placeholder={t('labels.your_username')}
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onCreate}
                style={styles.input}
              />
              <Text style={styles.counter}>{pseudo.length}/20</Text>
              </View>
            </>
          )}
          {!addTo && forbidden && (
            <Text variant="caption" color={colors.danger}>
              {t('account.errors.username_forbidden')}
            </Text>
          )}
          {failed && (
            <Text variant="caption" color={colors.danger}>
              {t('mobile.game.load_error')}
            </Text>
          )}
        </View>

        {!addTo && (
          <View style={styles.hostNote}>
            <Stamp label={t('mobile.multi.host').toLocaleUpperCase()} rotate={-6} animate={false} size={11} />
            <Text variant="caption" style={{ flex: 1 }}>
              {t('mobile.flight.host_note')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          label={addTo ? t('mp_room.add_game') : t('mobile.multi.create')}
          onPress={onCreate}
          loading={creating}
          disabled={!addTo && (!pseudo.trim() || forbidden)}
          color={game.color}
          icon={<MaterialCommunityIcons name="account-group" size={20} color={colors.onAccent} />}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hostNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { flexBasis: '48%', flexGrow: 1, borderWidth: 1.5, borderColor: colors.border },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.board,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, height: '100%', color: colors.text, fontFamily: fonts.bodyBold, fontSize: 17 },
  counter: { fontFamily: fonts.monoBold, fontSize: 11, color: colors.textMuted },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
})
