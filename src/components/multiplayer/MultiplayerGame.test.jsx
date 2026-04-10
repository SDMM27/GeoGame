// src/components/multiplayer/MultiplayerGame.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import MultiplayerGame from './MultiplayerGame'
import { updatePlayerProgress } from '../../utils/multiplayerRoom'

// Snapshot mock — contrôlé par chaque test
const mockLoadSnapshot = vi.fn()
vi.mock('../../utils/multiplayerSnapshot', () => ({
  snapshotKey: (roomId, playerId, gameIndex) => `snap_${roomId}_${playerId}_${gameIndex}`,
  loadSnapshot: (...args) => mockLoadSnapshot(...args),
  saveSnapshot: vi.fn(),
}))

vi.mock('../../utils/multiplayerRoom', () => ({
  updatePlayerProgress: vi.fn().mockResolvedValue(undefined),
  writeGameResult: vi.fn().mockResolvedValue(undefined),
  updateRoomStatus: vi.fn().mockResolvedValue(undefined),
  updateTotalPoints: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../utils/multiplayerSeed', () => ({
  getSeededCountriesForGame: vi.fn().mockReturnValue([]),
}))

vi.mock('../../utils/multiplayerScoring', () => ({
  rankResults: vi.fn().mockReturnValue([]),
}))

vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TS'),
}))

// Stub des composants de jeu — on veut juste vérifier lequel est rendu
vi.mock('../../pages/GamePage', () => ({ MultiplayerPlacementGame: () => <div data-testid="placement-game" /> }))
vi.mock('../../pages/FlagGamePage', () => ({ MultiplayerFlagsGame: () => <div data-testid="flags-game" /> }))
vi.mock('../../pages/CapitalsGamePage', () => ({ MultiplayerCapitalsGame: () => <div data-testid="capitals-game" /> }))
vi.mock('./MultiplayerBorderGuess', () => ({ default: () => <div data-testid="border-game" /> }))
vi.mock('./MultiplayerCountryClue', () => ({ default: () => <div data-testid="clue-game" /> }))
vi.mock('./LiveSidebar', () => ({ default: () => <div data-testid="live-sidebar" /> }))

const makeRoom = (overrides = {}) => ({
  currentGameIndex: 0,
  hostId: 'host-uuid',
  seed: 42,
  startAt: null,
  players: {
    'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
    'p2-uuid':   { pseudo: 'Bob',   totalPoints: 0, disconnected: false },
  },
  config: {
    games: [{ type: 'placement', mode: 'classic', difficulty: 'medium' }],
  },
  ...overrides,
})

const defaultProgress = {}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadSnapshot.mockReturnValue(null)
})

describe('MultiplayerGame — anti-cheat', () => {
  it("affiche l\u2019\u00e9cran d\u2019attente si le snapshot local est completed", () => {
    mockLoadSnapshot.mockReturnValue({ completed: true, savedAt: Date.now() })

    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={defaultProgress}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )

    expect(screen.getByText(/tu as termin\u00e9/i)).toBeInTheDocument()
    expect(screen.queryByTestId('placement-game')).not.toBeInTheDocument()
    expect(updatePlayerProgress).toHaveBeenCalledWith(
      'ROOM01',
      'p2-uuid',
      expect.objectContaining({ finished: true })
    )
  })

  it("affiche l\u2019\u00e9cran d\u2019attente si Firestore indique finished:true", () => {
    const progressWithFinished = {
      'p2-uuid': { gameIndex: 0, finished: true, countriesFound: 5 },
    }

    const { rerender } = render(
      <MultiplayerGame
        room={makeRoom()}
        progress={defaultProgress}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )

    // Pas encore d'écran d'attente — progress vide au départ
    expect(screen.queryByText(/tu as termin\u00e9/i)).not.toBeInTheDocument()

    // Firestore arrive avec finished:true
    act(() => {
      rerender(
        <MultiplayerGame
          room={makeRoom()}
          progress={progressWithFinished}
          playerId="p2-uuid"
          roomId="ROOM01"
        />
      )
    })

    expect(screen.getByText(/tu as termin\u00e9/i)).toBeInTheDocument()
    expect(screen.queryByTestId('placement-game')).not.toBeInTheDocument()
  })
})
