// The flag rewards: the unlock overlay (new flag and replay), the fragment card and the XP toast fallback.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FlagUnlockOverlay from './FlagUnlockOverlay'
import FragmentToast from './FragmentToast'
import XpToast from '../XpToast'
import { revealLeagueFlags } from '../../utils/leagueFlagReveal'
import { replayFlag } from './replay'
import { ARCHIVE_CRACK, ARCHIVE_PACK_INTRO } from './historicalFlagSparks'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}))
vi.mock('../../auth', () => ({ useAccount: () => ({ account: { uid: 'u1' } }) }))
vi.mock('../../utils/getCountryName', () => ({ getCountryName: (iso) => `name-${iso}` }))
vi.mock('../../utils/flagCollectionData', () => ({
  FLAG_POOL: [
    { iso: 'AA', rarity: 'common' },
    { iso: 'BB', rarity: 'legendary' },
    { iso: 'CC', rarity: 'rare' },
  ],
}))
vi.mock('../../utils/xp', () => {
  const listeners = new Set()
  return {
    onXpClaimed: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit: (claim) => listeners.forEach((listener) => listener(claim)),
  }
})
vi.mock('../../utils/publicProfile', () => ({ cachedPublicData: () => null }))

const { emit } = await import('../../utils/xp')
const demoFlags = { unlocked: ['AA', 'BB'], current: 'CC', pieces: 2 }

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  localStorage.removeItem('geogame:flag-reveals:u1')
  vi.useRealTimers()
})

const overlay = () => render(<MemoryRouter><FlagUnlockOverlay /></MemoryRouter>)
const claim = (data) => act(() => emit({ gained: 0, levelUp: false, level: 1, ...data }))
const settle = () => act(() => vi.advanceTimersByTime(5000))

describe('FlagUnlockOverlay', () => {
  it('shows the name, the rarity and the progress after a claim, and closes on continue', () => {
    overlay()
    expect(screen.queryByRole('dialog')).toBeNull()
    claim({ unlockedFlags: ['BB'], demoFlags })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'name-BB' })).toBeTruthy()
    expect(screen.getByText('collection.new_flag')).toBeTruthy()
    expect(screen.getAllByText('collection.rarity.legendary').length).toBeGreaterThan(0)
    expect(screen.getByText(/collection\.progress/).textContent).toContain('"count":2,"total":3')
    expect(document.querySelector('.flag-reveal-buttons')).not.toHaveClass('flag-reveal-buttons--ready')
    settle()
    expect(screen.getByText('collection.view_collection')).toBeTruthy()
    expect(document.querySelector('.flag-reveal-buttons')).toHaveClass('flag-reveal-buttons--ready')
    expect(document.activeElement).toBe(screen.getByText('collection.tap_to_continue'))
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('plays every classic and historical flag before offering the collection shortcut', () => {
    overlay()
    claim({ unlockedFlags: ['AA', 'BB'], unlockedHistoricalFlags: ['ussr'], demoFlags })
    expect(screen.getByRole('heading', { name: 'name-AA' })).toBeTruthy()
    expect(screen.getByText(/collection\.progress/).textContent).toContain('"count":1')
    settle()
    expect(screen.queryByText('collection.view_collection')).toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('heading', { name: 'name-BB' })).toBeTruthy()
    settle()
    expect(screen.queryByText('collection.view_collection')).toBeNull()
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('heading', { name: 'collection.historical.current' })).toBeTruthy()
    expect(document.querySelector('.flag-reveal-archive-window img')).toBeNull()
    // Present in the layout from the start (so the frame never shifts), but hidden until revealed.
    expect(document.querySelector('.flag-reveal-history > div').style.visibility).toBe('hidden')
    expect(document.querySelector('.flag-reveal-buttons')).not.toHaveClass('flag-reveal-buttons--ready')
    act(() => vi.advanceTimersByTime(ARCHIVE_PACK_INTRO + ARCHIVE_CRACK))
    expect(document.querySelector('.flag-reveal-archive-window img')).toHaveAttribute('src', '/flags/historical/ussr.png')
    expect(screen.queryByRole('heading', { name: 'Soviet Union' })).toBeNull()
    settle()
    expect(screen.getByRole('heading', { name: 'Soviet Union' })).toBeTruthy()
    expect(screen.getByText('1955–1991')).toBeTruthy()
    expect(document.querySelector('.flag-reveal-history > div').style.visibility).toBe('visible')
    expect(screen.getByText(/hammer and sickle/)).toBeTruthy()
    expect(screen.getByText('collection.view_collection')).toBeTruthy()
  })

  it('keeps a new unlock received during the transition to the collection', () => {
    overlay()
    claim({ unlockedFlags: ['AA'], demoFlags })
    settle()
    fireEvent.click(screen.getByText('collection.view_collection'))
    claim({ unlockedFlags: ['BB'], demoFlags })
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('heading', { name: 'name-BB' })).toBeTruthy()
  })

  it('resumes pending unlocks after a reload without repeating completed reveals', () => {
    const { unmount } = overlay()
    act(() => revealLeagueFlags('u1', { unlocked: ['AA', 'BB'], collectionCount: 2 }))
    settle()
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    unmount()
    const reopened = overlay()
    expect(screen.getByRole('heading', { name: 'name-BB' })).toBeTruthy()
    settle()
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    reopened.unmount()
    overlay()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('skips the rest of a series immediately and keeps the queue empty after reload', () => {
    const { unmount } = overlay()
    claim({ unlockedFlags: ['AA', 'BB'], unlockedHistoricalFlags: ['ussr'], demoFlags })
    fireEvent.click(screen.getByRole('button', { name: 'collection.skip_remaining' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    unmount()
    overlay()
    expect(screen.queryByRole('dialog')).toBeNull()
    claim({ unlockedFlags: ['CC'], demoFlags })
    expect(screen.getByRole('heading', { name: 'name-CC' })).toBeTruthy()
    expect(screen.queryByText('collection.skip_remaining')).toBeNull()
  })

  it('reveals league flags for the signed-in account with the count from the weekly award', () => {
    overlay()
    const flagReveal = { unlocked: ['AA', 'BB'], collectionCount: 2 }
    act(() => revealLeagueFlags('different-account', flagReveal))
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => revealLeagueFlags('u1', flagReveal))
    expect(screen.getByRole('heading', { name: 'name-AA' })).toBeTruthy()
    expect(screen.getByText(/collection\.progress/).textContent).toContain('"count":1')
    settle()
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('heading', { name: 'name-BB' })).toBeTruthy()
  })

  it('replays a flag without the new flag title, the collection button or the progress, and ignores a replay while playing', () => {
    overlay()
    act(() => replayFlag('CC'))
    expect(screen.getByRole('heading', { name: 'name-CC' })).toBeTruthy()
    expect(screen.queryByText('collection.new_flag')).toBeNull()
    expect(screen.queryByText(/collection\.progress/)).toBeNull()
    act(() => replayFlag('AA'))
    expect(screen.getByRole('heading', { name: 'name-CC' })).toBeTruthy()
    settle()
    expect(screen.queryByText('collection.view_collection')).toBeNull()
    expect(screen.getByText('collection.tap_to_continue')).toBeTruthy()
  })

  it('replays an historical flag with its explanation and offers immediate dismissal', () => {
    overlay()
    act(() => replayFlag('ussr'))
    expect(screen.getByRole('dialog')).toHaveClass('flag-reveal--historical')
    expect(document.querySelector('.flag-reveal-archive-sparks')).toBeTruthy()
    expect(document.querySelector('.flag-reveal-history > div').style.visibility).toBe('hidden')
    expect(screen.queryByText('collection.new_flag')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'collection.historical.close_details' }))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => replayFlag('ussr'))
    settle()
    expect(screen.getByText(/hammer and sickle/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'collection.historical.source' })).toBeTruthy()
  })

  it('shows the historical explanation with no sparks in reduced motion', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) })
    try {
      overlay()
      act(() => replayFlag('ussr'))
      expect(screen.getByText(/hammer and sickle/)).toBeTruthy()
      expect(document.querySelector('.flag-reveal-archive-sparks')).toBeNull()
    } finally {
      if (original) Object.defineProperty(window, 'matchMedia', original)
      else Reflect.deleteProperty(window, 'matchMedia')
    }
  })
})

describe('FragmentToast', () => {
  it('shows the fragments won and the progress of the current flag', () => {
    render(<FragmentToast />)
    claim({ fragments: 2, demoFlags })
    expect(screen.getByText(/level\.fragments/).textContent).toContain('"count":2')
    expect(screen.getByText(/collection\.pieces/).textContent).toContain('"count":2,"total":4')
    expect(screen.getByTestId('fragment-flag').children).toHaveLength(4)
    act(() => vi.advanceTimersByTime(3300))
    expect(screen.queryByTestId('fragment-flag')).toBeNull()
  })

  it('says why the dailies and the streak paid fragments', () => {
    render(<FragmentToast />)
    claim({
      fragments: 3,
      rewards: [
        { kind: 'dailies_all', fragments: 1 },
        { kind: 'streak', fragments: 2, streak: 7 },
      ],
      demoFlags,
    })
    const text = screen.getByRole('status').textContent
    expect(text).toContain('missions.reward_line')
    expect(text).toContain('missions.reward_dailies_all')
    expect(text).toContain('missions.reward_streak {\\"days\\":7}')
    expect(text).toContain('missions.fragments {\\"count\\":2}')
  })

  it('stays out of the way when a flag is unlocked or the data is missing', () => {
    render(<FragmentToast />)
    claim({ fragments: 2, unlockedFlags: ['AA'], demoFlags })
    claim({ fragments: 2 })
    expect(screen.queryByTestId('fragment-flag')).toBeNull()
  })
})

describe('XpToast', () => {
  it('keeps the XP and the fragments line only without data for the card, and no flag line', () => {
    render(<XpToast />)
    claim({ gained: 40, fragments: 1, unlockedFlags: ['AA'], demoFlags })
    expect(screen.getByText(/level\.gained/)).toBeTruthy()
    expect(screen.queryByText(/level\.fragments/)).toBeNull()
    expect(screen.queryByText(/level\.flag_unlocked/)).toBeNull()
    claim({ gained: 10, fragments: 1 })
    expect(screen.getByText(/level\.fragments/)).toBeTruthy()
    claim({ gained: 10, fragments: 1, demoFlags })
    expect(screen.queryByText(/level\.fragments/)).toBeNull()
    // The reasons follow the fragments line
    claim({ gained: 0, fragments: 1, rewards: [{ kind: 'dailies_won_3', fragments: 1 }] })
    expect(screen.getByRole('status').textContent).toContain('missions.reward_dailies_won_3')
  })
})
