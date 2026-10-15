import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { ProfileView } from './ProfileBody'
import { computeStats, dailyTypesOn, dayKey } from '../../utils/profileStats'
import { computeAchievements } from '../../utils/achievements'

// Midi plutôt que l'heure réelle : lancé entre minuit et 5 h, le test débloquerait « Oiseau de nuit » (et « Lève-tôt » entre 5 h et 7 h)
const now = new Date().setHours(12, 0, 0, 0)
const today = dayKey()

const games = [
  { id: '1', gameType: 'FLAGS', mode: 'standard', difficulty: 'Moyen', score: 120, found: 30, total: 40, elapsedTime: 90000, playedAt: now },
  { id: '2', gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: today, solved: true, attempts: 3, elapsedTime: 30000, playedAt: now },
  { id: '3', gameType: 'QUIZ', mode: 'daily', dailyKey: today, solved: false, attempts: 5, playedAt: now },
]

function renderView(list = games) {
  const stats = computeStats(list)
  const achievements = computeAchievements({ stats, games: list, friendsCount: 0 })
  return render(
    <MemoryRouter>
      <ProfileView games={list} stats={stats} achievements={achievements} />
    </MemoryRouter>
  )
}

describe('ProfileView', () => {
  beforeAll(() => i18n.changeLanguage('fr'))

  it('shows the stats, the streak and the history', () => {
    renderView()
    expect(screen.getByText('Parties').previousSibling).toHaveTextContent('3')
    expect(screen.getByText('Pays trouvés').previousSibling).toHaveTextContent('30')
    expect(screen.getByText('1 jour')).toBeInTheDocument()
    // Le nombre de jeux du jour dépend de la date (le Daily Challenge compte à partir du 2026-10-16)
    expect(screen.getByText(`2/${dailyTypesOn(today).length}`)).toBeInTheDocument()
    expect(screen.getByText('120 pts · 30/40')).toBeInTheDocument()
    expect(screen.getByText('Trouvé · 3 essais')).toBeInTheDocument()
    expect(screen.getByText('Raté')).toBeInTheDocument()
    expect(screen.getByText('Classique · Moyen')).toBeInTheDocument()
  })

  it('lists unlocked achievements first and can show them all', () => {
    renderView()
    expect(screen.getByText('Premier pas')).toBeInTheDocument()
    expect(screen.queryByText('Âme du salon')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Tout voir')[0])
    expect(screen.getByText('Âme du salon')).toBeInTheDocument()
  })

  it('opens the details of a past game', () => {
    renderView()
    fireEvent.click(screen.getByText('120 pts · 30/40'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Pays trouvés30/40 (75 %)')
    expect(dialog).toHaveTextContent('Durée01:30.000')
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('explains an empty history', () => {
    renderView([])
    expect(screen.getByText(/Aucune partie enregistrée/)).toBeInTheDocument()
  })
})
