import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addGame, roomGames } from '../../../utils/multiplayerRoom'
import { GameEditor, buildRoomGame, draftReady, newDraft } from '../RoomConfig'

/** Host: adds a game at the end of the room. */
export default function AddGame({ room, playerId }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!draft) {
    return (
      <button type="button" className="rc-add-btn" onClick={() => setDraft(newDraft())}>
        + {t('mp_room.add_game')}
      </button>
    )
  }
  const onAdd = async () => {
    setSaving(true)
    try {
      await addGame(room, buildRoomGame(draft), playerId)
      setDraft(null)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }
  return (
    <div className="mpr-card">
      <h3>{t('mp_room.game_n', { n: roomGames(room).length + 1 })}</h3>
      <GameEditor draft={draft} onChange={setDraft} />
      <div className="mpr-actions">
        <button type="button" className="mpr-btn" onClick={onAdd} disabled={saving || !draftReady(draft)}>
          {t('mp_room.add_game')}
        </button>
        <button type="button" className="mpr-link-btn" onClick={() => setDraft(null)}>
          {t('mp_room.cancel')}
        </button>
      </div>
    </div>
  )
}
