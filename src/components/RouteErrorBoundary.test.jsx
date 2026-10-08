import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import RouteErrorBoundary, { ErrorBoundary } from './RouteErrorBoundary'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

function Broken() {
  throw new Error('boom')
}

describe('error boundaries', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the error screen with reload and home actions, and logs the error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('errors.title')
    expect(screen.getByRole('button', { name: 'messages.reload' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'errors.home' })).toHaveAttribute('href', '/')
    expect(log.mock.calls.some(([error]) => error instanceof Error && error.message === 'boom')).toBe(true)
  })

  it('leaves the error screen when the route changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <MemoryRouter initialEntries={['/broken']}>
        <Link to="/ok">go</Link>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/broken" element={<Broken />} />
            <Route path="/ok" element={<p>fine</p>} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})
