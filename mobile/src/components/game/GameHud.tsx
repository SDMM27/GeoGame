// In-flow header of a game screen, « carnet de vol » style: GameHeader (close, emblem, « VOL XXX · PORTE A3 », title),
// then a board strip (ESCALE / SCORE / TEMPS) and a progress bar. The one HUD of every game.
// Props:
//   game, title    game id (emblem, flight code) and game title
//   cells          board cells (see BoardStrip); omit for no strip
//   progress       0..1: continuous bar (typing / placement games); states: one segment per round (EscaleProgress)
//   progressColor  color of the continuous bar (default gold)
//   progressLabel  text under the bar (« 8/15 trouvés · 7 restants »), also the bar's accessible label
//   stepLabels     captions under the escale segments (one per segment, see EscaleProgress)
//   gate           decorative gate (default derived from the game); '' for none, then no « · PORTE » in the kicker
//   tag            word between the flight and the gate in the kicker (« QUOTIDIEN », « 12 ESCALES »)
//   confirmQuit    ask before leaving (default true); onQuit overrides the destination (default home).
//                  Android back (button or edge swipe) goes through the same path
//   right          optional node on the right of the header (RoomHudPill...)
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BoardStrip, EscaleProgress, GameHeader, type BoardCell, type EscaleState } from '@/components/flight'
import { GAMES } from '@/games'
import { navigate } from '@/shims/react-router-dom'
import { makeStyles, space, useColors } from '@/theme'
import { confirmAction } from '../confirm'
import { Text } from '../ui'

const GATES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']

// Decorative gate of a game, stable from one screen to the next
export function gameGate(game: string) {
  const index = GAMES.findIndex((g) => g.id === game || g.type === game)
  return GATES[(index < 0 ? 0 : index) % GATES.length]
}

// Close handler of a game screen: asks for confirmation (unless told not to) and also answers the Android back
// button (or edge swipe, easy to hit while panning the map) through the same confirmation.
export function useQuitGuard({ confirmQuit = true, onQuit }: { confirmQuit?: boolean; onQuit?: () => void } = {}) {
  const { t } = useTranslation()
  const quit = onQuit ?? (() => navigate('/'))

  const onClose = () => {
    if (!confirmQuit) return quit()
    confirmAction({
      title: t('mobile.game.quit_title'),
      message: t('mobile.game.quit_message'),
      confirmLabel: t('mobile.game.quit'),
      cancelLabel: t('mobile.game.cancel'),
      icon: 'exit-run',
      onConfirm: quit,
    })
  }

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onCloseRef.current()
        return true
      })
      return () => sub.remove()
    }, []),
  )
  return onClose
}

type Props = {
  game: string
  title: string
  cells?: BoardCell[]
  progress?: number
  states?: EscaleState[]
  progressColor?: string
  progressLabel?: string
  stepLabels?: string[]
  gate?: string
  tag?: string
  confirmQuit?: boolean
  onQuit?: () => void
  right?: ReactNode
  children?: ReactNode
}

export function GameHud({ game, title, cells, progress, states, progressColor, progressLabel, stepLabels, gate, tag, confirmQuit, onQuit, right, children }: Props) {
  const colors = useColors()
  const styles = useStyles()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const onClose = useQuitGuard({ confirmQuit, onQuit })
  return (
    <View style={{ paddingTop: insets.top }}>
      <GameHeader
        game={game}
        title={title}
        gate={gate ?? gameGate(game)}
        tag={tag}
        gateLabel={t('home.gate').toLocaleUpperCase()}
        flightLabel={t('mobile.flight.flight').toLocaleUpperCase()}
        onClose={onClose}
        closeLabel={t('mobile.game.quit')}
        right={right}
      />
      {cells && cells.length > 0 && <BoardStrip cells={cells} style={styles.strip} />}
      {states ? (
        <EscaleProgress states={states} labels={stepLabels} accessibilityLabel={progressLabel} style={styles.progress} />
      ) : progress != null ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={progressLabel}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={[styles.track, styles.progress]}>
          <View style={{ height: 4, borderRadius: 4, width: `${Math.min(1, Math.max(0, progress)) * 100}%`, backgroundColor: progressColor ?? colors.gold }} />
        </View>
      ) : null}
      {progressLabel && states == null && progress != null && (
        <Text variant="caption" style={styles.label} importantForAccessibility="no">
          {progressLabel}
        </Text>
      )}
      {children}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  strip: { marginHorizontal: space.lg },
  progress: { marginHorizontal: space.lg, marginTop: space.md },
  track: { height: 4, borderRadius: 4, backgroundColor: colors.stub, overflow: 'hidden' },
  label: { marginHorizontal: space.lg, marginTop: 6 },
}))
