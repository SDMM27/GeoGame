// The flag rewards: the unlock overlay (new flag and replay), the fragment card and the XP toast fallback.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FlagUnlockOverlay from './FlagUnlockOverlay'
import FragmentToast from './FragmentToast'
import XpToast from '../XpToast'
import { replayFlag } from './replay'

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
    expect(screen.queryByText('collection.tap_to_continue')).toBeNull()
    settle()
    expect(screen.getByText('collection.view_collection')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByText('collection.tap_to_continue'))
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('plays several flags one after another and closes on Escape', () => {
    overlay()
    claim({ unlockedFlags: ['AA', 'BB'], demoFlags })
    expect(screen.getByRole('heading', { name: 'name-AA' })).toBeTruthy()
    expect(screen.getByText(/collection\.progress/).textContent).toContain('"count":1')
    settle()
    fireEvent.keyDown(window, { key: 'Escape' })
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
  })
})
