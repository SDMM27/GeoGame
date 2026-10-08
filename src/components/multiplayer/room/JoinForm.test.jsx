import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import JoinForm from './JoinForm'
import { joinRoom } from '../../../utils/multiplayerRoom'

const account = vi.hoisted(() => ({ current: null }))
vi.mock('../../../auth', () => ({ useAccount: () => ({ account: account.current }) }))
vi.mock('../../../utils/multiplayerRoom', () => ({ joinRoom: vi.fn().mockResolvedValue(undefined) }))

const room = { id: 'ROOM01' }

describe('JoinForm', () => {
  beforeEach(() => {
    account.current = null
    vi.mocked(joinRoom).mockClear()
  })

  it('lets a visitor type a username', () => {
    render(<JoinForm room={room} playerId="p1" />)
    const input = screen.getByRole('textbox')
    expect(input).not.toHaveAttribute('readonly')
    fireEvent.change(input, { target: { value: 'Visiteur' } })
    fireEvent.click(screen.getByRole('button'))
    expect(joinRoom).toHaveBeenCalledWith('ROOM01', 'p1', 'Visiteur', undefined)
  })

  it("joins under the signed-in account's username, which can't be edited", () => {
    account.current = { uid: 'u1', username: 'Carto' }
    render(<JoinForm room={room} playerId="p1" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('Carto')
    expect(input).toHaveAttribute('readonly')
    fireEvent.change(input, { target: { value: 'Autre' } })
    fireEvent.click(screen.getByRole('button'))
    expect(joinRoom).toHaveBeenCalledWith('ROOM01', 'p1', 'Carto', 'u1')
  })
})
