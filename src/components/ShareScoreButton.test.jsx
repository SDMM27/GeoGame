import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareScoreButton from './ShareScoreButton'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      'share.copy_button': '📋 Copier les résultats',
      'share.copied': '✓ Résultat copié !',
      'share.pseudo_placeholder': 'Ton pseudo (optionnel)',
      'share.anonymous': 'Anonyme',
    }[key] ?? key),
  }),
}))

vi.mock('./NudgeFriends', () => ({ default: () => null }))

vi.mock('../utils/shareScore', () => ({
  copyShareText: vi.fn().mockResolvedValue(undefined),
}))

import { copyShareText } from '../utils/shareScore'

describe('ShareScoreButton', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders a pseudo input and a copy button', () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByPlaceholderText('Ton pseudo (optionnel)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copier/i })).toBeInTheDocument()
  })

  it('prefills pseudo from localStorage', () => {
    localStorage.setItem('geogame_pseudo', 'Alice')
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByPlaceholderText('Ton pseudo (optionnel)')).toHaveValue('Alice')
  })

  it('saves pseudo to localStorage when copy is clicked', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() => expect(copyShareText).toHaveBeenCalled())
    expect(localStorage.getItem('geogame_pseudo')).toBe('Bob')
  })

  it('calls copyShareText with all props', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" details="35/50 pays" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Pierre' } })
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() =>
      expect(copyShareText).toHaveBeenCalledWith({
        score: 42,
        gameType: 'FLAGS',
        difficulty: 'Difficile',
        pseudo: 'Pierre',
        scoreLabel: 'POINTS',
        details: '35/50 pays',
      })
    )
  })

  it('forwards a custom scoreLabel to copyShareText', async () => {
    render(<ShareScoreButton score={5} gameType="BORDER_GUESS" difficulty="Daily" scoreLabel="ESSAIS" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() =>
      expect(copyShareText).toHaveBeenCalledWith(expect.objectContaining({ scoreLabel: 'ESSAIS' }))
    )
  })

  it('shows confirmation text after copy', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() => expect(screen.getByText(/copié/i)).toBeInTheDocument())
  })
})
