// The collection page: grid by era, sealed tiles, images with a placeholder, the sheet with its map controls.
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { ScrollsView } from '../../pages/ScrollsPage'
import ScrollImage from './ScrollImage'
import { ERAS, SCROLLS } from '../../data/scrolls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}))
vi.mock('../NavBar', () => ({ default: () => null }))
vi.mock('../../auth', () => ({ useAccount: () => ({ loading: false, account: { uid: 'u1', username: 'me' } }) }))
vi.mock('../../utils/publicProfile', () => ({
  cachedPublicData: () => null,
  fetchPublicData: vi.fn(),
  onPublicDataPatched: () => () => {},
}))
const loadScrollText = vi.fn()
vi.mock('../../data/scrollTexts', () => ({ loadScrollText: (...args) => loadScrollText(...args) }))

// jsdom has no PointerEvent: a mouse event that also carries the pointer id
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
    }
  }
}

afterEach(() => {
  cleanup()
  loadScrollText.mockReset()
})

// The texts of a sheet that never arrive: nothing updates after the test
const pending = () => new Promise(() => {})

const unlocked = ['continents-1858', 'turin-papyrus', 'rome-395']
const view = (props) => render(<ScrollsView scrolls={{ unlocked, seals: 0 }} {...props} />)

describe('ScrollsView grid', () => {
  it('groups the scrolls by era, in the catalogue order of eras', () => {
    loadScrollText.mockReturnValue(pending())
    view()
    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(headings).toEqual(ERAS.map((era) => `scrolls.era.${era}`))
  })

  it('shows the date of an atlas map as "map of" and the bare year of a period document', () => {
    loadScrollText.mockReturnValue(pending())
    view()
    const atlas = screen.getByRole('button', { name: /scrolls.title_rome-395/ })
    expect(within(atlas).getByText('scrolls.map_of {"year":"1923"}')).toBeTruthy()
    const period = screen.getByRole('button', { name: /scrolls.title_continents-1858/ })
    expect(within(period).getByText('1858')).toBeTruthy()
  })

  it('shows the thumbnail, title and year of an owned scroll, which opens its sheet', async () => {
    loadScrollText.mockReturnValue(pending())
    view()
    const tile = screen.getByRole('button', { name: /scrolls\.title_turin-papyrus/ })
    expect(within(tile).getByText('scrolls.year_bc {"year":1150}')).toBeTruthy()
    expect(tile.querySelector('img').getAttribute('src')).toBe('/scrolls/turin-papyrus/thumb.webp')
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(tile)
    expect(screen.getByRole('dialog')).toBeTruthy()
    await waitFor(() => expect(loadScrollText).toHaveBeenCalledWith('turin-papyrus', 'en'))
  })

  it('shows a missing scroll as a sealed tile: only its era, no title, no image, not clickable', () => {
    loadScrollText.mockReturnValue(pending())
    view()
    const sealed = SCROLLS.length - unlocked.length
    const tiles = document.querySelectorAll('.scroll-tile--sealed')
    expect(tiles).toHaveLength(sealed)
    expect(screen.getAllByRole('button')).toHaveLength(unlocked.length)
    for (const tile of tiles) {
      expect(tile.textContent).toMatch(/^scrolls\.era\.[a-z_]+$/)
      expect(tile.querySelector('img, button, a')).toBeNull()
      expect(tile.getAttribute('aria-label')).toBe('scrolls.sealed')
      fireEvent.click(tile)
    }
    expect(screen.queryByRole('dialog')).toBeNull()
    // None of the titles of the missing scrolls appears anywhere
    for (const scroll of SCROLLS.filter((item) => !unlocked.includes(item.id))) {
      expect(document.body.innerHTML).not.toContain(scroll.id)
    }
  })

  it('opens a requested sheet only for an owned scroll', () => {
    loadScrollText.mockReturnValue(pending())
    view({ requested: 'mongol-dominions' })
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()
    view({ requested: 'rome-395' })
    expect(screen.getByRole('dialog').textContent).toContain('scrolls.title_rome-395')
    cleanup()
    view({ requested: 'nope' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ScrollImage', () => {
  it('shows a parchment placeholder, not a broken image, when the file fails to load', () => {
    render(<ScrollImage id="rome-395" />)
    const image = document.querySelector('img')
    expect(image.getAttribute('src')).toBe('/scrolls/rome-395/thumb.webp')
    fireEvent.error(image)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByTestId('scroll-placeholder').className).toContain('scroll-image--placeholder')
  })

  it('also falls back in the grid and in the sheet', () => {
    loadScrollText.mockReturnValue(pending())
    view({ requested: 'rome-395' })
    for (const image of [...document.querySelectorAll('img')]) fireEvent.error(image)
    expect(document.querySelector('img')).toBeNull()
    // 3 thumbnails in the grid + the large map of the sheet
    expect(screen.getAllByTestId('scroll-placeholder')).toHaveLength(unlocked.length + 1)
  })
})

describe('ScrollSheet', () => {
  it('shows the title, the date, the kind of map, the texts and the credit', async () => {
    loadScrollText.mockResolvedValue({ body: 'The story.', detail: 'Look at the river.', credit: 'Museo Egizio, CC0' })
    view({ requested: 'rome-395' })
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'scrolls.title_rome-395' })).toBeTruthy()
    // An atlas map says when it was drawn in the kind of map, with no date line to repeat it
    expect(within(dialog).queryByText('scrolls.map_of {"year":"1923"}')).toBeNull()
    expect(within(dialog).getByText('scrolls.family_atlas {"year":"1923"}')).toBeTruthy()
    expect(await within(dialog).findByText('The story.')).toBeTruthy()
    expect(within(dialog).getByText('Look at the river.')).toBeTruthy()
    expect(within(dialog).getByText('scrolls.detail_title')).toBeTruthy()
    expect(dialog.textContent).toContain('Museo Egizio, CC0')
    expect(dialog.querySelector('img').getAttribute('src')).toBe('/scrolls/rome-395/large.webp')
  })

  it('says "document of the time" for a period map and hides the blocks without text', async () => {
    loadScrollText.mockResolvedValue({})
    view({ requested: 'turin-papyrus' })
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('scrolls.family_period')).toBeTruthy()
    expect(within(dialog).getByText('scrolls.year_bc {"year":1150}')).toBeTruthy()
    await waitFor(() => expect(loadScrollText).toHaveBeenCalled())
    expect(within(dialog).queryByText('scrolls.detail_title')).toBeNull()
    expect(within(dialog).queryByText('scrolls.credit_title')).toBeNull()
    expect(dialog.querySelector('.scroll-sheet-body')).toBeNull()
  })

  it('closes on the close button and on Escape', () => {
    loadScrollText.mockReturnValue(pending())
    view({ requested: 'rome-395' })
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()
    view({ requested: 'rome-395' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('zooms and resets the map with its buttons and the keyboard', () => {
    loadScrollText.mockReturnValue(pending())
    view({ requested: 'rome-395' })
    const stage = screen.getByTestId('scroll-map-stage')
    const rect = { width: 400, height: 300, left: 0, top: 0, right: 400, bottom: 300, x: 0, y: 0 }
    const box = document.querySelector('.scroll-map')
    box.getBoundingClientRect = () => rect
    expect(stage.style.transform).toBe('translate(0px, 0px) scale(1)')
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.zoom_in' }))
    expect(stage.style.transform).toBe('translate(-100px, -75px) scale(1.5)')
    fireEvent.keyDown(box, { key: 'ArrowRight' })
    expect(stage.style.transform).toBe('translate(-148px, -75px) scale(1.5)')
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.zoom_reset' }))
    expect(stage.style.transform).toBe('translate(0px, 0px) scale(1)')
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.zoom_out' }))
    expect(stage.style.transform).toBe('translate(0px, 0px) scale(1)')
  })

  it('pans the map by dragging, within its limits', () => {
    loadScrollText.mockReturnValue(pending())
    view({ requested: 'turin-papyrus' })
    const box = document.querySelector('.scroll-map')
    box.getBoundingClientRect = () => ({ width: 400, height: 300, left: 0, top: 0, right: 400, bottom: 300, x: 0, y: 0 })
    const stage = screen.getByTestId('scroll-map-stage')
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.zoom_in' }))
    fireEvent.pointerDown(box, { pointerId: 1, clientX: 200, clientY: 100, button: 0 })
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 100, clientY: 90 })
    expect(stage.style.transform).toBe('translate(-200px, -85px) scale(1.5)')
    // Past the edge: stays at the limit
    fireEvent.pointerMove(box, { pointerId: 1, clientX: -500, clientY: 90 })
    expect(stage.style.transform).toBe('translate(-200px, -85px) scale(1.5)')
    fireEvent.pointerUp(box, { pointerId: 1 })
  })
})
