// The home screen's interactive globe (port of the website's FlightGlobe): turn it with a drag, tilt it up and down, to
// put the city in the reticle. It runs entirely on the UI thread: the scene state lives in one shared value, a frame
// callback steps it. Land and graticule use an inverse-projection GPU shader;
// only routes and city markers project vectors on UI. JS only hears discrete events.
import {
  Canvas,
  Circle,
  DashPathEffect,
  FillType,
  Group,
  ImageShader,
  Path,
  RadialGradient,
  Rect,
  Skia,
  Shader,
  Text as SkiaText,
  TwoPointConicalGradient,
  useFont,
  useImage,
  vec,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia'
import { useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Text, View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { FadeIn, FadeOut, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { useXp } from '@shared/hooks/useXp'
import {
  EASTER_EGG_SCORE,
  SECRET_SKIN,
  activeSkin,
  loadSecretFound,
  loadSkinChoice,
  reachesEasterEgg,
  saveSecretFound,
  saveSkinChoice,
} from '@shared/utils/globeSkins'

import { fonts, makeStyles, radius, space, useTheme } from '@/theme'

import { CITY_VECTORS, FLIGHT_PATH, GRATICULE, LAND, ROUTES_ACCENT, ROUTES_ACCENT2 } from './globeGeometry'
import { createPathRing, finishFramePath, framePath } from './framePaths'
import { GlobeSkinPicker } from './GlobeSkinPicker'
import { GLOBE_LAND_SHADER } from './globeShader'
import { appendLines, appendRings, rotate, sampleAt, toScreen, viewBasis } from './globeMath'
import {
  CITIES,
  EVENT_FOUND,
  EVENT_TARGET,
  FLIGHT_SECONDS,
  createGlobeState,
  dragEnd,
  dragMove,
  dragStart,
  PARTY_SECONDS,
  startParty,
  stepGlobe,
  type GlobeState,
} from './globeModel'

const MAX_SIZE = 340
const LAND_EFFECT = Skia.RuntimeEffect.Make(GLOBE_LAND_SHADER)
const EMPTY_PATH = Skia.Path.Make()

// The globe's colors come from the theme, like the web's --gg-globe-* tokens: light land on navy in the dark theme,
// dark land on a pale ocean in the light one. The glow around it is the accent, fainter on the light background.
const GLOW = { dark: 'rgba(61,220,151,', light: 'rgba(20,168,107,' } as const
const GLOW_ALPHA = { dark: 0.22, light: 0.16 } as const
const PLANE = Skia.Path.MakeFromSVGString('M-8 -2L7 0L-8 2L-5 0ZM-2 -7L2 0L-2 7Z')!

// Module-level names for what the worklets capture (each is copied to the UI thread once)
const land = LAND
const graticule = GRATICULE
const routesAccent = ROUTES_ACCENT
const routesAccent2 = ROUTES_ACCENT2
const flight = FLIGHT_PATH
const cityVectors = CITY_VECTORS

// Easter-egg confetti: PARTY_PIECES pieces burst out from the center and fall
const PARTY_PIECES = 40
const CONFETTI = ['#FF2BD6', '#FFD447', '#3DDC97', '#22B8CF', '#FF6B3D', '#FFFFFF']
const BANNER_MS = 5000

// The disco land at `time` seconds (a local copy of the shared discoRgb: worklets from ../src are not guaranteed a babel pass)
function discoLand(time: number) {
  'worklet'
  const h = (((time / 4) % 1) + 1) % 1
  const channel = (n: number) => {
    const k = (n + h * 12) % 12
    return 0.6 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [channel(0), channel(8), channel(4), 1]
}

const monoBold = require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf')

type Scene = { state: SharedValue<GlobeState>; basis: SharedValue<number[]>; c: number; r: number }
type Ink = { accent: string; muted: string; text: string; halo: string }

// `progress`: 0 -> 1 over the party, -1 when there is none (then nothing is drawn)
function Confetti({ index, progress, c, r }: { index: number; progress: SharedValue<number>; c: number; r: number }) {
  const angle = index * 2.399963 // golden angle: an even spread
  const speed = 0.45 + (((index * 37) % 100) / 100) * 0.75
  const transform = useDerivedValue(() => {
    const p = Math.max(0, progress.value)
    const out = (1 - (1 - p) * (1 - p)) * r * 1.1 * speed
    return [{ translateX: c + Math.cos(angle) * out }, { translateY: c + Math.sin(angle) * out + p * p * r * 0.6 }, { rotate: p * 8 + index }]
  })
  const opacity = useDerivedValue(() => (progress.value < 0 ? 0 : Math.min(1, (1 - progress.value) * 2.5)))
  const color = CONFETTI[index % CONFETTI.length]
  return (
    <Group transform={transform} opacity={opacity}>
      {index % 2 ? <Rect x={-3} y={-1.5} width={6} height={3} color={color} /> : <Circle cx={0} cy={0} r={2.5} color={color} />}
    </Group>
  )
}

function CityMark({ index, scene, font, reduced, ink }: { index: number; scene: Scene; font: SkFont | null; reduced: boolean; ink: Ink }) {
  const { state, basis, c, r } = scene
  const { accent, muted, text, halo } = ink
  const view = useDerivedValue(() => rotate(basis.value, cityVectors[3 * index], cityVectors[3 * index + 1], cityVectors[3 * index + 2]))
  const transform = useDerivedValue(() => {
    const v = view.value
    const [x, y] = toScreen(v[0], v[1], v[2], c, c, r)
    return [{ translateX: x }, { translateY: y }]
  })
  const visible = useDerivedValue(() => (view.value[2] > 0.02 ? 1 : 0))
  const isTarget = useDerivedValue(() => state.value.target === index)
  const dotRadius = useDerivedValue(() => (isTarget.value ? 6 : 3.5))
  const dotColor = useDerivedValue(() => (isTarget.value ? accent : muted))
  const pingProgress = useDerivedValue(() => (state.value.clock % 1.6) / 1.6)
  const pingRadius = useDerivedValue(() => 5 + pingProgress.value * 15)
  const pingOpacity = useDerivedValue(() => (isTarget.value ? 0.9 * (1 - pingProgress.value) : 0))
  const code = CITIES[index].code
  return (
    <Group transform={transform} opacity={visible}>
      {!reduced && <Circle cx={0} cy={0} r={pingRadius} style="stroke" strokeWidth={2} color={accent} opacity={pingOpacity} />}
      <Circle cx={0} cy={0} r={dotRadius} color={dotColor} />
      <Circle cx={0} cy={0} r={dotRadius} style="stroke" strokeWidth={1.5} color={halo} />
      {font && (
        // A halo in the ocean's color keeps the code readable over the land as over the sea
        <>
          <SkiaText x={8} y={-8} text={code} font={font} style="stroke" strokeWidth={3} strokeJoin="round" color={halo} />
          <SkiaText x={8} y={-8} text={code} font={font} color={text} />
        </>
      )}
    </Group>
  )
}

// `onFind` runs when the player (not the globe on its own) finds the city; `overlay` is drawn over the bottom of the globe.
export function FlightGlobe({
  onFind,
  overlay = null,
  visible,
  uid = null,
}: { onFind?: () => void; overlay?: ReactNode; visible?: SharedValue<boolean>; uid?: string | null } = {}) {
  const { t } = useTranslation()
  const { colors, scheme } = useTheme()
  const styles = useStyles()
  const level: number = useXp(uid)?.level ?? 0
  const [choice, setChoice] = useState<string>(() => loadSkinChoice())
  const [secret, setSecret] = useState<boolean>(() => loadSecretFound())
  const skin = activeSkin(choice, { level, secret }) as { id: string; palette: Record<string, string> | null }
  const disco = skin.id === SECRET_SKIN
  // Classic keeps the theme's colors; the other skins bring their own (the reticle and the city codes sit on a halo)
  const look = useMemo(() => {
    const palette = skin.palette
    if (!palette) {
      return {
        ocean: colors.globeOcean, oceanDeep: colors.globeOceanDeep, land: colors.globeLand, landEdge: colors.globeLandEdge,
        graticule: colors.globeGraticule, reticle: colors.text, reticleHalo: scheme === 'light' ? colors.surface : colors.globeOceanDeep,
      }
    }
    return palette as Record<'ocean' | 'oceanDeep' | 'land' | 'landEdge' | 'graticule' | 'reticle' | 'reticleHalo', string>
  }, [skin, colors, scheme])
  const ink: Ink = useMemo(
    () => ({ accent: colors.accent, muted: colors.textMuted, text: look.reticle, halo: look.reticleHalo }),
    [colors, look]
  )
  const accentColor = colors.accent
  const reticleInk = look.reticle
  const reduced = useReducedMotion()
  const { width } = useWindowDimensions()
  const size = Math.round(Math.min(width - space.lg * 2, MAX_SIZE))
  const c = size / 2
  const r = size * 0.4
  const [target, setTarget] = useState(0)
  const [found, setFound] = useState(false)
  const [score, setScore] = useState(0)
  const [touched, setTouched] = useState(false)
  const [banner, setBanner] = useState(false)

  const codeFont = useFont(monoBold, Math.max(9, size * 0.026))
  const burstFont = useFont(monoBold, Math.max(13, size * 0.042))
  const landImage = useImage(require('@/assets/images/globe-mask.png'))
  const texturedLand = !!landImage && !!LAND_EFFECT
  const landColor = useMemo(() => Array.from(Skia.Color(look.land)), [look.land])
  const edgeColor = useMemo(() => Array.from(Skia.Color(look.landEdge)), [look.landEdge])
  const gridColor = useMemo(() => Array.from(Skia.Color(look.graticule)), [look.graticule])

  const state = useSharedValue<GlobeState>(createGlobeState())
  // Clock/ping updates must not rebuild the projected map while rotation is
  // stationary (for example during the pause after finding a city).
  const longitude = useDerivedValue(() => state.value.lon)
  const latitude = useDerivedValue(() => state.value.lat)
  const basis = useDerivedValue(() => viewBasis(longitude.value, latitude.value))
  // Constant 0 unless the disco skin is on, so the uniforms do not follow the clock for the other skins
  const discoClock = useDerivedValue(() => (disco && !reduced ? state.value.clock : 0))
  const landUniforms = useDerivedValue(() => ({
    center: [c, c], radius: r,
    east: basis.value.slice(0, 3), north: basis.value.slice(3, 6), forward: basis.value.slice(6, 9),
    landColor: disco && !reduced ? discoLand(discoClock.value) : landColor, edgeColor, gridColor,
  }))
  // The party's progress, 0 -> 1 (-1 when there is none): the confetti only moves when it changes
  const partyProgress = useDerivedValue(() => (state.value.party > 0 ? 1 - state.value.party / PARTY_SECONDS : -1))
  const scene: Scene = { state, basis, c, r }

  // The only things that cross threads: a new target, a find (only the player's own finds change the score)
  const onTarget = useCallback((index: number) => {
    setTarget(index)
    setFound(false)
  }, [])
  const onFound = useCallback(
    (total: number, byPlayer: boolean) => {
      setFound(true)
      if (byPlayer) {
        const egg = reachesEasterEgg(total - 100, total) // a player find is always +100
        setScore(total)
        onFind?.()
        if (egg) {
          // The 1000-point easter egg: unlock the disco skin, wear it, and celebrate (no spin or confetti under reduced motion)
          saveSecretFound()
          saveSkinChoice(SECRET_SKIN)
          setSecret(true)
          setChoice(SECRET_SKIN)
          setBanner(true)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
          if (!reduced) {
            state.modify((s) => {
              'worklet'
              startParty(s)
              return s
            })
          }
        }
      }
    },
    [onFind, reduced, state],
  )
  const emit = useCallback(
    (events: number, s: GlobeState) => {
      'worklet'
      if (events & EVENT_TARGET) scheduleOnRN(onTarget, s.target)
      if (events & EVENT_FOUND) scheduleOnRN(onFound, s.score, s.scored)
    },
    [onTarget, onFound],
  )

  useEffect(() => {
    if (!banner) return
    const timer = setTimeout(() => setBanner(false), BANNER_MS)
    return () => clearTimeout(timer)
  }, [banner])

  const chooseSkin = useCallback((id: string) => {
    setChoice(id)
    saveSkinChoice(id)
  }, [])

  useEffect(() => {
    state.modify((s) => {
      'worklet'
      s.reduced = reduced
      return s
    })
  }, [state, reduced])

  // Under reduced motion nothing moves; the frame callback only lets the pause after a find run out (cheap early return)
  const frameCallback = useFrameCallback((info) => {
    'worklet'
    if (visible && !visible.value) return
    const current = state.value
    if (current.reduced && current.phase !== 'found') return
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 0.1)
    state.modify((s) => {
      'worklet'
      emit(stepGlobe(s, dt, s.reduced), s)
      return s
    })
  }, false)

  // The Home tab stays mounted under the other tabs: stop stepping while it is not the one in front
  useFocusEffect(
    useCallback(() => {
      frameCallback.setActive(AppState.currentState === 'active')
      const subscription = AppState.addEventListener('change', (next) => frameCallback.setActive(next === 'active'))
      return () => {
        subscription.remove()
        frameCallback.setActive(false)
      }
    }, [frameCallback]),
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // A gesture that starts vertically still scrolls the home page; once active, a drag turns (horizontal) and tilts (vertical)
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onStart(() => {
          'worklet'
          state.modify((s) => {
            'worklet'
            dragStart(s, performance.now())
            return s
          })
          scheduleOnRN(setTouched, true)
        })
        .onUpdate((event) => {
          'worklet'
          state.modify((s) => {
            'worklet'
            emit(dragMove(s, event.translationX, event.translationY, size, performance.now()), s)
            return s
          })
        })
        .onFinalize(() => {
          'worklet'
          state.modify((s) => {
            'worklet'
            dragEnd(s, performance.now()) // a no-op when the pan never started (a vertical swipe)
            return s
          })
        }),
    [state, size, emit],
  )

  // Shared ownership prevents worklets from capturing a frozen JS-side ring.
  const [initialRings] = useState(
    () => ({ land: createPathRing(), graticule: createPathRing(), routesAccent: createPathRing(), routesAccent2: createPathRing() }),
  )
  const rings = useSharedValue(initialRings)
  const landPath = useDerivedValue<SkPath>(() => {
    if (texturedLand) return EMPTY_PATH
    const path = framePath(rings.value.land)
    // Set the fill rule before building the immutable snapshot.
    path.setFillType(FillType.EvenOdd)
    appendRings(path, land, basis.value, c, c, r)
    return finishFramePath(rings.value.land)
  })
  const graticulePath = useDerivedValue<SkPath>(() => {
    if (texturedLand) return EMPTY_PATH
    const path = framePath(rings.value.graticule)
    appendLines(path, graticule, basis.value, c, c, r)
    return finishFramePath(rings.value.graticule)
  })
  const accentPath = useDerivedValue<SkPath>(() => {
    const path = framePath(rings.value.routesAccent)
    appendLines(path, routesAccent, basis.value, c, c, r)
    return finishFramePath(rings.value.routesAccent)
  })
  const accent2Path = useDerivedValue<SkPath>(() => {
    const path = framePath(rings.value.routesAccent2)
    appendLines(path, routesAccent2, basis.value, c, c, r)
    return finishFramePath(rings.value.routesAccent2)
  })
  // Routes: dashes that run along the arcs
  const dashPhase = useDerivedValue(() => (((-state.value.clock * 20) % 10) + 10) % 10)

  // The plane, nose along its route: position, heading and whether it is on the near side
  const plane = useDerivedValue(() => {
    const u = (state.value.clock / FLIGHT_SECONDS) % 1
    const a = sampleAt(flight, u)
    const b = sampleAt(flight, Math.min(1, u + 0.01))
    const va = rotate(basis.value, a[0], a[1], a[2])
    const vb = rotate(basis.value, b[0], b[1], b[2])
    const [x1, y1] = toScreen(va[0], va[1], va[2], c, c, r)
    const [x2, y2] = toScreen(vb[0], vb[1], vb[2], c, c, r)
    return { x: x1, y: y1, angle: Math.atan2(y2 - y1, x2 - x1), visible: va[2] > 0.05 }
  })
  const planeTransform = useDerivedValue(() => [
    { translateX: plane.value.x },
    { translateY: plane.value.y },
    { rotate: plane.value.angle },
    { scale: size / 400 },
  ])
  const planeOpacity = useDerivedValue(() => (plane.value.visible ? 1 : 0))

  const ret = r * 0.09
  const reticlePath = useMemo(() => {
    const path = Skia.PathBuilder.Make()
    path.addCircle(c, c, ret)
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      path.moveTo(c + dx * (ret + 6), c + dy * (ret + 6))
      path.lineTo(c + dx * (ret + 14), c + dy * (ret + 14))
    }
    const snapshot = path.build()
    path.dispose()
    return snapshot
  }, [c, ret])
  const reticleColor = useDerivedValue(() => (state.value.phase === 'found' ? accentColor : reticleInk))

  // The +100 burst
  const burstRadius = useDerivedValue(() => ret + (1 - state.value.burst) * r * 0.55)
  const burstOpacity = useDerivedValue(() => state.value.burst)
  const burstTextOpacity = useDerivedValue(() => (state.value.scored ? state.value.burst : 0))
  const burstTextY = useDerivedValue(() => c - ret - 12 - (1 - state.value.burst) * 20)
  const burstTextX = burstFont ? c - burstFont.getTextWidth('+100') / 2 : c

  const cityName = t(`globe.city.${CITIES[target].key}`)

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <GestureDetector gesture={pan}>
          <View accessible accessibilityRole="image" accessibilityLabel={t('globe.label', { city: cityName })} style={{ width: size, height: size }}>
            <Canvas style={{ width: size, height: size }}>
              <Rect x={0} y={0} width={size} height={size}>
                <RadialGradient
                  c={vec(c, c)}
                  r={r * 1.22}
                  colors={[`${GLOW[scheme]}${GLOW_ALPHA[scheme]})`, `${GLOW[scheme]}${GLOW_ALPHA[scheme]})`, `${GLOW[scheme]}0)`]}
                  positions={[0, 0.95 / 1.22, 1]}
                />
              </Rect>
              <Circle cx={c} cy={c} r={r}>
                <TwoPointConicalGradient start={vec(c - r * 0.35, c - r * 0.4)} startR={r * 0.1} end={vec(c, c)} endR={r * 1.05} colors={[look.ocean, look.oceanDeep]} />
              </Circle>
              {!texturedLand && <Path path={graticulePath} style="stroke" strokeWidth={0.6} color={look.graticule} />}
              {texturedLand && LAND_EFFECT ? (
                <Circle cx={c} cy={c} r={r}>
                  <Shader source={LAND_EFFECT} uniforms={landUniforms}>
                    <ImageShader image={landImage!} tx="repeat" ty="clamp" />
                  </Shader>
                </Circle>
              ) : (
                <>
                  <Path path={landPath} color={look.land} />
                  <Path path={landPath} style="stroke" strokeWidth={0.7} color={look.landEdge} />
                </>
              )}
              <Circle cx={c} cy={c} r={r} style="stroke" strokeWidth={1.2} color={colors.borderStrong} />
              <Path path={accentPath} style="stroke" strokeWidth={1.8} strokeCap="round" color={colors.accent}>
                {!reduced && <DashPathEffect intervals={[5, 5]} phase={dashPhase} />}
              </Path>
              <Path path={accent2Path} style="stroke" strokeWidth={1.8} strokeCap="round" color={colors.accent2}>
                {!reduced && <DashPathEffect intervals={[5, 5]} phase={dashPhase} />}
              </Path>
              {CITIES.map((city, index) => (
                <CityMark key={city.code} index={index} scene={scene} font={codeFont} reduced={reduced} ink={ink} />
              ))}
              {!reduced && (
                <Group transform={planeTransform} opacity={planeOpacity}>
                  <Path path={PLANE} color={colors.gold} />
                </Group>
              )}
              {/* The halo keeps the crosshair readable over land of any color */}
              <Path path={reticlePath} style="stroke" strokeWidth={4} color={look.reticleHalo} />
              <Path path={reticlePath} style="stroke" strokeWidth={1.6} color={reticleColor} />
              {!reduced && Array.from({ length: PARTY_PIECES }, (_, index) => <Confetti key={index} index={index} progress={partyProgress} c={c} r={r} />)}
              {!reduced && (
                <>
                  <Circle cx={c} cy={c} r={burstRadius} style="stroke" strokeWidth={3} color={colors.accent} opacity={burstOpacity} />
                  {burstFont && <SkiaText x={burstTextX} y={burstTextY} text="+100" font={burstFont} color={colors.accent} opacity={burstTextOpacity} />}
                </>
              )}
            </Canvas>
          </View>
        </GestureDetector>
        <GlobeSkinPicker uid={uid} level={level} secret={secret} choice={choice} onChoose={chooseSkin} />
        {banner && (
          <Animated.View entering={FadeIn} exiting={FadeOut} accessibilityLiveRegion="polite" style={styles.banner}>
            <Text style={styles.bannerTitle}>{t('globe.easter_title')}</Text>
            <Text style={styles.bannerBody}>{t('globe.easter_body', { score: EASTER_EGG_SCORE })}</Text>
          </Animated.View>
        )}
        {overlay && (
          <View style={[styles.overlay, { bottom: size * 0.06 }]}>
            {overlay}
          </View>
        )}
      </View>
      <View accessibilityLiveRegion="polite" style={[styles.chip, found && styles.chipFound]}>
        <Text style={[styles.chipText, found && styles.chipTextFound, styles.chipCity]} numberOfLines={1}>
          {found ? `✓ ${t('globe.found', { city: cityName })}` : t('globe.find', { city: cityName })}
        </Text>
        {score > 0 && (
          // The player's globe score lives in the chip: three cells in the board strip do not fit a 360 px phone
          <Text style={[styles.chipScore, found && styles.chipTextFound]} numberOfLines={1}>
            {`${t('home.globe_score')} ${score}`}
          </Text>
        )}
      </View>
      <Text style={styles.hint}>{touched ? t('globe.hint_center') : t('globe.hint_drag')}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  wrap: { alignItems: 'center', gap: space.sm },
  banner: {
    position: 'absolute',
    top: space.sm,
    left: 0,
    right: 44,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    pointerEvents: 'none',
  },
  bannerTitle: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.text, textAlign: 'center' },
  bannerBody: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'box-none' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipFound: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.text },
  chipCity: { flexShrink: 1 },
  chipScore: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold },
  chipTextFound: { color: colors.onAccent },
  hint: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
}))
