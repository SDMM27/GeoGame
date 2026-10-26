// @vitest-environment node
import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { computeLimits, perfectScoresSource, syncRules } from './scoreCaps.mjs'

describe('score caps', () => {
  it('are the ones written in firestore.rules (run: node scripts/scoreCaps.mjs --write)', () => {
    const { maps } = computeLimits()
    const { stale, missing } = syncRules(readFileSync('firestore.rules', 'utf8'), maps)
    expect({ stale, missing }).toEqual({ stale: [], missing: [] })
  })

  it('are the perfect scores of src/utils/perfectScores.js (run: node scripts/scoreCaps.mjs --write)', () => {
    const { solo } = computeLimits()
    const strip = (text) => text.replace(/\s+/g, '')
    expect(strip(readFileSync('src/utils/perfectScores.js', 'utf8'))).toBe(strip(perfectScoresSource(solo)))
  })

  it('give the Daily Challenge its 12 rounds and a minimum time', () => {
    const { maps } = computeLimits()
    expect(maps.challengeCaps).toEqual({ rounds: 12, minTime: 1200 })
  })

  it('leave room above the best run and never below it', () => {
    const { solo, ascension } = computeLimits()
    for (const row of [...solo.rows, ...ascension.rows]) expect(row.cap).toBeGreaterThan(row.max)
  })
})
