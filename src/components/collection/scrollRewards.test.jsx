// The scroll rewards: the unlock overlay (sealed scroll, tap the seal, link to the sheet) and the seal toast.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import ScrollUnlockOverlay from './ScrollUnlockOverlay'
import FlagUnlockOverlay from './FlagUnlockOverlay'
import SealToast from './SealToast'
import { SCROLLS } from '../../data/scrolls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}))
vi.mock('../../auth', () => ({ useAccount: () => ({ account: { uid: 'u1' } }) }))
vi.mock('../../utils/getCountryName', () => ({ getCountryName: (iso) => `name-${iso}` }))
vi.mock('../../utils/flagCollectionData', () => ({ FLAG_POOL: [{ iso: 'AA', rarity: 'common' }] }))
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
vi.mock('../../utils/publicProfile', () => ({ cachedPublicData: () => null, fetchPublicData: vi.fn(), onPublicDataPatched: () => () => {} }))

const { emit } = await import('../../utils/xp')

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const claim = (data) => act(() => emit({ gained: 0, levelUp: false, level: 1, ...data }))
const settle = () => act(() => vi.advanceTimersByTime(5000))
const Where = () => <output data-testid="where">{useLocation().pathname + useLocation().search}</output>
const demo = { unlocked: ['continents-1858', 'rome-395'], seals: 0 }

describe('ScrollUnlockOverlay', () => {
  it('shows the sealed scroll, opens it with the seal and links to the sheet', () => {
    render(<MemoryRouter><ScrollUnlockOverlay /><Where /></MemoryRouter>)
    expect(screen.queryByRole('dialog')).toBeNull()
    claim({ unlockedScrolls: ['rome-395'], scrolls: demo })
    expect(screen.getByRole('dialog')).toBeTruthy()
    // Sealed: the title is not revealed yet
    expect(screen.getByText('scrolls.new_scroll')).toBeTruthy()
    expect(screen.getByText('scrolls.tap_seal')).toBeTruthy()
    expect(document.body.textContent).not.toContain('scrolls.title_rome-395')
    expect(screen.queryByText('scrolls.view_scroll')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.open_seal' }))
    expect(screen.getByRole('heading', { name: 'scrolls.title_rome-395' })).toBeTruthy()
    expect(screen.getByText(/scrolls\.progress/).textContent).toContain(`"count":2,"total":${SCROLLS.length}`)
    expect(document.querySelector('.scroll-reveal-map').getAttribute('src')).toBe('/scrolls/rome-395/thumb.webp')
    fireEvent.click(screen.getByText('scrolls.view_scroll'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('where').textContent).toBe('/parchments?scroll=rome-395')
  })

  it('closes on continue without going anywhere, and plays several scrolls one after another', () => {
    render(<MemoryRouter><ScrollUnlockOverlay /><Where /></MemoryRouter>)
    claim({ unlockedScrolls: ['continents-1858', 'rome-395'], scrolls: demo })
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.open_seal' }))
    expect(screen.getByRole('heading', { name: 'scrolls.title_continents-1858' })).toBeTruthy()
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText('scrolls.tap_seal')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.open_seal' }))
    expect(screen.getByRole('heading', { name: 'scrolls.title_rome-395' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('where').textContent).toBe('/')
  })

  it('shows a placeholder, not a broken image, when the map is missing', () => {
    render(<MemoryRouter><ScrollUnlockOverlay /></MemoryRouter>)
    claim({ unlockedScrolls: ['rome-395'], scrolls: demo })
    fireEvent.error(document.querySelector('.scroll-reveal-map'))
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByTestId('scroll-placeholder')).toBeTruthy()
  })

  it('ignores a claim without scrolls and unknown scrolls', () => {
    render(<MemoryRouter><ScrollUnlockOverlay /></MemoryRouter>)
    claim({ seals: 1 })
    claim({ unlockedScrolls: ['not-a-scroll'] })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('waits for the flag overlay when the same claim unlocks flags', () => {
    render(<MemoryRouter><FlagUnlockOverlay /><ScrollUnlockOverlay /></MemoryRouter>)
    claim({ unlockedFlags: ['AA'], unlockedScrolls: ['rome-395'], scrolls: demo, demoFlags: { unlocked: ['AA'], current: null, pieces: 0 } })
    expect(screen.getByRole('heading', { name: 'name-AA' })).toBeTruthy()
    expect(screen.queryByText('scrolls.new_scroll')).toBeNull()
    settle()
    fireEvent.click(screen.getByText('collection.tap_to_continue'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByRole('heading', { name: 'name-AA' })).toBeNull()
    expect(screen.getByText('scrolls.new_scroll')).toBeTruthy()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})

describe('SealToast', () => {
  it('shows the seals won and the progress toward the next scroll', () => {
    render(<SealToast />)
    claim({ seals: 1, scrolls: { unlocked: ['continents-1858'], seals: 1 } })
    expect(screen.getByRole('status').textContent).toBe('scrolls.seal_gain {"count":1,"progress":1,"total":2}')
    act(() => vi.advanceTimersByTime(3300))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('counts the seals that just opened a scroll as full', () => {
    render(<SealToast />)
    claim({ seals: 1, unlockedScrolls: ['rome-395'], scrolls: { unlocked: ['continents-1858', 'rome-395'], seals: 0 } })
    expect(screen.getByRole('status').textContent).toContain('"count":1,"progress":2,"total":2')
  })

  it('still shows the count when the account is not known, and nothing without seals', () => {
    render(<SealToast />)
    claim({ seals: 0 })
    expect(screen.queryByRole('status')).toBeNull()
    claim({ seals: 1 })
    expect(screen.getByRole('status').textContent).toContain('"count":1,"progress":1,"total":2')
  })
})
