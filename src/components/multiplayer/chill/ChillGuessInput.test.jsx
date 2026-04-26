// src/components/multiplayer/chill/ChillGuessInput.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChillGuessInput from './ChillGuessInput'

vi.mock('../../../hooks/useBorderGuessState', () => ({
  default: vi.fn(),
}))
vi.mock('react-toastify', () => ({
  ToastContainer: () => null,
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))
vi.mock('react-toastify/dist/ReactToastify.css', () => ({}))

import useBorderGuessState from '../../../hooks/useBorderGuessState'

const makeHook = (overrides = {}) => ({
  inputValue: '',
  setInputValue: vi.fn(),
  guesses: [],
  isSolved: false,
  isComplete: false,
  answerName: 'France',
  filteredCountrySuggestions: [],
  handleSubmit: vi.fn(),
  revealCountry: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  useBorderGuessState.mockReturnValue(makeHook())
})

describe('ChillGuessInput — locked au montage', () => {
  it('affiche En attente sans appeler onSubmit', () => {
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={true} onSubmit={onSubmit} />)
    expect(screen.getByText('⏳ En attente…')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ne appelle pas onSubmit même si isComplete=true quand locked au montage', () => {
    useBorderGuessState.mockReturnValue(makeHook({ isComplete: true, isSolved: true, guesses: [] }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={true} onSubmit={onSubmit} />)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ChillGuessInput — soumission', () => {
  it('appelle onSubmit avec correct=true et score=3 quand résolu sans erreur', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [{ value: 'France', isCorrect: true, distanceKm: 0, directionArrow: null }],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, score: 3, guesses: ['France'] })
  })

  it('appelle onSubmit avec correct=true et score=2 quand résolu après 1 erreur', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [
        { value: 'Allemagne', isCorrect: false, distanceKm: 1200, directionArrow: '→' },
        { value: 'France', isCorrect: true, distanceKm: 0, directionArrow: null },
      ],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, score: 2, guesses: ['Allemagne', 'France'] })
  })

  it('appelle onSubmit avec correct=true et score=2 quand résolu après 2 erreurs', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [
        { value: 'Espagne', isCorrect: false, distanceKm: 1500, directionArrow: '↑' },
        { value: 'Italie', isCorrect: false, distanceKm: 1100, directionArrow: '↗' },
        { value: 'France', isCorrect: true, distanceKm: 0, directionArrow: null },
      ],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, score: 2, guesses: ['Espagne', 'Italie', 'France'] })
  })

  it('appelle onSubmit avec correct=true et score=0 quand résolu après 3 erreurs', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [
        { value: 'Espagne', isCorrect: false, distanceKm: 1500, directionArrow: '↑' },
        { value: 'Italie', isCorrect: false, distanceKm: 1100, directionArrow: '↗' },
        { value: 'Belgique', isCorrect: false, distanceKm: 300, directionArrow: '↑' },
        { value: 'France', isCorrect: true, distanceKm: 0, directionArrow: null },
      ],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, score: 0, guesses: ['Espagne', 'Italie', 'Belgique', 'France'] })
  })

  it('appelle onSubmit avec correct=false et score=0 quand abandonné', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: false,
      isComplete: true,
      guesses: [{ value: 'Espagne', isCorrect: false, distanceKm: 1500, directionArrow: '↑' }],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: false, score: 0, guesses: ['Espagne'] })
  })

  it('appelle onSubmit avec guesses=[] quand abandonné sans essai', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: false,
      isComplete: true,
      guesses: [],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: false, score: 0, guesses: [] })
  })

  it('n\'appelle onSubmit qu\'une seule fois même si re-render', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [{ value: 'France', isCorrect: true }],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    const { rerender } = render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    rerender(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('ChillGuessInput — rendu input actif', () => {
  it('affiche les boutons Proposer et Abandonner quand non locked', () => {
    render(<ChillGuessInput country={{}} locked={false} onSubmit={vi.fn()} />)
    expect(screen.getByText('Proposer')).toBeInTheDocument()
    expect(screen.getByText('Abandonner')).toBeInTheDocument()
  })

  it('affiche le message résolu quand isSolved=true', () => {
    useBorderGuessState.mockReturnValue(makeHook({ isSolved: true, isComplete: true, guesses: [], answerName: 'France' }))
    render(<ChillGuessInput country={{}} locked={false} onSubmit={vi.fn()} />)
    expect(screen.getByText('✓ France')).toBeInTheDocument()
  })

  it('affiche le message echec quand isComplete=true et isSolved=false', () => {
    useBorderGuessState.mockReturnValue(makeHook({ isSolved: false, isComplete: true, guesses: [], answerName: 'France' }))
    render(<ChillGuessInput country={{}} locked={false} onSubmit={vi.fn()} />)
    expect(screen.getByText("✗ C'était : France")).toBeInTheDocument()
  })
})
