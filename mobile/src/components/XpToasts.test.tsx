import { act, create } from 'react-test-renderer'

import { XpToasts } from './XpToasts'

let mockListener: ((claim: unknown) => void) | null = null
jest.mock('@shared/utils/xp', () => ({
  onXpClaimed: (listener: (claim: unknown) => void) => {
    mockListener = listener
    return () => {}
  },
}))
jest.mock('@shared/utils/flagCollectionData', () => ({ FLAG_POOL: [{ iso: 'fr', rarity: 'rare' }] }))
jest.mock('@shared/utils/getCountryName', () => ({ getCountryName: () => 'France' }))
jest.mock('@/flags', () => ({ getFlag: () => 7 }))
const mockToast = { success: jest.fn() }
const mockShowFlagToast = jest.fn()
jest.mock('@/shims/react-toastify', () => ({
  toast: { success: (text: string) => mockToast.success(text) },
  showFlagToast: (...args: unknown[]) => mockShowFlagToast(...args),
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}))

describe('XpToasts', () => {
  beforeEach(() => {
    mockToast.success.mockReset()
    mockShowFlagToast.mockReset()
    act(() => {
      create(<XpToasts />)
    })
  })

  it('announces the XP, the fragments and the level', () => {
    mockListener?.({ gained: 20, levelUp: true, level: 3, fragments: 2, unlockedFlags: [] })
    expect(mockToast.success.mock.calls.map(([text]) => text)).toEqual([
      'level.gained {"xp":20}',
      'level.fragments {"count":2}',
      'level.up {"level":3}',
    ])
    expect(mockShowFlagToast).not.toHaveBeenCalled()
  })

  it('announces each unlocked flag in its rarity color, and no fragments toast for none', () => {
    mockListener?.({ gained: 0, levelUp: false, level: 1, fragments: 0, unlockedFlags: ['fr'] })
    expect(mockToast.success).not.toHaveBeenCalled()
    expect(mockShowFlagToast).toHaveBeenCalledWith('level.flag_unlocked {"name":"France","rarity":"collection.rarity.rare"}', 7, '#4A90E2')
  })
})
