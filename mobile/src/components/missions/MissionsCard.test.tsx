import { act, create } from 'react-test-renderer'

import { MissionsCard } from './MissionsCard'

const mockUseMissions = jest.fn()
// ui.tsx pulls reanimated (native worklets): plain React Native stand-ins are enough here
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Pill: ({ label }: { label: string }) => <Text>{label}</Text> }
})
// Reanimated and worklets need native code: their jest mocks (no useReducedMotion needed here)
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
// The icon font loads asynchronously and updates state outside act
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
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
const header = (tree: ReturnType<typeof create>) =>
  tree.root.findAll((node) => typeof node.type !== 'string' && node.props.accessibilityState && typeof node.props.onPress === 'function')[0]

describe('MissionsCard', () => {
  beforeEach(() => mockUseMissions.mockReset())

  it('invites a visitor to sign in', () => {
    mockUseMissions.mockReturnValue({ loading: false, xp: null, daily: [], weekly: [] })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid={null} missions={mockUseMissions(null)} />)
    })
    expect(texts(tree)).toContain('missions.sign_in')
    expect(texts(tree)).not.toContain('missions.daily')
  })

  it('shows the level, both lists and the bonuses of a signed-in player', () => {
    mockUseMissions.mockReturnValue({
      loading: false,
      xp: { total: 130, level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 3, 3, true), entry('score_1', 1, 2)],
      weekly: [entry('week_a', 0, 5, false, 'easy'), entry('week_b', 0, 5, false, 'hard')],
      dailyBonus: false,
      weeklyBonus: true,
    })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid="u1" missions={mockUseMissions('u1')} />)
    })
    const out = texts(tree)
    expect(out).toContain('level.label')
    expect(out).toContain('missions.daily')
    expect(out).toContain('missions.weekly')
    expect(out).toContain('missions.play_3')
    expect(out).toContain('missions.week_a')
    expect(out).toContain('missions.bonus')
    expect(out).not.toContain('missions.sign_in')
  })

  it("shows today's dailies with the fragments of the tiers, and the streak", () => {
    mockUseMissions.mockReturnValue({
      loading: false,
      xp: { total: 130, level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 0, 3)],
      weekly: [],
      dailyBonus: false,
      weeklyBonus: false,
      dailies: {
        total: 6,
        played: 4,
        won: 2,
        tiers: [
          { id: 'dailies_all', fragments: 1, done: false, paid: false },
          { id: 'dailies_won_3', fragments: 1, done: false, paid: false },
          { id: 'dailies_won_all', fragments: 1, done: false, paid: false },
        ],
      },
      streak: { count: 5, next: { count: 7, fragments: 2 } },
    })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid="u1" missions={mockUseMissions('u1')} />)
    })
    const out = texts(tree)
    expect(out).toContain('missions.dailies_played {\\"played\\":4,\\"total\\":6}')
    expect(out).toContain('missions.dailies_won {\\"won\\":2,\\"total\\":6}')
    expect(out).toContain('missions.dailies_won_3')
    expect(out).toContain('missions.streak_days {\\"count\\":5}')
    expect(out).toContain('missions.streak_next {\\"day\\":7}')
  })

  it('folds the lists once every daily mission is done, keeping the summary, and opens them on press', () => {
    mockUseMissions.mockReturnValue({
      loading: false,
      xp: { total: 130, level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 3, 3, true)],
      weekly: [entry('week_a', 5, 5, true, 'easy'), entry('week_b', 0, 5, false, 'hard')],
      dailyBonus: true,
      weeklyBonus: false,
    })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid="u1" missions={mockUseMissions('u1')} />)
    })
    expect(header(tree).props.accessibilityState).toEqual({ expanded: false })
    expect(texts(tree)).toContain('missions.summary {\\"daily\\":1,\\"dailyTotal\\":1,\\"weekly\\":1,\\"weeklyTotal\\":2}')
    expect(texts(tree)).not.toContain('missions.play_3')
    act(() => header(tree).props.onPress())
    expect(texts(tree)).toContain('missions.play_3')
    expect(texts(tree)).toContain('missions.week_b')
  })

  it('stays open while a daily mission is left, and keeps what the player chose on the next render', () => {
    const missions = {
      loading: false,
      xp: { total: 130, level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 0, 3)],
      weekly: [],
      dailyBonus: false,
      weeklyBonus: false,
    }
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid="u1" missions={missions} />)
    })
    expect(texts(tree)).toContain('missions.play_3')
    act(() => header(tree).props.onPress())
    expect(texts(tree)).not.toContain('missions.play_3')
    act(() => tree.unmount())
    act(() => {
      tree = create(<MissionsCard uid="u1" missions={missions} />)
    })
    expect(texts(tree)).not.toContain('missions.play_3')
  })

  it('pays XP only for the daily missions, and XP plus fragments by tier for the weekly ones', () => {
    mockUseMissions.mockReturnValue({
      loading: false,
      xp: { total: 130, level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 0, 3)],
      weekly: [entry('week_a', 0, 5, false, 'easy'), entry('week_b', 0, 5, false, 'hard')],
      dailyBonus: false,
      weeklyBonus: false,
    })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid="u1" missions={mockUseMissions('u1')} />)
    })
    const out = texts(tree)
    // Daily: 60 XP, bonus 40 XP, never a fragment chip
    expect(out).toContain('missions.reward {\\"xp\\":60}')
    expect(out).toContain('missions.reward {\\"xp\\":40}')
    // Weekly: easy 150 XP + 1 fragment, hard 400 XP + 3 fragments, bonus 250 XP + 2 fragments
    expect(out).toContain('missions.reward {\\"xp\\":150} · missions.fragments {\\"count\\":1}')
    expect(out).toContain('missions.reward {\\"xp\\":400} · missions.fragments {\\"count\\":3}')
    expect(out).toContain('missions.reward {\\"xp\\":250} · missions.fragments {\\"count\\":2}')
    expect(out).not.toContain('{\\"count\\":0}')
    expect(out).toContain('missions.tier_easy')
    expect(out).toContain('missions.tier_hard')
    // Bonus labels: 3 daily missions, 5 weekly ones
    expect(out).toContain('missions.bonus {\\"count\\":3}')
    expect(out).toContain('missions.bonus {\\"count\\":5}')
  })
})
