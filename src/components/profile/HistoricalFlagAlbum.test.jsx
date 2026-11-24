import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HistoricalFlagAlbumView } from './HistoricalFlagAlbum'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, props) => props ? `${key} ${props.count ?? ''}/${props.total}` : key,
    i18n: { language: 'en' },
  }),
}))

afterEach(cleanup)

function setup(own, overrides = {}) {
  const select = vi.fn()
  const album = { state: { active: 'ussr', progress: { ussr: 7, qing: 3 }, unlocked: ['fiji-kingdom'] }, select, ...overrides }
  render(<HistoricalFlagAlbumView own={own} album={album} sectionId="test.historical" />)
  return select
}

describe('HistoricalFlagAlbumView', () => {
  it('lets the owner inspect and resume a different flag or resume the classic collection', () => {
    const select = setup(true)
    expect(screen.getByText('collection.pieces 7/10')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Soviet Union/ }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /Qing China/ }))
    expect(screen.getByText('collection.pieces 3/10')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'collection.historical.resume' }))
    fireEvent.click(screen.getByRole('button', { name: 'collection.historical.back_to_classic' }))
    expect(select.mock.calls).toEqual([['qing'], [null]])
  })

  it('shows other players’ unlocked flags without exposing their current target or controls', () => {
    const select = setup(false)
    expect(screen.queryByRole('button', { name: /Soviet Union/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Kingdom of Fiji/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'collection.historical.source' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'collection.historical.back_to_classic' })).toBeNull()
    expect(select).not.toHaveBeenCalled()
  })
})
