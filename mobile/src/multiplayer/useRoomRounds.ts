// Border Guess / Country Clue in a room: a series of countries, one round each.
// Tallies countries found and wrong guesses, and reports the result after the last round.
import { useEffect, useRef, useState } from 'react'

import type { RoomPlay } from './RoomPlay'

type RoundState = {
  // Whether the game hook already plays this round's country (it switches one render after the round index)
  isCurrent: boolean
  isComplete: boolean
  isSolved: boolean
  wrongGuesses: number
}

export type RoomRounds = ReturnType<typeof useRoomRounds>

// Call before the game hook: gives the country to play.
export function useRoomRounds(play: RoomPlay | undefined) {
  const countries = play?.content.list ?? []
  const [index, setIndex] = useState(0)
  const [startedAt] = useState(() => Date.now())
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [tally, setTally] = useState({ solved: 0, errors: 0 })
  const [showResults, setShowResults] = useState(false)
  const isLast = index >= countries.length - 1

  return {
    play,
    countries,
    country: play ? (countries[index] ?? null) : null,
    index,
    total: countries.length,
    isLast,
    tally,
    setTally,
    startedAt,
    endedAt,
    setEndedAt,
    elapsedTime: endedAt != null ? endedAt - startedAt : null,
    showResults,
    next: () => (isLast ? setShowResults(true) : setIndex((value) => value + 1)),
  }
}

// Call after the game hook: counts each finished round once.
export function useRoundResult(rounds: RoomRounds, { isCurrent, isComplete, isSolved, wrongGuesses }: RoundState) {
  const { play, index, tally, setTally, isLast, startedAt, setEndedAt } = rounds
  const countedRef = useRef(-1)

  useEffect(() => {
    if (!play || !isComplete || !isCurrent || countedRef.current === index) return
    countedRef.current = index
    const next = { solved: tally.solved + (isSolved ? 1 : 0), errors: tally.errors + wrongGuesses }
    setTally(next)
    play.reportFound(next.solved)
    if (isLast) {
      const now = Date.now()
      setEndedAt(now)
      play.finish({ weightedScore: next.solved, countriesSolved: next.solved, attempts: next.errors, elapsedTime: now - startedAt })
    }
  }, [play, isComplete, isCurrent, index, isSolved, wrongGuesses, tally, setTally, isLast, startedAt, setEndedAt])
}
