// The interactive map of an empire: tabs in the sheet only for empires, stages through the slider and the buttons, the
// territories drawn up to the current stage (or only it), the note. Leaflet is replaced by plain elements.
import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { ScrollsView } from '../../pages/ScrollsPage'
import EmpireMap from './EmpireMap'

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
vi.mock('../../data/scrollTexts', () => ({ loadScrollText: () => new Promise(() => {}) }))
vi.mock('../../data/countryGeometry', () => ({ loadCountryGeometries: () => Promise.resolve() }))
vi.mock('../map/LandLayer', () => ({ default: () => <div data-testid="land" /> }))
vi.mock('leaflet/dist/leaflet.css', () => ({}))
// Leaflet needs a real layout: the layers become buttons that fire their click handler
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  GeoJSON: ({ data, style, eventHandlers }) => (
    <button type="button" data-testid={`layer-${data.properties.stage}`} data-opacity={style.fillOpacity} onClick={eventHandlers.click} />
  ),
}))

vi.mock('../../data/empires', async () => {
  const { shownStages } = await vi.importActual('../../data/empires')
  const stages = (...ids) => ids.map((id, index) => ({ id, color: `#00000${index}` }))
  const collection = (...ids) => ({
    default: { type: 'FeatureCollection', features: ids.map((id) => ({ type: 'Feature', properties: { stage: id }, geometry: { type: 'MultiPolygon', coordinates: [] } })) },
  })
  const EMPIRES = {
    'ottoman-empire': { center: [37, 30], zoom: 4, stages: stages('a', 'b', 'c'), load: () => Promise.resolve(collection('a', 'b', 'c')) },
    'rome-395': { center: [40, 10], zoom: 4, cumulative: false, stages: stages('x', 'y'), load: () => Promise.resolve(collection('x', 'y')) },
    // Its data never arrives
    'mongol-dominions': { center: [40, 10], zoom: 4, stages: stages('m'), load: () => new Promise(() => {}) },
  }
  return { EMPIRES, shownStages, hasEmpireMap: (id) => Object.hasOwn(EMPIRES, id) }
})
const loadEmpireText = vi.fn()
vi.mock('../../data/empireTexts', () => ({ loadEmpireText: (...args) => loadEmpireText(...args) }))

const TEXTS = {
  'ottoman-empire': {
    stages: { a: { label: 'A1', title: 'Title a', text: 'Text a' }, b: { label: 'B2', title: 'Title b', text: 'Text b' }, c: { label: 'C3', title: 'Title c', text: 'Text c' } },
    note: 'Approximate limits.',
  },
  'rome-395': { stages: { x: { label: 'X', title: 'Title x', text: 'Text x' }, y: { label: 'Y', title: 'Title y', text: 'Text y' } } },
}

beforeEach(() => {
  loadEmpireText.mockImplementation((id) => Promise.resolve(TEXTS[id] ?? { stages: {} }))
})
afterEach(() => {
  cleanup()
  loadEmpireText.mockReset()
})

const layers = () => screen.queryAllByTestId(/^layer-/).map((layer) => layer.dataset.testid.replace('layer-', ''))

describe('tabs of the sheet', () => {
  const unlocked = ['ottoman-empire', 'rome-395', 'turin-papyrus']
  const open = (requested) => render(<ScrollsView scrolls={{ unlocked, seals: 0 }} requested={requested} />)

  it('appear for an empire only', () => {
    open('ottoman-empire')
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'scrolls.view_interactive' })).toBeTruthy()
    cleanup()
    open('turin-papyrus')
    expect(screen.queryByRole('button', { name: 'scrolls.view_interactive' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'scrolls.view_old' })).toBeNull()
  })

  it('switch between the old map and the interactive one, which loads its map on demand', async () => {
    open('ottoman-empire')
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('.scroll-map')).toBeTruthy()
    expect(screen.queryByTestId('map')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.view_interactive' }))
    expect(await screen.findByTestId('map')).toBeTruthy()
    expect(dialog.querySelector('.scroll-map')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'scrolls.view_old' }))
    expect(dialog.querySelector('.scroll-map')).toBeTruthy()
    expect(screen.queryByTestId('map')).toBeNull()
  })
})

describe('EmpireMap', () => {
  it('opens on the last stage, with every territory up to it, its text and the note', async () => {
    render(<EmpireMap id="ottoman-empire" language="en" />)
    expect(await screen.findByText('Title c')).toBeTruthy()
    expect(screen.getByText('Text c')).toBeTruthy()
    await waitFor(() => expect(layers()).toEqual(['a', 'b', 'c']))
    expect(screen.getByRole('button', { name: 'A1' })).toBeTruthy()
    expect(screen.getByText('Approximate limits.')).toBeTruthy()
  })

  it('shows the land alone, and no text, while the data and the texts load', () => {
    loadEmpireText.mockReturnValue(new Promise(() => {}))
    render(<EmpireMap id="mongol-dominions" language="en" />)
    expect(screen.getByTestId('land')).toBeTruthy()
    expect(layers()).toEqual([])
    expect(document.querySelector('.empire-map-info')).toBeNull()
    expect(document.querySelector('.empire-map-note')).toBeNull()
    // The buttons are there, named by the stage id until the labels arrive
    expect(screen.getByRole('button', { name: 'm' })).toBeTruthy()
  })

  it('moves through the stages with the slider and the buttons', async () => {
    render(<EmpireMap id="ottoman-empire" language="en" />)
    await screen.findByText('Title c')
    fireEvent.change(screen.getByRole('slider', { name: 'scrolls.empire_period' }), { target: { value: '0' } })
    expect(screen.getByText('Title a')).toBeTruthy()
    expect(layers()).toEqual(['a'])
    fireEvent.click(screen.getByRole('button', { name: 'B2' }))
    expect(screen.getByText('Text b')).toBeTruthy()
    expect(layers()).toEqual(['a', 'b'])
    expect(screen.getByRole('slider').value).toBe('1')
    expect(screen.getByRole('button', { name: 'B2' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('tells the stage of a clicked territory, until the slider moves', async () => {
    render(<EmpireMap id="ottoman-empire" language="en" />)
    await screen.findByText('Title c')
    await waitFor(() => expect(layers()).toHaveLength(3))
    fireEvent.click(screen.getByTestId('layer-a'))
    expect(screen.getByText('Title a')).toBeTruthy()
    expect(screen.queryByText('Title c')).toBeNull()
    expect(screen.getByTestId('layer-a').dataset.opacity).toBe('0.95')
    expect(screen.getByTestId('layer-b').dataset.opacity).toBe('0.7')
    fireEvent.click(screen.getByRole('button', { name: 'B2' }))
    expect(screen.getByText('Title b')).toBeTruthy()
  })

  it('shows only the current stage when the empire is not cumulative', async () => {
    render(<EmpireMap id="rome-395" language="en" />)
    expect(await screen.findByText('Title y')).toBeTruthy()
    await waitFor(() => expect(layers()).toEqual(['y']))
    fireEvent.click(screen.getByRole('button', { name: 'X' }))
    expect(layers()).toEqual(['x'])
    expect(screen.getByText('Text x')).toBeTruthy()
    expect(document.querySelector('.empire-map-note')).toBeNull()
    const marked = [...document.querySelectorAll('.empire-map-steps li.is-on')].map((item) => item.textContent)
    expect(marked).toEqual(['X'])
  })

  it('asks for the texts of the language it is given, again when it changes', async () => {
    const { rerender } = render(<EmpireMap id="ottoman-empire" language="en" />)
    await waitFor(() => expect(loadEmpireText).toHaveBeenCalledWith('ottoman-empire', 'en'))
    rerender(<EmpireMap id="ottoman-empire" language="de" />)
    await waitFor(() => expect(loadEmpireText).toHaveBeenCalledWith('ottoman-empire', 'de'))
  })
})
