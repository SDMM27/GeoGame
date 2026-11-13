import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import SiteAccent from './SiteAccent'
import { globeSkin, saveAccentEnabled, saveSecretFound, saveSkinChoice } from '../utils/globeSkins'
import { setColorScheme } from './theme/useColorScheme'

vi.mock('../auth', () => ({ useAccount: () => ({ account: null }) }))
vi.mock('../hooks/useXp', () => ({ useXp: () => ({ level: 99 }) }))

const root = document.documentElement
const read = (name) => root.style.getPropertyValue(name)
const NAMES = ['--sd-accent', '--sd-accent-strong', '--sd-accent-ink', '--gg-accent-soft', '--gg-accent-line']

describe('SiteAccent', () => {
  beforeEach(() => {
    localStorage.clear()
    NAMES.forEach((name) => root.style.removeProperty(name))
    root.dataset.theme = 'dark'
    saveSkinChoice('classic')
  })

  it('leaves the theme accent with the classic skin', () => {
    render(<SiteAccent />)
    NAMES.forEach((name) => expect(read(name)).toBe(''))
  })

  it('sets the accent of the worn skin and follows the theme', () => {
    saveSkinChoice('gold')
    render(<SiteAccent />)
    const { dark, light } = globeSkin('gold').accent
    expect(read('--sd-accent')).toBe(dark.accent)
    expect(read('--sd-accent-strong')).toBe(dark.strong)
    expect(read('--sd-accent-ink')).toBe(dark.ink)
    expect(read('--gg-accent-soft')).toMatch(/, 0\.14\)$/)
    expect(read('--gg-accent-line')).toMatch(/, 0\.35\)$/)

    act(() => setColorScheme('light'))
    return vi.waitFor(() => {
      expect(read('--sd-accent')).toBe(light.accent)
      expect(read('--gg-accent-soft')).toMatch(/, 0\.08\)$/)
      expect(read('--gg-accent-line')).toMatch(/, 0\.4\)$/)
    })
  })

  it('follows the skin choice and the preference live', () => {
    saveSecretFound()
    render(<SiteAccent />)
    act(() => saveSkinChoice('neon'))
    expect(read('--sd-accent')).toBe(globeSkin('neon').accent.dark.accent)
    act(() => saveAccentEnabled(false))
    NAMES.forEach((name) => expect(read(name)).toBe(''))
    act(() => saveAccentEnabled(true))
    expect(read('--sd-accent')).toBe(globeSkin('neon').accent.dark.accent)
  })

  it('removes the variables on unmount', () => {
    saveSkinChoice('gold')
    const { unmount } = render(<SiteAccent />)
    unmount()
    NAMES.forEach((name) => expect(read(name)).toBe(''))
  })
})
