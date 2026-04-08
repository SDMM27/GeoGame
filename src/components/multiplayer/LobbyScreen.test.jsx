// src/components/multiplayer/LobbyScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LobbyScreen from './LobbyScreen'

vi.mock('../../utils/multiplayerRoom', () => ({
  joinRoom: vi.fn().mockResolvedValue(undefined),
  launchRoom: vi.fn().mockResolvedValue(undefined),
}))

const makeRoom = (overrides = {}) => ({
  id: 'ROOM01',
  hostId: 'host-uuid',
  status: 'lobby',
  players: {
    'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
  },
  ...overrides,
})

describe('LobbyScreen', () => {
  it('shows join form when playerId not in room', () => {
    render(
      <LobbyScreen
        room={makeRoom()}
        playerId="stranger-uuid"
        onPseudoSet={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText('Ton pseudo')).toBeInTheDocument()
  })

  it('shows player list when playerId is in room', () => {
    render(
      <LobbyScreen
        room={makeRoom()}
        playerId="host-uuid"
        onPseudoSet={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows launch button for host', () => {
    const room = makeRoom({
      players: {
        'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
        'p2-uuid':   { pseudo: 'Bob',   totalPoints: 0, disconnected: false },
      },
    })
    render(<LobbyScreen room={room} playerId="host-uuid" onPseudoSet={vi.fn()} />)
    expect(screen.getByRole('button', { name: /lancer/i })).toBeInTheDocument()
  })

  it('disables launch button when fewer than 2 connected players', () => {
    render(
      <LobbyScreen room={makeRoom()} playerId="host-uuid" onPseudoSet={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /joueurs/i })).toBeDisabled()
  })

  it('shows waiting message for non-host', () => {
    const room = makeRoom({
      players: {
        'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
        'p2-uuid':   { pseudo: 'Bob',   totalPoints: 0, disconnected: false },
      },
    })
    render(<LobbyScreen room={room} playerId="p2-uuid" onPseudoSet={vi.fn()} />)
    expect(screen.getByText(/en attente/i)).toBeInTheDocument()
  })
})
