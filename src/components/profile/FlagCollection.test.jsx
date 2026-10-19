// The flag collection card: masked pieces of the current flag, empty and complete states, sorting, show all.
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FlagCollectionView } from './FlagCollection'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}))
vi.mock('../../utils/getCountryName', () => ({ getCountryName: (iso) => `name-${iso}` }))
vi.mock('../../utils/flagCollectionData', () => {
  const rarities = ['common', 'uncommon', 'rare', 'legendary']
  const FLAG_POOL = Array.from({ length: 40 }, (_, index) => ({ iso: `F${String(index).padStart(2, '0')}`, rarity: rarities[index % 4] }))
  return { FLAG_POOL, fetchCollection: vi.fn() }
})

const mastery = {
  placement: { found: 1, total: 10 },
  flags: { found: 2, total: 20 },
  hardcore: { found: 0, total: 10 },
  found: 3,
  total: 40,
}
const view = (flags) => render(<FlagCollectionView flags={flags} mastery={mastery} />)
const grid = () => [...document.querySelectorAll('.flag-collection-item img')].map((img) => img.getAttribute('alt'))

afterEach(cleanup)

describe('FlagCollectionView', () => {
  it('shows only the pieces won of the current flag and hides its name', () => {
    view({ unlocked: [], current: 'F01', pieces: 2 })
    expect(document.querySelectorAll('.flag-piece')).toHaveLength(4)
    expect(document.querySelectorAll('.flag-piece--hidden')).toHaveLength(2)
    expect(document.querySelector('.flag-piece--0.flag-piece--hidden')).toBeNull()
    expect(document.querySelector('.flag-piece--2.flag-piece--hidden')).not.toBeNull()
    expect(screen.getByText('?')).toBeTruthy()
    expect(screen.queryByText(/name-F01/)).toBeNull()
    expect(screen.getByText(/collection\.pieces/).textContent).toContain('"count":2')
  })

  it('shows the empty message with nothing unlocked and no current flag', () => {
    view({ unlocked: [], current: null, pieces: 0 })
    expect(screen.getByText('collection.empty')).toBeTruthy()
    expect(document.querySelector('.flag-collection-grid')).toBeNull()
  })

  it('shows the complete message once every flag is unlocked', () => {
    const unlocked = Array.from({ length: 40 }, (_, index) => `F${String(index).padStart(2, '0')}`)
    view({ unlocked, current: null, pieces: 0 })
    expect(screen.getByText('collection.complete')).toBeTruthy()
    expect(screen.queryByText('collection.empty')).toBeNull()
  })

  it('lists the rarest flags first, then by name', () => {
    // F03 legendary, F02 rare, F06 rare, F01 uncommon, F00 common
    view({ unlocked: ['F00', 'F06', 'F01', 'F02', 'F03'], current: null, pieces: 0 })
    expect(grid()).toEqual(['name-F03', 'name-F02', 'name-F06', 'name-F01', 'name-F00'])
    expect(document.querySelector('.flag-collection-item').getAttribute('title')).toBe('name-F03 · collection.rarity.legendary')
  })

  it('shows the first 24 flags and all of them on demand', () => {
    const unlocked = Array.from({ length: 30 }, (_, index) => `F${String(index).padStart(2, '0')}`)
    view({ unlocked, current: null, pieces: 0 })
    expect(grid()).toHaveLength(24)
    fireEvent.click(screen.getByText('collection.show_all'))
    expect(grid()).toHaveLength(30)
    fireEvent.click(screen.getByText('collection.show_less'))
    expect(grid()).toHaveLength(24)
  })

  it('shows no toggle for 24 flags or fewer, and the legend progress per mode', () => {
    view({ unlocked: ['F00'], current: null, pieces: 0 })
    expect(screen.queryByText('collection.show_all')).toBeNull()
    expect(screen.getByText(/collection\.legend_progress/).textContent).toContain('"count":3')
    expect(screen.getByText('1 / 10')).toBeTruthy()
    expect(screen.getByText('collection.mode_hardcore')).toBeTruthy()
    expect(screen.queryByText('collection.legend_hardcore_soon')).toBeNull()
  })
})
