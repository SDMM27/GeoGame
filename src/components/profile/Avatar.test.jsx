// Avatar: the initial by default, the flag (with the frame ring kept) when one is worn, the initial again if it fails.
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Avatar } from './ProfileBody'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key, i18n: { language: 'fr' } }) }))
vi.mock('../../hooks/useBadges', () => ({ useBadges: () => ({}) }))
vi.mock('../../hooks/usePlayerProfile', () => ({ usePlayerProfile: () => ({}) }))

describe('Avatar', () => {
  it('shows the initial without a flag', () => {
    const { container } = render(<Avatar username="alice" />)
    expect(screen.getByText('A')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows the flag instead of the initial, inside the frame ring', () => {
    const { container } = render(<Avatar username="alice" size={50} decoration={{ frame: 'gold', color: 'default', flag: 'FR' }} />)
    expect(container.querySelector('img').getAttribute('src')).toBe('/flags/fr.png')
    expect(screen.queryByText('A')).toBeNull()
    const box = container.querySelector('.profile-avatar')
    expect(box.style.width).toBe('50px')
    expect(box.style.border).toContain('rgb(245, 184, 61)')
  })

  it('goes back to the initial when the image fails', () => {
    const { container } = render(<Avatar username="alice" decoration={{ frame: 'none', color: 'default', flag: 'FR' }} />)
    fireEvent.error(container.querySelector('img'))
    expect(screen.getByText('A')).toBeTruthy()
  })
})
