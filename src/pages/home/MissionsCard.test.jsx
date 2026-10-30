// The missions card: rewards by tier on the weekly rows, XP only on the daily ones, the bonus with its count, the dailies
// of the day with their fragments and the streak.
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MissionsCard from './MissionsCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key) }),
}))
vi.mock('../../auth', () => ({ useAccount: () => ({ account: { uid: 'u1' } }) }))
vi.mock('../../components/profile/LevelBadge', () => ({ LevelChip: () => null, XpBar: () => null }))

const entry = (id, target, tier) => ({ mission: { id, emoji: '🎮', target, tier }, progress: 0, done: false, paid: false })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const render_ = (missions) => {
  const value = { loading: false, xp: { level: 2, into: 30, needed: 150 }, daily: [], weekly: [], ...missions }
  return render(
    <MemoryRouter>
      <MissionsCard missions={value} />
    </MemoryRouter>
  )
}

describe('MissionsCard', () => {
  it("shows today's dailies played and won with the fragments of the 3 tiers, and the streak", () => {
    const tier = (id, done, paid = false) => ({ id, fragments: 1, done, paid })
    const { container } = render_({
      dailies: { total: 6, played: 6, won: 3, tiers: [tier('dailies_all', true, true), tier('dailies_won_3', true), tier('dailies_won_all', false)] },
      streak: { count: 5, next: { count: 7, fragments: 2 } },
    })
    const row = container.querySelector('.missions-dailies')
    expect(row.textContent).toContain('missions.dailies_played {"played":6,"total":6}')
    expect(row.textContent).toContain('missions.dailies_won {"won":3,"total":6}')
    const tiers = [...row.querySelectorAll('.missions-dailies-tier')]
    expect(tiers.map((li) => li.textContent)).toEqual([
      '✓ missions.dailies_allmissions.fragments {"count":1}',
      '✓ missions.dailies_won_3missions.fragments {"count":1}',
      'missions.dailies_won_allmissions.fragments {"count":1}',
    ])
    expect(tiers.map((li) => li.classList.contains('missions-dailies-tier--done'))).toEqual([true, true, false])
    expect(row.querySelector('.missions-streak').textContent).toContain('missions.streak_days {"count":5}')
    expect(row.querySelector('.missions-streak').textContent).toContain('missions.streak_next {"day":7} · missions.fragments {"count":2}')
  })

  it('invites to start a streak when there is none, and shows nothing for the dailies before they load', () => {
    const { container, rerender } = render_({
      dailies: { total: 6, played: 0, won: 0, tiers: [] },
      streak: { count: 0, next: { count: 7, fragments: 2 } },
    })
    expect(container.querySelector('.missions-streak').textContent).toContain('missions.streak_none')
    rerender(
      <MemoryRouter>
        <MissionsCard missions={{ loading: true, xp: null, daily: [], weekly: [], dailies: null, streak: null }} />
      </MemoryRouter>
    )
    expect(container.querySelector('.missions-dailies')).toBeNull()
  })

  it('folds the lists once every daily mission is done, keeping the summary', () => {
    const done = { ...entry('play_3', 3), done: true }
    const { container } = render_({ daily: [done], weekly: [{ ...entry('week_a', 5, 'easy'), done: true }, entry('week_b', 5, 'hard')] })
    const toggle = screen.getByRole('button', { name: 'missions.details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('missions.summary {"daily":1,"dailyTotal":1,"weekly":1,"weeklyTotal":2}')).toBeTruthy()
    expect(container.querySelector('.missions-group')).toBeNull()
    fireEvent.click(toggle)
    expect(container.querySelectorAll('.missions-group')).toHaveLength(2)
  })

  it('stays open while a daily mission is left, and a choice of the player wins over that default', () => {
    const { container, unmount } = render_({ daily: [entry('play_3', 0, 3)], weekly: [] })
    expect(container.querySelectorAll('.missions-group')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'missions.details' }))
    expect(container.querySelector('.missions-group')).toBeNull()
    unmount()
    const again = render_({ daily: [entry('play_3', 0, 3)], weekly: [] })
    expect(again.container.querySelector('.missions-group')).toBeNull()
  })

  it('pays XP only for the daily missions, and XP plus fragments by tier for the weekly ones', () => {
    const missions = {
      loading: false,
      xp: { level: 2, into: 30, needed: 150 },
      daily: [entry('play_3', 3)],
      weekly: [entry('week_a', 5, 'easy'), entry('week_b', 5, 'hard')],
      dailyBonus: false,
      weeklyBonus: false,
    }
    const { container } = render(
      <MemoryRouter>
        <MissionsCard missions={missions} />
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
