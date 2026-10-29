import { describe, expect, it } from 'vitest'
import { findCountryOfDay } from '../utils/countryOfDay'
import { EMPTY_PROGRESS, answerCountryOfDay, nextCountryOfDayStep, resumeCountryOfDay } from './useCountryOfDayState'

const france = findCountryOfDay('France')
const start = (mode) => ({ ...EMPTY_PROGRESS, mode, startedAt: 1000 })

function play(progress, answers, now = 61000) {
  let current = progress
  const outcomes = []
  for (const answer of answers) {
    if (answer === 'next') {
      current = nextCountryOfDayStep(current)
      continue
    }
    const result = answerCountryOfDay(current, france, answer, now)
    current = result.progress
    outcomes.push(result.outcome)
  }
  return { progress: current, outcomes }
}

describe('answerCountryOfDay', () => {
  it('records the try a step was found on, then goes on', () => {
    const { progress, outcomes } = play(start('choice'), [{ admin: 'Espagne' }, { admin: 'France' }])
    expect(outcomes).toEqual(['wrong', 'right'])
    expect(progress.steps[0]).toBe(2)
    expect(progress.resolved).toBe(true)
    expect(nextCountryOfDayStep(progress).index).toBe(1)
  })

  it('ends a step after 3 wrong answers, worth nothing', () => {
    const { progress } = play(start('choice'), [{ admin: 'Espagne' }, { admin: 'Italie' }, { admin: 'Belgique' }])
    expect(progress.steps[0]).toBe(0)
    expect(progress.resolved).toBe(true)
    expect(answerCountryOfDay(progress, france, { admin: 'France' }).outcome).toBe('ignored')
  })

  it('does not use a try for the same wrong answer twice', () => {
    const { progress, outcomes } = play(start('choice'), [{ admin: 'Espagne' }, { admin: 'Espagne' }])
    expect(outcomes).toEqual(['wrong', 'ignored'])
    expect(progress.wrong[0]).toEqual(['Espagne'])
  })

  it('keeps distance and direction of a typed wrong country', () => {
    const { progress } = play(start('free'), [{ admin: 'Espagne' }])
    expect(progress.wrong[0][0]).toMatchObject({ value: 'Espagne', isCorrect: false })
    expect(progress.wrong[0][0].distanceKm).toBeGreaterThan(0)
  })

  it('accepts the capital typed in any language', () => {
    const { progress } = play(start('free'), [{ admin: 'France' }, 'next', { admin: 'France' }, 'next', { text: 'paris' }])
    expect(progress.steps.slice(0, 3)).toEqual([1, 1, 1])
  })

  it('is done after the last step, with its time', () => {
    const answers = [{ admin: 'France' }, 'next', { admin: 'France' }, 'next', { admin: 'France' }, 'next', { admin: 'Espagne' }, { admin: 'France' }]
    const { progress } = play(start('choice'), answers)
    // The last answer stays on screen, its time already counted
    expect(progress.done).toBe(false)
    expect(progress.resolved).toBe(true)
    expect(progress.steps).toEqual([1, 1, 1, 2])
    expect(progress.elapsedTime).toBe(60000)
    const done = nextCountryOfDayStep(progress)
    expect(done.done).toBe(true)
    expect(done.index).toBe(3)
    expect(nextCountryOfDayStep(done)).toBe(done)
  })

  it('ignores answers before the mode is chosen', () => {
    expect(answerCountryOfDay(EMPTY_PROGRESS, france, { admin: 'France' }).outcome).toBe('ignored')
  })
})

describe('resumeCountryOfDay', () => {
  it('starts over from nothing or broken data', () => {
    expect(resumeCountryOfDay(null)).toBe(EMPTY_PROGRESS)
    expect(resumeCountryOfDay({ mode: 'other' })).toBe(EMPTY_PROGRESS)
  })

  it('resumes a game where it was', () => {
    const saved = { mode: 'free', index: 2, steps: [1, 0, 0, 0], wrong: [[], ['Italie', 'Belgique', 'Espagne'], ['Lyon'], []], resolved: false, startedAt: 5 }
    expect(resumeCountryOfDay(JSON.parse(JSON.stringify(saved)))).toMatchObject(saved)
  })

  it('clamps forged values', () => {
    const resumed = resumeCountryOfDay({ mode: 'choice', index: 12, steps: [7, -1, 2, 'x'] })
    expect(resumed.index).toBe(3)
    expect(resumed.steps).toEqual([0, 0, 2, 0])
  })
})
