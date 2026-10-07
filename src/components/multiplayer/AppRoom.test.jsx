// src/components/multiplayer/AppRoom.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AppRoom from './AppRoom'
import { joinAppRoom } from '../../utils/appRoom'

vi.mock('../../auth', () => ({ useAccount: () => ({ account: null }) }))
vi.mock('../../utils/appRoom', async (importOriginal) => ({
  ...(await importOriginal()),
  joinAppRoom: vi.fn().mockResolvedValue(undefined),
  reportAppProgress: vi.fn().mockResolvedValue(undefined),
  submitAppResult: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../Firebase', () => ({ firestore: {} }))
vi.mock('../../pages/GamePage', () => ({ MultiplayerPlacementGame: () => null }))
vi.mock('../../pages/FlagGamePage', () => ({ MultiplayerFlagsGame: () => <div>flags-game</div> }))
vi.mock('../../pages/CapitalsGamePage', () => ({ MultiplayerCapitalsGame: () => null }))
vi.mock('../../pages/QuizPage', () => ({ PracticeQuiz: () => null }))
vi.mock('./MultiplayerBorderGuess', () => ({ default: () => null }))
vi.mock('./MultiplayerCountryClue', () => ({ default: () => null }))

const makeRoom = (overrides = {}) => ({
  id: 'ABC234',
  source: 'app',
  hostId: 'host',
  mode: 'challenge',
  status: 'playing',
  game: { id: 'flags', type: 'FLAGS', difficulty: 'Facile' },
  seed: 42,
  startAt: null,
  players: { host: { pseudo: 'Alice' } },
  ...overrides,
})

describe('AppRoom', () => {
  it('lets a website player join a room created in the app', async () => {
    render(<AppRoom room={makeRoom()} progress={{}} gameResults={{}} playerId="web" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bob' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form'))
    await waitFor(() => expect(joinAppRoom).toHaveBeenCalledWith('ABC234', 'web', 'Bob', undefined))
  })

  it('waits for the host in a live lobby', () => {
    const room = makeRoom({ mode: 'live', status: 'lobby', players: { host: { pseudo: 'Alice' }, web: { pseudo: 'Bob' } } })
    render(<AppRoom room={room} progress={{}} gameResults={{}} playerId="web" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('plays a challenge and shows the standings', () => {
    const room = makeRoom({ players: { host: { pseudo: 'Alice' }, web: { pseudo: 'Bob' } } })
    const gameResults = {
      '0_host': { playerId: 'host', pseudo: 'Alice', weightedScore: 120, countriesSolved: 10, attempts: 2, elapsedTime: 65000, total: 10 },
    }
    render(<AppRoom room={room} progress={{}} gameResults={gameResults} playerId="web" />)
    expect(screen.getByText(/120/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('flags-game')).toBeInTheDocument()
  })
})
