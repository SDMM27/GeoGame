import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../../auth'
import { PSEUDO_STORAGE_KEY, getSavedPseudo } from '../../../utils/account'
import { joinRoom } from '../../../utils/multiplayerRoom'

export default function JoinForm({ room, playerId }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  // Signed in: the account's username until the player types another one
  const [typed, setTyped] = useState(null)
  const pseudo = typed ?? account?.username ?? getSavedPseudo()
  const [joining, setJoining] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    const name = pseudo.trim()
    if (!name) return
    setJoining(true)
    try {
      try {
        localStorage.setItem(PSEUDO_STORAGE_KEY, name)
      } catch {
        // Storage unavailable — prefill is only a convenience.
      }
      await joinRoom(room.id, playerId, name, account?.uid)
    } catch (err) {
      console.error(err)
      setJoining(false)
    }
  }

  return (
    <form className="mpr-card" onSubmit={onSubmit}>
      <p className="mpr-muted">{t('mp_room.join_hint')}</p>
      <input
        className="mpr-input"
        placeholder={t('placeholders.username')}
        value={pseudo}
        onChange={(e) => setTyped(e.target.value)}
        maxLength={20}
        autoFocus
      />
      <button type="submit" className="mpr-btn" disabled={!pseudo.trim() || joining}>
        {joining ? t('lobby.connecting') : t('mp_room.join')}
      </button>
    </form>
  )
}
