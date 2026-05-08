import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareScoreButton from './ShareScoreButton'

vi.mock('../utils/shareScore', () => ({
  exportShareCard: vi.fn().mockResolvedValue(undefined),
}))

import { exportShareCard } from '../utils/shareScore'

describe('ShareScoreButton', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders a pseudo input and a share button', () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByPlaceholderText('Ton pseudo (optionnel)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument()
  })

  it('prefills pseudo from localStorage', () => {
    localStorage.setItem('geogame_pseudo', 'Alice')
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByPlaceholderText('Ton pseudo (optionnel)')).toHaveValue('Alice')
  })

  it('saves pseudo to localStorage when share is clicked', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: /partager/i }))
    await waitFor(() => expect(exportShareCard).toHaveBeenCalled())
    expect(localStorage.getItem('geogame_pseudo')).toBe('Bob')
  })

  it('calls exportShareCard with all props', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Pierre' } })
    fireEvent.click(screen.getByRole('button', { name: /partager/i }))
    await waitFor(() =>
      expect(exportShareCard).toHaveBeenCalledWith({
        score: 42,
        gameType: 'FLAGS',
        difficulty: 'Difficile',
        pseudo: 'Pierre',
        scoreLabel: 'POINTS',
      })
    )
  })

  it('forwards a custom scoreLabel to exportShareCard', async () => {
    render(<ShareScoreButton score={5} gameType="BORDER_GUESS" difficulty="Daily" scoreLabel="ESSAIS" />)
    fireEvent.click(screen.getByRole('button', { name: /partager/i }))
    await waitFor(() =>
      expect(exportShareCard).toHaveBeenCalledWith(expect.objectContaining({ scoreLabel: 'ESSAIS' }))
    )
  })
})
