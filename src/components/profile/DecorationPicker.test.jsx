// The decoration picker dialog: options, optimistic selection, and revert when the save fails.
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import DecorationPicker from './DecorationPicker'
import { saveAvatarFlag, saveDecoration } from '../../utils/decorations'

const account = { uid: 'me', username: 'Alice' }

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'fr' } }) }))
vi.mock('../../hooks/useDecoration', () => ({ useDecoration: () => ({ frame: 'none', color: 'default', flag: null }) }))
let mockLevel = 1
vi.mock('../../hooks/useXp', () => ({ useXp: () => ({ level: mockLevel }) }))
vi.mock('../../utils/decorations', async (importOriginal) => ({
  ...(await importOriginal()),
  saveDecoration: vi.fn(() => Promise.resolve()),
  saveAvatarFlag: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../utils/publicProfile', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPublicData: vi.fn(() => Promise.resolve({ flags: { unlocked: ['FR', 'JP'] } })),
}))

const open = () => {
  render(<DecorationPicker account={account} />)
  fireEvent.click(screen.getByText('decorations.open'))
}
const option = (label) => screen.getByText(label).closest('button')
const pressed = (label) => option(label).getAttribute('aria-pressed')

beforeEach(() => {
  vi.clearAllMocks()
  mockLevel = 1
})

describe('DecorationPicker', () => {
  it('opens a dialog with the current frame and color pressed', () => {
    open()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(pressed('decorations.frame.none')).toBe('true')
    expect(pressed('decorations.frame.gold')).toBe('false')
    expect(pressed('decorations.color.default')).toBe('true')
    expect(pressed('decorations.color.mint')).toBe('false')
  })

  it('saves a clicked frame and moves the pressed state', async () => {
    open()
    fireEvent.click(option('decorations.frame.gold'))
    expect(pressed('decorations.frame.gold')).toBe('true')
    expect(pressed('decorations.frame.none')).toBe('false')
    await waitFor(() => expect(saveDecoration).toHaveBeenCalledWith('me', { frame: 'gold', color: 'default', flag: null }, { level: 1 }))
  })

  it('keeps the other half of the choice when a color is picked', async () => {
    open()
    fireEvent.click(option('decorations.frame.ocean'))
    fireEvent.click(option('decorations.color.mint'))
    await waitFor(() => expect(saveDecoration).toHaveBeenLastCalledWith('me', { frame: 'ocean', color: 'mint', flag: null }, { level: 1 }))
  })

  it('reverts and shows an error when the save fails', async () => {
    saveDecoration.mockRejectedValueOnce(new Error('denied'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    open()
    fireEvent.click(option('decorations.frame.gold'))
    await waitFor(() => expect(screen.getByText('decorations.error')).toBeTruthy())
    expect(pressed('decorations.frame.none')).toBe('true')
    expect(pressed('decorations.frame.gold')).toBe('false')
  })

  it('disables the items above the level and unlocks them as it grows', () => {
    open()
    expect(option('decorations.frame.sunrise').disabled).toBe(true)
    expect(option('decorations.color.lime').disabled).toBe(true)
    expect(option('decorations.frame.gold').disabled).toBe(false)
    cleanup()
    mockLevel = 3
    open()
    expect(option('decorations.frame.sunrise').disabled).toBe(false)
    expect(option('decorations.color.lime').disabled).toBe(false)
    expect(option('decorations.frame.glacier').disabled).toBe(true)
  })

  it('closes on Escape', () => {
    open()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lists the unlocked flags only and saves a picked one, keeping the frame and the color', async () => {
    open()
    const flag = await screen.findByTitle('France')
    expect(screen.getByTitle('Japon')).toBeTruthy()
    expect(screen.queryByTitle('Italie')).toBeNull()
    expect(pressed('decorations.flag_none')).toBe('true')
    fireEvent.click(flag)
    expect(flag.getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(saveAvatarFlag).toHaveBeenCalledWith('me', 'FR', ['FR', 'JP']))
    fireEvent.click(option('decorations.frame.gold'))
    await waitFor(() => expect(saveDecoration).toHaveBeenCalledWith('me', { frame: 'gold', color: 'default', flag: 'FR' }, { level: 1 }))
  })

  it('reverts the flag when the save fails', async () => {
    saveAvatarFlag.mockRejectedValueOnce(new Error('denied'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    open()
    const flag = await screen.findByTitle('France')
    fireEvent.click(flag)
    await waitFor(() => expect(screen.getByText('decorations.error')).toBeTruthy())
    expect(flag.getAttribute('aria-pressed')).toBe('false')
    expect(pressed('decorations.flag_none')).toBe('true')
  })

  it('says so when no flag is unlocked', async () => {
    const { fetchPublicData } = await import('../../utils/publicProfile')
    fetchPublicData.mockResolvedValueOnce({})
    open()
    expect(await screen.findByText('decorations.flag_empty')).toBeTruthy()
  })
})
