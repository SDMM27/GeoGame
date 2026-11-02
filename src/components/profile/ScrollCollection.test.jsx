// The scroll collection in the profile: the whole section on your own, only the count on another player's.
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ScrollCollectionView } from './ScrollCollection'
import { SCROLLS } from '../../data/scrolls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}))
vi.mock('../../utils/publicProfile', () => ({
  cachedPublicData: () => null,
  fetchPublicData: vi.fn(),
  onPublicDataPatched: () => () => {},
}))

afterEach(cleanup)

const view = (props) => render(<MemoryRouter><ScrollCollectionView {...props} /></MemoryRouter>)
const owned = { unlocked: ['continents-1858', 'turin-papyrus'], seals: 1 }

describe('ScrollCollectionView', () => {
  it('shows the count, the seals and the link to the collection on your own profile', () => {
    view({ scrolls: owned, own: true })
    expect(screen.getByText(/scrolls\.progress/).textContent).toContain(`"count":2,"total":${SCROLLS.length}`)
    expect(screen.getByText(/scrolls\.seals/).textContent).toContain('"count":1,"total":2')
    expect(document.querySelectorAll('.scroll-collection-pip--full')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'scrolls.open_collection' }).getAttribute('href')).toBe('/parchments')
  })

  it('says the collection is complete instead of counting seals', () => {
    view({ scrolls: { unlocked: SCROLLS.map((scroll) => scroll.id), seals: 3 }, own: true })
    expect(screen.getByText('scrolls.complete')).toBeTruthy()
    expect(screen.queryByText(/scrolls\.seals/)).toBeNull()
  })

  it("shows only the count on another player's profile: no title, no grid, no seals, no link", () => {
    view({ scrolls: owned })
    expect(screen.getByText(/scrolls\.progress/).textContent).toContain(`"count":2,"total":${SCROLLS.length}`)
    expect(document.body.textContent).not.toContain('scrolls.title_')
    expect(document.body.textContent).not.toContain('scrolls.title"')
    expect(document.body.textContent).not.toContain('scrolls.seals')
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('img, a, ul')).toBeNull()
  })
})
