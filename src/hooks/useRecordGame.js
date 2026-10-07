import { useEffect, useRef } from 'react'
import { recordGame } from '../utils/gameHistory'

// Records `record` in the signed-in player's history once, when it goes from null to a value
// (the end of a game). Back to null (new game), the next record is saved again.
export function useRecordGameWith(auth, record) {
  const latest = useRef(record)
  latest.current = record
  const done = useRef(false)
  const finished = record != null

  useEffect(() => {
    if (!finished) {
      done.current = false
      return
    }
    if (done.current) return
    done.current = true
    recordGame(auth, latest.current)
  }, [auth, finished])
}
