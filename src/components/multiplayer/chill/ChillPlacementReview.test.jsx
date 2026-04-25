import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChillPlacementReview from './ChillPlacementReview'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  GeoJSON: () => null,
  useMap: () => ({}),
}))
vi.mock('leaflet', () => ({ default: {} }))
vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('../../../data/countriesWithDifficulty_FR.json', () => ({
  default: { features: [] },
}))

const players = {
  p1: { pseudo: 'Alice' },
  p2: { pseudo: 'Bob' },
}

const baseProps = {
  mancheCountries: ['France', 'Brésil', 'Japon'],
  mancheStartIndex: 0,
  players,
  isHost: true,
  gameType: 'PLACEMENT',
  onNext: vi.fn(),
  onContinue: vi.fn(),
}

describe('ChillPlacementReview — step 0 (résumé)', () => {
  it('affiche les scores des joueurs', () => {
    const playerAnswers = {
      p1: { '0': { correct: true, clickedAdmin: 'France' }, '1': { correct: false, clickedAdmin: 'Argentine' }, '2': { correct: true, clickedAdmin: 'Japon' } },
      p2: { '0': { correct: false, clickedAdmin: 'Allemagne' }, '1': { correct: true, clickedAdmin: 'Brésil' }, '2': { correct: false, clickedAdmin: null } },
    }
    render(<ChillPlacementReview {...baseProps} reviewStep={0} playerAnswers={playerAnswers} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('affiche le bouton Voir les erreurs pour l\'hôte si erreurs', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, clickedAdmin: 'Argentine' } },
    }
    render(<ChillPlacementReview {...baseProps} mancheCountries={['France']} reviewStep={0} playerAnswers={playerAnswers} />)
    expect(screen.getByText(/Voir les erreurs/)).toBeInTheDocument()
  })

  it('affiche le bouton Continuer pour l\'hôte si aucune erreur', () => {
    const playerAnswers = {
      p1: { '0': { correct: true, clickedAdmin: 'France' } },
    }
    render(<ChillPlacementReview {...baseProps} mancheCountries={['France']} reviewStep={0} playerAnswers={playerAnswers} />)
    expect(screen.getByText(/Continuer/)).toBeInTheDocument()
  })

  it('n\'affiche pas de carte en step 0', () => {
    render(<ChillPlacementReview {...baseProps} reviewStep={0} playerAnswers={{}} />)
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument()
  })
})

describe('ChillPlacementReview — step ≥ 1 (erreurs)', () => {
  const playerAnswers = {
    p1: { '1': { correct: false, clickedAdmin: 'Argentine' } },
  }
  const props = {
    ...baseProps,
    mancheCountries: ['France', 'Brésil'],
    mancheStartIndex: 0,
    playerAnswers,
    reviewStep: 1,
  }

  it('affiche la carte', () => {
    render(<ChillPlacementReview {...props} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('affiche le compteur d\'erreurs dans la barre', () => {
    render(<ChillPlacementReview {...props} />)
    expect(screen.getByText(/Erreur 1 \/ 1/)).toBeInTheDocument()
  })

  it('affiche le pseudo du joueur dans la barre', () => {
    render(<ChillPlacementReview {...props} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('affiche la réponse donnée (rouge) dans la barre', () => {
    render(<ChillPlacementReview {...props} />)
    expect(screen.getByText('Argentine')).toBeInTheDocument()
  })

  it('affiche la réponse correcte (verte) dans la barre', () => {
    render(<ChillPlacementReview {...props} />)
    expect(screen.getByText('Brésil')).toBeInTheDocument()
  })

  it('affiche (rien) si clickedAdmin est null', () => {
    const pa = { p1: { '1': { correct: false, clickedAdmin: null } } }
    render(<ChillPlacementReview {...props} playerAnswers={pa} />)
    expect(screen.getByText('(rien)')).toBeInTheDocument()
  })

  it('affiche le bouton Suivant pour l\'hôte si pas dernière erreur', () => {
    const pa = {
      p1: { '0': { correct: false, clickedAdmin: 'Allemagne' }, '1': { correct: false, clickedAdmin: 'Argentine' } },
    }
    render(<ChillPlacementReview {...props} mancheCountries={['France', 'Brésil']} playerAnswers={pa} reviewStep={1} />)
    expect(screen.getByText(/Suivant/)).toBeInTheDocument()
  })

  it('affiche le bouton Continuer pour l\'hôte sur la dernière erreur', () => {
    render(<ChillPlacementReview {...props} />)
    expect(screen.getByText(/Continuer/)).toBeInTheDocument()
  })

  it('affiche En attente pour un non-hôte', () => {
    render(<ChillPlacementReview {...props} isHost={false} />)
    expect(screen.getByText(/En attente/)).toBeInTheDocument()
  })
})
