import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../../auth'
import { PSEUDO_STORAGE_KEY, getSavedPseudo } from '../../../utils/account'
import { containsProfanity } from '../../../utils/profanity'
import { joinRoom } from '../../../utils/multiplayerRoom'

export default function JoinForm({ room, playerId }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  // Signed in: the account's username until the player types another one
  const [typed, setTyped] = useState(null)
  const pseudo = typed ?? account?.username ?? getSavedPseudo()
  const [joining, setJoining] = useState(false)
  const forbidden = containsProfanity(pseudo)
  // Opened from a friend's invite with an account: joins under the username right away.
  const [searchParams] = useSearchParams()
  const autoJoin = searchParams.get('invited') === '1' && Boolean(account?.username)
  const autoJoinedRef = useRef(false)

  const join = async (name) => {
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

  const onSubmit = (e) => {
    e.preventDefault()
    const name = pseudo.trim()
    if (name && !forbidden) join(name)
  }

  useEffect(() => {
    if (!autoJoin || autoJoinedRef.current) return
    autoJoinedRef.current = true
    join(account.username)
  })

  // A failed automatic join falls back to the form.
  if (autoJoin && (joining || !autoJoinedRef.current)) return <p className="mpr-waiting">{t('lobby.connecting')}</p>

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
        aria-invalid={forbidden}
      />
      {forbidden && <p className="mpr-muted" role="alert">{t('account.errors.username_forbidden')}</p>}
      <button type="submit" className="mpr-btn" disabled={!pseudo.trim() || forbidden || joining}>
        {joining ? t('lobby.connecting') : t('mp_room.join')}
      </button>
    </form>
  )
}
