import { describe, expect, it } from 'vitest'
import { pickDaily } from './dailyPick'

const names = Array.from({ length: 200 }, (_, index) => `Pays ${index}`)
const identity = (name) => name

function dayKeys(count) {
  const start = Date.UTC(2026, 9, 10)
  return Array.from({ length: count }, (_, index) => new Date(start + index * 86400000).toISOString().slice(0, 10))
}

describe('pickDaily', () => {
  it('always picks the same item for the same seed, whatever the order', () => {
    const pick = pickDaily(names, 'border-guess:2026-10-10', identity)
    expect(pickDaily([...names].reverse(), 'border-guess:2026-10-10', identity)).toBe(pick)
  })

  it('keeps the pick when another item leaves or joins the list', () => {
    for (const key of dayKeys(60)) {
      const seed = `border-guess:${key}`
      const pick = pickDaily(names, seed, identity)
      const other = names.find((name) => name !== pick)
      expect(pickDaily(names.filter((name) => name !== other), seed, identity)).toBe(pick)
      expect([pick, 'Nouveau pays']).toContain(pickDaily([...names, 'Nouveau pays'], seed, identity))
    }
  })

  it('spreads the picks over the list', () => {
    const picks = dayKeys(365).map((key) => pickDaily(names, `border-guess:${key}`, identity))
    expect(new Set(picks).size).toBeGreaterThan(120)
  })

  it('returns null for an empty list', () => {
    expect(pickDaily([], 'seed', identity)).toBeNull()
  })
})
