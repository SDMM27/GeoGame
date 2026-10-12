// Room invites on the website: the banner, the "Invite friends" card and the automatic join from an invite.
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import InviteBanner from './InviteBanner'
import InviteFriends from './room/InviteFriends'
import JoinForm from './room/JoinForm'
import { dismissInvite, sendRoomInvite } from '../../utils/invites'
import { requestPush } from '../../utils/pushApi'
import { joinRoom } from '../../utils/multiplayerRoom'

const account = { uid: 'me', username: 'Alice' }
const invite = { id: 'ABC234_me', from: 'bob', fromUsername: 'Bob', room: 'ABC234', gameId: 'flags', mode: 'live', at: 1 }
let invites = []
let friends = []

vi.mock('../../auth', () => ({ useAccount: () => ({ account }) }))
vi.mock('../../hooks/usePlayerProfile', () => ({
  useFriendships: () => ({ loading: false, all: friends, friends }),
}))
vi.mock('../../utils/invites', () => ({
  inviteId: (room, to) => `${room}_${to}`,
  sendRoomInvite: vi.fn(() => Promise.resolve()),
  dismissInvite: vi.fn(() => Promise.resolve()),
  watchInvites: (uid, callback) => {
    callback(invites)
    return () => {}
  },
}))
vi.mock('../../utils/pushApi', () => ({ requestPush: vi.fn() }))
vi.mock('../../utils/multiplayerRoom', () => ({ joinRoom: vi.fn(() => Promise.resolve()) }))

function Where() {
  const location = useLocation()
  return <div data-testid="where">{location.pathname + location.search}</div>
}

const renderAt = (path, ui) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <Where />
    </MemoryRouter>
  )

const room = {
  id: 'ABC234',
  mode: 'live',
  status: 'lobby',
  game: { id: 'flags', type: 'FLAGS' },
  players: { me: { pseudo: 'Alice', uid: 'me' }, x: { pseudo: 'Carol', uid: 'carol' } },
}

beforeEach(() => {
  vi.clearAllMocks()
  invites = []
  friends = []
})

describe('InviteBanner', () => {
  it('announces a friend’s invite and joins the room', () => {
    invites = [invite]
    renderAt('/', <InviteBanner />)
    expect(screen.getByText('Bob t’invite à jouer à Trouve le Drapeau')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(dismissInvite).toHaveBeenCalledWith('ABC234_me')
    expect(screen.getByTestId('where')).toHaveTextContent('/multiplayer/room/ABC234?invited=1')
  })

  it('stays out of games and of the Multi pages', () => {
    invites = [invite]
    renderAt('/flag-game', <InviteBanner />)
    expect(screen.queryByRole('button', { name: 'Rejoindre' })).toBeNull()
  })

  it('can be closed for later', () => {
    invites = [invite]
    renderAt('/', <InviteBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByRole('button', { name: 'Rejoindre' })).toBeNull()
    expect(dismissInvite).not.toHaveBeenCalled()
  })
})

describe('InviteFriends', () => {
  it('invites a friend into the room and asks for a push', async () => {
    friends = [{ id: 'f1', uid: 'bob', username: 'Bob', status: 'friend' }]
    renderAt('/multiplayer/room/ABC234', <InviteFriends room={room} />)
    fireEvent.click(screen.getByRole('button', { name: 'Inviter' }))
    await waitFor(() => expect(screen.getByText('✓ Invité')).toBeInTheDocument())
    expect(sendRoomInvite).toHaveBeenCalledWith(account, 'bob', room)
    expect(requestPush).toHaveBeenCalledWith('invite-push', { inviteId: 'ABC234_bob' })
  })

  it('shows the friends already in the room', () => {
    friends = [{ id: 'f2', uid: 'carol', username: 'Carol', status: 'friend' }]
    renderAt('/multiplayer/room/ABC234', <InviteFriends room={room} />)
    expect(screen.getByText('✓ Dans la partie')).toBeInTheDocument()
  })
})

describe('JoinForm', () => {
  it('joins under the account’s username when opened from an invite', async () => {
    renderAt('/multiplayer/room/ABC234?invited=1', <Routes><Route path="/multiplayer/room/:roomId" element={<JoinForm room={room} playerId="web" />} /></Routes>)
    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('ABC234', 'web', 'Alice', 'me'))
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('asks for a username without an invite', () => {
    renderAt('/multiplayer/room/ABC234', <JoinForm room={room} playerId="web" />)
    expect(screen.getByRole('textbox')).toHaveValue('Alice')
    expect(joinRoom).not.toHaveBeenCalled()
  })
})
