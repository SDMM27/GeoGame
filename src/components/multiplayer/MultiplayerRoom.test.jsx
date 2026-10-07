// src/components/multiplayer/MultiplayerRoom.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MultiplayerRoom from './MultiplayerRoom'
import { joinRoom, launchRoom } from '../../utils/multiplayerRoom'

vi.mock('../../auth', () => ({ useAccount: () => ({ account: null }) }))
vi.mock('../../utils/multiplayerRoom', async (importOriginal) => ({
  ...(await importOriginal()),
  joinRoom: vi.fn().mockResolvedValue(undefined),
  launchRoom: vi.fn().mockResolvedValue(undefined),
  touchPlayer: vi.fn().mockResolvedValue(undefined),
  transferHost: vi.fn().mockResolvedValue(undefined),
  reportProgress: vi.fn().mockResolvedValue(undefined),
  submitResult: vi.fn().mockResolvedValue(undefined),
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

describe('MultiplayerRoom', () => {
  it('lets a website player join a room created in the app', async () => {
    render(<MultiplayerRoom room={makeRoom()} progress={{}} gameResults={{}} playerId="web" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bob' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form'))
    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('ABC234', 'web', 'Bob', undefined))
  })

  it('waits for the host in a live lobby', () => {
    const room = makeRoom({ mode: 'live', status: 'lobby', players: { host: { pseudo: 'Alice' }, web: { pseudo: 'Bob' } } })
    render(<MultiplayerRoom room={room} progress={{}} gameResults={{}} playerId="web" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /▶/ })).toBeNull()
  })

  it('plays a challenge and shows the standings', () => {
    const room = makeRoom({ players: { host: { pseudo: 'Alice' }, web: { pseudo: 'Bob' } } })
    const gameResults = {
      '0_host': { playerId: 'host', pseudo: 'Alice', weightedScore: 120, countriesSolved: 10, attempts: 2, elapsedTime: 65000, total: 10 },
    }
    render(<MultiplayerRoom room={room} progress={{}} gameResults={gameResults} playerId="web" />)
    expect(screen.getByText(/120/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /▶/ }))
    expect(screen.getByText('flags-game')).toBeInTheDocument()
  })

  it('lets the host launch a live room', async () => {
    const room = makeRoom({ mode: 'live', status: 'lobby', createdOn: 'web', players: { web: { pseudo: 'Bob' } }, hostId: 'web' })
    render(<MultiplayerRoom room={room} progress={{}} gameResults={{}} playerId="web" />)
    fireEvent.click(screen.getByRole('button', { name: /▶/ }))
    await waitFor(() => expect(launchRoom).toHaveBeenCalledWith('ABC234'))
  })
})
