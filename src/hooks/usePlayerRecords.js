import { useCallback, useEffect, useState } from 'react'
import { buildRecordsGrid, fetchPlayerRecords } from '../utils/playerRecords'

// The solo records of a player as the grid of buildRecordsGrid: { loading, error, grid, reload }.
// `reload` fetches them again (e.g. on focus) without showing the loading state.
export function usePlayerRecords(uid) {
  const [state, setState] = useState({ loading: true, error: false, grid: null })

  const reload = useCallback(() => {
    if (!uid) return
    fetchPlayerRecords(uid)
      .then((records) => setState({ loading: false, error: false, grid: buildRecordsGrid(records) }))
      .catch((error) => {
        console.warn('[records]', error?.code, error)
        setState((previous) => ({ ...previous, loading: false, error: previous.grid === null }))
      })
  }, [uid])

  useEffect(() => {
    setState({ loading: true, error: false, grid: null })
    reload()
  }, [reload])

  return { ...state, reload }
}
