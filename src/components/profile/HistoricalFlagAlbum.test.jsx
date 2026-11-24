import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { HistoricalPackStatus } from './HistoricalFlagAlbum'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}))
afterEach(cleanup)

it('shows the queued mystery pack without listing flag identities', () => {
  const state = { active: 'ussr', unlocked: ['fiji-kingdom'], next: 'historical-pack', progress: {} }
  render(<HistoricalPackStatus album={{ state }} />)
  expect(screen.getByText('collection.historical.queued')).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
})

it('explains the weekly bonus path to a pack when nothing is queued', () => {
  render(<HistoricalPackStatus album={{ state: { active: null, unlocked: [], progress: {} } }} />)
  expect(screen.getByText(/collection\.historical\.pack_hint/)).toBeTruthy()
})

it('reports a load error', () => {
  render(<HistoricalPackStatus album={{ state: null, error: true }} />)
  expect(screen.getByRole('alert').textContent).toBe('collection.historical.load_error')
})
