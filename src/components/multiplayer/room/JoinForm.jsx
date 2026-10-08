import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../../auth'
import { PSEUDO_STORAGE_KEY, getSavedPseudo } from '../../../utils/account'
import { containsProfanity } from '../../../utils/profanity'
import { joinRoom } from '../../../utils/multiplayerRoom'

export default function JoinForm({ room, playerId }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  // Signed in: always the account's username, like their solo scores
  const [typed, setTyped] = useState(null)
  const pseudo = account?.username ?? typed ?? getSavedPseudo()
  const [joining, setJoining] = useState(false)
  const forbidden = containsProfanity(pseudo)

  const onSubmit = async (e) => {
    e.preventDefault()
    const name = pseudo.trim()
    if (!name || forbidden) return
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
      <p className="mpr-muted">{t(account?.username ? 'mp_room.join_hint_account' : 'mp_room.join_hint')}</p>
      <input
        className="mpr-input"
        placeholder={t('placeholders.username')}
        value={pseudo}
        onChange={(e) => setTyped(e.target.value)}
        maxLength={20}
        readOnly={Boolean(account?.username)}
        autoFocus={!account?.username}
        aria-invalid={forbidden}
      />
      {forbidden && <p className="mpr-muted" role="alert">{t('account.errors.username_forbidden')}</p>}
      <button type="submit" className="mpr-btn" disabled={!pseudo.trim() || forbidden || joining}>
        {joining ? t('lobby.connecting') : t('mp_room.join')}
      </button>
    </form>
  )
}
