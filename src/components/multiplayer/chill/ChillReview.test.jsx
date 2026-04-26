// src/components/multiplayer/chill/ChillReview.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChillReview from './ChillReview'

const players = { p1: { pseudo: 'Alice' } }

const baseProps = {
  mancheCountries: [{ properties: { ADMIN: 'France', capital: 'Paris' } }],
  mancheStartIndex: 0,
  players,
  isHost: false,
  gameType: 'BORDER_GUESS',
  onNext: vi.fn(),
  onContinue: vi.fn(),
}

describe('ChillReview — step 0 (résumé)', () => {
  it('affiche le pseudo du joueur', () => {
    const playerAnswers = { p1: { '0': { correct: true, score: 3, guesses: ['France'] } } }
    render(<ChillReview {...baseProps} reviewStep={0} playerAnswers={playerAnswers} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

describe('ChillReview — affichage guesses multiples (BORDER_GUESS)', () => {
  it('affiche N tentatives et la liste avec séparateur →', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, score: 0, guesses: ['Allemagne', 'Espagne'] } },
    }
    render(<ChillReview {...baseProps} reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('2 tentatives')).toBeInTheDocument()
    expect(screen.getByText('Allemagne → Espagne')).toBeInTheDocument()
  })

  it('affiche 1 tentative au singulier', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, score: 0, guesses: ['Allemagne'] } },
    }
    render(<ChillReview {...baseProps} reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('1 tentative')).toBeInTheDocument()
    expect(screen.getByText('Allemagne')).toBeInTheDocument()
  })

  it('affiche "(rien)" quand guesses est tableau vide', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, score: 0, guesses: [] } },
    }
    render(<ChillReview {...baseProps} reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('(rien)')).toBeInTheDocument()
  })
})

describe('ChillReview — rétrocompatibilité (FLAGS / CAPITALS)', () => {
  it('affiche answer.answer quand guesses absent', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, answer: 'Brésil' } },
    }
    render(<ChillReview {...baseProps} gameType="FLAGS" reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('Brésil')).toBeInTheDocument()
  })

  it('affiche "(rien)" quand answer.answer est vide et guesses absent', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, answer: '' } },
    }
    render(<ChillReview {...baseProps} gameType="FLAGS" reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('(rien)')).toBeInTheDocument()
  })

  it('affiche clickedAdmin quand guesses absent et clickedAdmin présent (PLACEMENT)', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, clickedAdmin: 'Argentine' } },
    }
    render(<ChillReview {...baseProps} gameType="PLACEMENT" reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('Argentine')).toBeInTheDocument()
  })
})
