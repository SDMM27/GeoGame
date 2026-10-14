// The friend candidates list (search results, players met, community) and its buttons.
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FriendCandidates from './FriendCandidates'
import { sendFriendRequestTo } from '../../utils/friends'

const account = { uid: 'me', username: 'Alice' }
const players = [
  { uid: 'bob', name: 'Bob' },
  { uid: 'carol', name: 'Carol' },
  { uid: 'dave', name: 'Dave' },
  { uid: 'erin', name: 'Erin' },
  { uid: 'me', name: 'Alice' },
]
const friendships = {
  all: [
    { uid: 'carol', status: 'friend' },
    { uid: 'dave', status: 'outgoing' },
    { uid: 'erin', status: 'incoming' },
  ],
}

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))
vi.mock('./BadgeStrip', () => ({ default: () => null }))
vi.mock('../../utils/friends', () => ({
  sendFriendRequestTo: vi.fn(() => Promise.resolve({ uid: 'bob', username: 'Bob' })),
  friendErrorKey: () => 'generic',
}))

const renderList = (props) =>
  render(
    <MemoryRouter>
      <FriendCandidates players={players} account={account} friendships={friendships} {...props} />
    </MemoryRouter>
  )

beforeEach(() => vi.clearAllMocks())

describe('FriendCandidates', () => {
  it('shows the button that fits where each pair stands, and none for yourself', () => {
    renderList()
    expect(screen.getAllByRole('button', { name: 'friends.add' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'friends.accept' })).toHaveLength(1)
    expect(screen.getByText(/friends\.is_friend/)).toBeTruthy()
    expect(screen.getByText(/friends\.request_sent/)).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('sends the request to the player picked and reports it', async () => {
    const onMessage = vi.fn()
    renderList({ onMessage })
    fireEvent.click(screen.getByRole('button', { name: 'friends.add' }))
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith({ kind: 'notice', text: 'friends.sent' }))
    expect(sendFriendRequestTo).toHaveBeenCalledWith({ uid: 'me', username: 'Alice' }, 'bob', friendships.all)
  })

  it('reports a failure', async () => {
    sendFriendRequestTo.mockRejectedValueOnce(new Error('network'))
    const onMessage = vi.fn()
    renderList({ onMessage })
    fireEvent.click(screen.getByRole('button', { name: 'friends.add' }))
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith({ kind: 'error', text: 'friends.errors.generic' }))
  })

  it('lists the players without buttons for a visitor, and nothing for an empty list', () => {
    const { container, rerender } = renderList({ account: null })
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Bob')).toBeTruthy()
    rerender(
      <MemoryRouter>
        <FriendCandidates players={[]} account={account} friendships={friendships} />
      </MemoryRouter>
    )
    expect(container.querySelector('ul')).toBeNull()
  })
})
