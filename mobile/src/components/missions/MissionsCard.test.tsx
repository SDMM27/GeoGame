import { act, create } from 'react-test-renderer'

import { MissionsCard } from './MissionsCard'

const mockUseMissions = jest.fn()
jest.mock('@shared/hooks/useMissions', () => ({ useMissions: (uid: unknown) => mockUseMissions(uid) }))
// ui.tsx pulls reanimated (native worklets): plain React Native stand-ins are enough here
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Pill: ({ label }: { label: string }) => <Text>{label}</Text> }
})
// The icon font loads asynchronously and updates state outside act
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
// Echo the key and its params, so the test reads what the card asks for
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key) }),
}))

const entry = (id: string, progress: number, target: number, paid = false) => ({
  mission: { id, icon: 'flag', target },
  progress,
  done: progress >= target,
  paid,
})

const texts = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())

describe('MissionsCard', () => {
  beforeEach(() => mockUseMissions.mockReset())

  it('invites a visitor to sign in', () => {
    mockUseMissions.mockReturnValue({ loading: false, xp: null, daily: [], weekly: [] })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid={null} />)
    })
    expect(texts(tree)).toContain('missions.sign_in')
    expect(texts(tree)).not.toContain('missions.daily')
  })

  it('shows the level, both lists and the bonuses of a signed-in player', () => {
    mockUseMissions.mockReturnValue({
      loading: false,
      xp: { total: 130, level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 3, 3, true), entry('score_1', 1, 2)],
      weekly: [entry('week_a', 0, 5)],
      dailyBonus: false,
      weeklyBonus: true,
    })
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<MissionsCard uid="u1" />)
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
})
