/// <reference types="node" />

import { transformSync } from '@babel/core'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { CITIES, EVENT_FOUND, createGlobeState } from './globeModel'

type Worklet = ((...args: unknown[]) => unknown) & {
  __initData?: { code: string }
  __closure?: Record<string, unknown>
}

// Plain Jest executes worklets on the JS thread and misses missing UI globals.
// Compile with the shipped plugin, then recreate functions in an empty runtime
// using only the closure that would be sent to Android.
function restore(value: unknown): unknown {
  if (typeof value !== 'function') return value
  const worklet = value as Worklet
  if (!worklet.__initData) throw new Error('Expected a compiled worklet')
  const fn = runInNewContext(`(${worklet.__initData.code})`) as Worklet
  const closure = Object.fromEntries(Object.entries(worklet.__closure ?? {}).map(([key, captured]) => [key, restore(captured)]))
  return fn.bind({ __closure: closure })
}

function sceneOnUI(): typeof import('./globeModel') {
  const filename = join(__dirname, 'globeModel.ts')
  const output = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    presets: ['@babel/preset-typescript'],
    plugins: ['react-native-worklets/plugin', '@babel/plugin-transform-modules-commonjs'],
  })!
  const context: Record<string, unknown> = { exports: {} }
  context.global = context
  runInNewContext(output.code!, context)
  const compiled = context.exports as Record<string, unknown>
  return {
    stepGlobe: restore(compiled.stepGlobe),
    dragStart: restore(compiled.dragStart),
    dragMove: restore(compiled.dragMove),
  } as typeof import('./globeModel')
}

test('manual rotation and reduced-motion finds run with only serialized UI closures', () => {
  const ui = sceneOnUI()
  const state = createGlobeState()
  state.lon = CITIES[0].at[0]
  state.lat = CITIES[0].at[1]
  state.phase = 'manual'
  state.manualFind = true
  expect(ui.stepGlobe(state, 1 / 60, false)).toBe(EVENT_FOUND)
  expect(state.score).toBe(100)

  const reduced = createGlobeState()
  reduced.lon = CITIES[0].at[0]
  reduced.lat = CITIES[0].at[1]
  reduced.reduced = true
  ui.dragStart(reduced, 0)
  expect(ui.dragMove(reduced, 0, 0, 340, 16)).toBe(EVENT_FOUND)
})
