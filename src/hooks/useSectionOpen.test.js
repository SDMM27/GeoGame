import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useSectionOpen from './useSectionOpen'

const KEY = 'geogame:sections'

beforeEach(() => localStorage.clear())

describe('useSectionOpen', () => {
  it('follows the default until the player chooses', () => {
    const { result, rerender } = renderHook(({ open }) => useSectionOpen('a', open), { initialProps: { open: true } })
    expect(result.current[0]).toBe(true)
    rerender({ open: false })
    expect(result.current[0]).toBe(false)
  })

  it('keeps the choice over a later default, and across mounts', () => {
    const first = renderHook(({ open }) => useSectionOpen('a', open), { initialProps: { open: false } })
    act(() => first.result.current[1]())
    expect(first.result.current[0]).toBe(true)
    first.rerender({ open: false })
    expect(first.result.current[0]).toBe(true)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ a: true })
    first.unmount()
    expect(renderHook(() => useSectionOpen('a', false)).result.current[0]).toBe(true)
  })

  it('keeps every section under one key', () => {
    const a = renderHook(() => useSectionOpen('a', true))
    const b = renderHook(() => useSectionOpen('b', false))
    act(() => a.result.current[1]())
    act(() => b.result.current[1]())
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ a: false, b: true })
  })

  it('survives unreadable storage', () => {
    localStorage.setItem(KEY, '{broken')
    const { result } = renderHook(() => useSectionOpen('a', true))
    expect(result.current[0]).toBe(true)
    act(() => result.current[1]())
    expect(result.current[0]).toBe(false)
  })
})
