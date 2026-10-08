// @vitest-environment node
import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { computeLimits, syncRules } from './scoreCaps.mjs'

describe('score caps', () => {
  it('are the ones written in firestore.rules (run: node scripts/scoreCaps.mjs --write)', () => {
    const { maps } = computeLimits()
    const { stale, missing } = syncRules(readFileSync('firestore.rules', 'utf8'), maps)
    expect({ stale, missing }).toEqual({ stale: [], missing: [] })
  })

  it('leave room above the best run and never below it', () => {
    const { solo, ascension } = computeLimits()
    for (const row of [...solo.rows, ...ascension.rows]) expect(row.cap).toBeGreaterThan(row.max)
  })
})
