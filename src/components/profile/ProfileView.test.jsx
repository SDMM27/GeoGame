import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
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
  { id: '3', gameType: 'COUNTRY_OF_DAY', mode: 'daily', dailyKey: today, solved: false, attempts: 5, score: 160, playedAt: now },
]

function renderView(list = games, props = {}) {
  const stats = computeStats(list)
  const achievements = computeAchievements({ stats, games: list, friendsCount: 0 })
  return render(
    <MemoryRouter>
      <ProfileView games={list} stats={stats} achievements={achievements} {...props} />
    </MemoryRouter>
  )
}

// The history starts folded: open it from its header
const openHistory = () => fireEvent.click(screen.getByRole('button', { name: 'Dernières parties' }))

describe('ProfileView', () => {
  beforeAll(() => i18n.changeLanguage('fr'))
  beforeEach(() => localStorage.clear())

  it('shows the stats, the streak and the history', () => {
    renderView()
    openHistory()
    expect(screen.getByText('Parties').previousSibling).toHaveTextContent('3')
    expect(screen.getByText('Pays trouvés').previousSibling).toHaveTextContent('30')
    expect(screen.getByText('1 jour')).toBeInTheDocument()
    // Le nombre de jeux du jour dépend de la date (le Daily Challenge compte à partir du 2026-10-16)
    expect(screen.getByText(`2/${dailyTypesOn(today).length}`)).toBeInTheDocument()
    // Once in the folded header's summary, once in the row
    expect(screen.getAllByText('120 pts · 30/40')).toHaveLength(2)
    expect(screen.getByText('Trouvé · 3 essais')).toBeInTheDocument()
    expect(screen.getByText('160 pts')).toBeInTheDocument()
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
    openHistory()
    fireEvent.click(screen.getAllByText('120 pts · 30/40')[1])
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Pays trouvés30/40 (75 %)')
    expect(dialog).toHaveTextContent('Durée01:30.000')
    fireEvent.click(screen.getByLabelText('Fermer'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it("folds the achievements of your own profile but opens another player's, with the summary always shown", () => {
    renderView(games, { own: true })
    expect(screen.getByRole('button', { name: 'Succès' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Premier pas')).not.toBeInTheDocument()
    expect(screen.getByText(/^1\/\d+$/)).toBeInTheDocument()
    cleanup()
    renderView(games)
    expect(screen.getByRole('button', { name: 'Succès' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Premier pas')).toBeInTheDocument()
  })

  it('puts the friends then the collection right after the streak, and remembers what was opened', () => {
    const view = renderView(games, { own: true, friends: <p>mes-amis</p>, collection: <p>ma-collection</p> })
    const children = [...view.container.querySelector('.profile-body').children]
    const at = (match) => children.findIndex((node) => match(node))
    const streak = at((node) => node.classList.contains('profile-streak'))
    expect(streak).toBeGreaterThan(-1)
    expect(at((node) => node.textContent === 'mes-amis')).toBe(streak + 1)
    expect(at((node) => node.textContent === 'ma-collection')).toBe(streak + 2)
    fireEvent.click(screen.getByRole('button', { name: 'Succès' }))
    view.unmount()
    renderView(games, { own: true })
    expect(screen.getByRole('button', { name: 'Succès' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('explains an empty history', () => {
    renderView([])
    openHistory()
    expect(screen.getByText(/Aucune partie enregistrée/)).toBeInTheDocument()
  })
})
