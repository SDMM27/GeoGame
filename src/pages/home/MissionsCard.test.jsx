// The missions card: rewards by tier on the weekly rows, XP only on the daily ones, the bonus with its count.
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import MissionsCard from './MissionsCard'

const mockUseMissions = vi.fn()
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key) }),
}))
vi.mock('../../auth', () => ({ useAccount: () => ({ account: { uid: 'u1' } }) }))
vi.mock('../../hooks/useMissions', () => ({ useMissions: (uid) => mockUseMissions(uid) }))
vi.mock('../../components/profile/LevelBadge', () => ({ LevelChip: () => null, XpBar: () => null }))

const entry = (id, target, tier) => ({ mission: { id, emoji: '🎮', target, tier }, progress: 0, done: false, paid: false })

afterEach(cleanup)

describe('MissionsCard', () => {
  it('pays XP only for the daily missions, and XP plus fragments by tier for the weekly ones', () => {
    mockUseMissions.mockReturnValue({
      loading: false,
      xp: { level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 3)],
      weekly: [entry('week_a', 5, 'easy'), entry('week_b', 5, 'hard')],
      dailyBonus: false,
      weeklyBonus: false,
    })
    const { container } = render(
      <MemoryRouter>
        <MissionsCard />
      </MemoryRouter>
    )
    const [daily, weekly] = [...container.querySelectorAll('.missions-group')]
    // Daily: 60 XP per mission, 40 XP bonus, no fragment chip at all
    expect(daily.textContent).toContain('missions.reward {"xp":60}')
    expect(daily.textContent).toContain('missions.reward {"xp":40}')
    expect(daily.querySelector('.mission-fragments')).toBeNull()
    expect(daily.textContent).toContain('missions.bonus {"count":3}')
    // Weekly: easy 150 XP + 1, hard 400 XP + 3, bonus 250 XP + 2
    const rows = [...weekly.querySelectorAll('.mission-row')].map((row) => row.textContent)
    expect(rows[0]).toContain('missions.tier_easy')
    expect(rows[0]).toContain('missions.reward {"xp":150}missions.fragments {"count":1}')
    expect(rows[1]).toContain('missions.tier_hard')
    expect(rows[1]).toContain('missions.reward {"xp":400}missions.fragments {"count":3}')
    expect(weekly.querySelector('.missions-bonus').textContent).toContain('missions.bonus {"count":5}')
    expect(weekly.querySelector('.missions-bonus').textContent).toContain('missions.reward {"xp":250}missions.fragments {"count":2}')
  })
})
