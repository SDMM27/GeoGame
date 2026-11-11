import { act, create } from 'react-test-renderer'

import { MissionsCard } from './MissionsCard'

const mockUseMissions = jest.fn()
// ui.tsx pulls reanimated (native worklets): plain React Native stand-ins are enough here
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Pill: ({ label }: { label: string }) => <Text>{label}</Text> }
})
// Reanimated and worklets need native code (the title of the card reads useReducedMotion): their jest mocks
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
// The icon font loads asynchronously and updates state outside act
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
// Wednesday 15 July 2026, 12:00 in Paris: 12 h before midnight, 4 days and a half before Monday
jest.mock('@shared/utils/serverTime', () => ({ serverNow: () => Date.UTC(2026, 6, 15, 10, 0) }))
// Echo the key and its params, so the test reads what the card asks for
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key) }),
}))

const entry = (id: string, progress: number, target: number, paid = false, tier?: 'easy' | 'medium' | 'hard') => ({
  mission: { id, icon: 'flag', target, tier },
  progress,
  done: progress >= target,
  paid,
})

const texts = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const tabs = (tree: ReturnType<typeof create>) =>
  tree.root.findAll((node) => typeof node.type !== 'string' && node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function')
const XP = { total: 130, level: 2, into: 30, needed: 150 }

const mount = (missions: unknown, uid: string | null = 'u1') => {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(<MissionsCard uid={uid} missions={missions as never} />)
  })
  return tree
}

describe('MissionsCard', () => {
  beforeEach(() => mockUseMissions.mockReset())

  it('invites a visitor to sign in', () => {
    const tree = mount({ loading: false, xp: null, daily: [], weekly: [] }, null)
    expect(texts(tree)).toContain('missions.sign_in')
    expect(tabs(tree)).toHaveLength(0)
  })

  it('shows the dailies played and the streak on one line, without the fragment tiers', () => {
    const tree = mount({
      loading: false,
      xp: XP,
      daily: [entry('play_3', 0, 3)],
      weekly: [],
      dailyBonus: false,
      weeklyBonus: false,
      dailies: { total: 6, played: 4, won: 2, tiers: [{ id: 'dailies_all', fragments: 1, done: false, paid: false }] },
      streak: { count: 3, next: { count: 7, fragments: 2 } },
    })
    const out = texts(tree)
    expect(out).toContain('missions.dailies_short {\\"played\\":4,\\"total\\":6}')
    expect(out).toContain('missions.streak_short {\\"count\\":3}')
    expect(out).not.toContain('missions.dailies_all')
    expect(out).not.toContain('missions.streak_next')
  })

  it('has a tab for the day (selected) and one for the week, with their counts and the time left, and no fold or help line', () => {
    const tree = mount({
      loading: false,
      xp: XP,
      daily: [entry('play_3', 3, 3, true), entry('play_5', 0, 5), entry('flags_20', 0, 20)],
      weekly: [entry('week_a', 0, 5, false, 'easy')],
      dailyBonus: false,
      weeklyBonus: false,
    })
    const [today, week] = tabs(tree)
    expect(today.props.accessibilityState).toEqual({ selected: true })
    expect(week.props.accessibilityState).toEqual({ selected: false })
    const out = texts(tree)
    expect(out).toContain('missions.tab_today')
    expect(out).toContain('1/3')
    expect(out).toContain('0/1')
    expect(out).toContain('missions.resets_hours {\\"count\\":12}')
    expect(out).toContain('missions.resets_days {\\"count\\":5}')
    expect(out).toContain('missions.play_5')
    expect(out).not.toContain('missions.week_a')
    expect(out).not.toContain('missions.details')
    expect(out).not.toContain('missions.summary')
    expect(out).not.toContain('missions.per_game')
    expect(out).not.toContain('missions.resets_daily')
    expect(out).not.toContain('missions.resets_weekly')
    expect(out).not.toContain('missions.sign_in')
  })

  it('pays XP only for the daily missions, then XP plus fragments by tier on the week tab, with the bonus line', () => {
    const tree = mount({
      loading: false,
      xp: XP,
      daily: [entry('play_3', 0, 3)],
      weekly: [entry('week_a', 0, 5, false, 'easy'), entry('week_b', 0, 5, false, 'hard')],
      dailyBonus: false,
      weeklyBonus: false,
    })
    let out = texts(tree)
    expect(out).toContain('missions.reward {\\"xp\\":60}')
    expect(out).toContain('missions.reward {\\"xp\\":40}')
    expect(out).toContain('missions.bonus {\\"count\\":3}')
    expect(out).not.toContain('◆')
    act(() => tabs(tree)[1].props.onPress())
    expect(tabs(tree)[1].props.accessibilityState).toEqual({ selected: true })
    out = texts(tree)
    expect(out).toContain('missions.week_b')
    expect(out).not.toContain('missions.play_3')
    expect(out).toContain('missions.reward {\\"xp\\":150} · 1 ◆')
    expect(out).toContain('missions.reward {\\"xp\\":400} · 3 ◆')
    expect(out).toContain('missions.reward {\\"xp\\":250} · 2 ◆')
    expect(out).toContain('missions.bonus {\\"count\\":5}')
    // The difficulty is not shown: the reward already tells the missions apart
    expect(out).not.toContain('missions.tier_')
  })
})
