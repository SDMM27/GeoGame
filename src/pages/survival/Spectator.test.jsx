import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Spectator from './Spectator'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key, params) => (params ? `${key}:${Object.values(params).join('/')}` : key),
  }),
}))
vi.mock('./SurvivalRounds', () => ({
  BorderSilhouette: ({ country }) => <div data-testid="silhouette">{country.properties.ADMIN}</div>,
  countryLabel: (country) => country.properties.ADMIN,
  roundAnswer: () => 'ANSWER',
}))
vi.mock('../../utils/quizQuestions', () => ({
  localizeQuestion: () => ({
    prompt: 'Which one?',
    choices: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
  }),
}))

const country = { properties: { ISO_A2: 'FR', ADMIN: 'France' } }
const rows = [{ id: 'p', pseudo: 'Ana', lives: 2, out: false, outRound: null, answered: false }]
const renderSpectator = (round, waiting = { done: 0, total: 2 }) =>
  render(<Spectator round={round} roundIndex={3} rows={rows} waiting={waiting} maxLives={3} onExit={() => {}} />)

describe('Spectator', () => {
  it('shows the country to place', () => {
    renderSpectator({ type: 'PLACEMENT', difficulty: 'Facile', country })
    expect(screen.getByText('France')).toBeTruthy()
    expect(screen.getByText('survival.waiting_players:0/2')).toBeTruthy()
  })

  it('shows the flag for a flag round, without the name', () => {
    const { container } = renderSpectator({ type: 'FLAGS', difficulty: 'Facile', country })
    expect(container.querySelector('img[src="/flags/fr.png"]')).toBeTruthy()
    expect(screen.queryByText('France')).toBeNull()
  })

  it('shows the flag and the country name for a capital round', () => {
    const { container } = renderSpectator({ type: 'CAPITALS', difficulty: 'Facile', country })
    expect(container.querySelector('img[src="/flags/fr.png"]')).toBeTruthy()
    expect(screen.getByText('France')).toBeTruthy()
  })

  it('shows the silhouette of a border round', () => {
    renderSpectator({ type: 'BORDER_GUESS', difficulty: 'Facile', country })
    expect(screen.getByTestId('silhouette').textContent).toBe('France')
  })

  it('shows the prompt and the choices of a quiz, and the right one once everyone answered', () => {
    const round = { type: 'QUIZ', difficulty: 'Facile', question: { correctId: 'b' } }
    const { container, rerender } = renderSpectator(round)
    expect(screen.getByText('Which one?')).toBeTruthy()
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(container.querySelector('.quiz-choice--correct')).toBeNull()
    rerender(<Spectator round={round} roundIndex={3} rows={rows} waiting={{ done: 2, total: 2 }} maxLives={3} onExit={() => {}} />)
    expect(container.querySelector('.quiz-choice--correct').textContent).toContain('Beta')
    expect(screen.getByText('survival.answer_was:ANSWER')).toBeTruthy()
  })
})
