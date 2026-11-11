// The missions card: level, the dailies and streak on one line, a tab for the day and one for the week with their
// rewards (XP only for the daily missions, XP plus fragments by tier for the weekly ones) and the bonus line.
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MissionsCard from './MissionsCard'

const mockAccount = vi.hoisted(() => ({ current: { uid: 'u1' } }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key) }),
}))
vi.mock('../../auth', () => ({ useAccount: () => ({ account: mockAccount.current }) }))
vi.mock('../../components/profile/LevelBadge', () => ({ LevelChip: () => null, XpBar: () => null }))
// Wednesday 15 July 2026, 12:00 in Paris: 12 h before midnight, 4 days and a half before Monday
vi.mock('../../utils/serverTime', () => ({ serverNow: () => Date.UTC(2026, 6, 15, 10, 0) }))

const entry = (id, target, tier, done = false) => ({ mission: { id, emoji: '🎮', target, tier }, progress: done ? target : 0, done, paid: false })

afterEach(() => {
  cleanup()
  mockAccount.current = { uid: 'u1' }
})

const render_ = (missions) => {
  const value = { loading: false, xp: { level: 2, into: 30, needed: 150 }, daily: [], weekly: [], ...missions }
  return render(
    <MemoryRouter>
      <MissionsCard missions={value} />
    </MemoryRouter>
  )
}

describe('MissionsCard', () => {
  it('invites a visitor to sign in', () => {
    mockAccount.current = null
    render_({ xp: null })
    expect(screen.getByText('missions.sign_in')).toBeTruthy()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('shows the dailies played and the streak on one line, without the fragment tiers', () => {
    const { container } = render_({
      dailies: { total: 6, played: 2, won: 1, tiers: [{ id: 'dailies_all', fragments: 1, done: false, paid: false }] },
      streak: { count: 3, next: { count: 7, fragments: 2 } },
    })
    const line = container.querySelector('.missions-summary')
    expect(line.textContent).toContain('missions.dailies_short {"played":2,"total":6}')
    expect(line.textContent).toContain('missions.streak_short {"count":3}')
    expect(container.querySelector('.missions-dailies-tier')).toBeNull()
    expect(container.textContent).not.toContain('missions.streak_next')
  })

  it('shows nothing for the dailies and the streak before they load', () => {
    const { container } = render_({ dailies: null, streak: null })
    expect(container.querySelector('.missions-summary')).toBeNull()
  })

  it('has a tab for the day and one for the week, with their counts and the time left, and no fold or help line', () => {
    const { container } = render_({ daily: [entry('play_3', 3, undefined, true), entry('play_5', 5), entry('flags_20', 20)], weekly: [entry('week_a', 5, 'easy')] })
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'missions.tab_today 1/3missions.resets_hours {"count":12}',
      'missions.tab_week 0/1missions.resets_days {"count":5}',
    ])
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false'])
    expect(screen.getByText('missions.play_5 {"count":5}')).toBeTruthy()
    expect(screen.queryByText(/week_a/)).toBeNull()
    expect(container.querySelector('.collapsible-head')).toBeNull()
    expect(container.textContent).not.toContain('missions.details')
    expect(container.textContent).not.toContain('missions.per_game')
    expect(container.textContent).not.toContain('missions.resets_daily')
    expect(container.textContent).not.toContain('missions.resets_weekly')
  })

  it('pays XP only for the daily missions, then XP plus fragments by tier on the week tab, with the bonus line', () => {
    const { container } = render_({
      daily: [entry('play_3', 3)],
      weekly: [entry('week_a', 5, 'easy'), entry('week_b', 5, 'hard')],
      dailyBonus: false,
      weeklyBonus: true,
    })
    expect(container.querySelector('.mission-row .mission-reward').textContent).toBe('missions.reward {"xp":60}')
    expect(container.querySelector('.missions-bonus').textContent).toContain('missions.bonus {"count":3}')
    expect(container.querySelector('.missions-bonus').textContent).toContain('missions.reward {"xp":40}')
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true'])
    const rewards = [...container.querySelectorAll('.mission-row .mission-reward')].map((node) => node.textContent)
    expect(rewards).toEqual(['missions.reward {"xp":150} · 1 ◆', 'missions.reward {"xp":400} · 3 ◆'])
    const bonus = container.querySelector('.missions-bonus')
    expect(bonus.textContent).toContain('missions.bonus {"count":5}')
    expect(bonus.textContent).toContain('missions.reward {"xp":250} · 2 ◆')
    expect(bonus.classList.contains('missions-bonus--done')).toBe(true)
    // The difficulty is not shown: the reward already tells the missions apart
    expect(container.textContent).not.toContain('missions.tier_')
  })
})
