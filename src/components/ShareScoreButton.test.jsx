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
      'share.share_image': "Partager l'image",
      'share.download_image': "Télécharger l'image",
    }[key] ?? key),
  }),
}))

vi.mock('./NudgeFriends', () => ({ default: () => null }))

vi.mock('../utils/shareScore', () => ({
  shareScoreText: vi.fn().mockResolvedValue('copied'),
  exportShareCard: vi.fn().mockResolvedValue('downloaded'),
  canShareImage: vi.fn().mockReturnValue(false),
}))

import { shareScoreText, exportShareCard, canShareImage } from '../utils/shareScore'

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
    await waitFor(() => expect(shareScoreText).toHaveBeenCalled())
    expect(localStorage.getItem('geogame_pseudo')).toBe('Bob')
  })

  it('calls shareScoreText with all props', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" details="35/50 pays" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Pierre' } })
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() =>
      expect(shareScoreText).toHaveBeenCalledWith({
        score: 42,
        gameType: 'FLAGS',
        difficulty: 'Difficile',
        pseudo: 'Pierre',
        scoreLabel: 'POINTS',
        scoreText: undefined,
        details: '35/50 pays',
        grid: undefined,
      })
    )
  })

  it('forwards a custom scoreLabel to shareScoreText', async () => {
    render(<ShareScoreButton score={5} gameType="BORDER_GUESS" difficulty="Daily" scoreLabel="ESSAIS" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() =>
      expect(shareScoreText).toHaveBeenCalledWith(expect.objectContaining({ scoreLabel: 'ESSAIS' }))
    )
  })

  it('shows confirmation text after copy', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() => expect(screen.getByText(/copié/i)).toBeInTheDocument())
  })

  it('does not show the copied confirmation when the native sheet was used', async () => {
    shareScoreText.mockResolvedValueOnce('shared')
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.click(screen.getByRole('button', { name: /copier/i }))
    await waitFor(() => expect(shareScoreText).toHaveBeenCalled())
    expect(screen.queryByText(/copié/i)).not.toBeInTheDocument()
  })

  it('offers an image download when files cannot be shared natively', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" scoreText="9/12" />)
    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }))
    await waitFor(() =>
      expect(exportShareCard).toHaveBeenCalledWith({
        score: 42,
        gameType: 'FLAGS',
        difficulty: 'Difficile',
        pseudo: '',
        scoreLabel: 'POINTS',
        scoreText: '9/12',
      })
    )
  })

  it('offers the native image share when the browser supports it', () => {
    canShareImage.mockReturnValueOnce(true)
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument()
  })
})
