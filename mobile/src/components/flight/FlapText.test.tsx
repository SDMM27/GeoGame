import { Text } from 'react-native'
import { act, create } from 'react-test-renderer'

import { useFlapText } from './FlapText'

jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }))

it('keeps the complete title from the first frame, settles left to right, and replays on reopening', () => {
  const frames = new Map<number, FrameRequestCallback>()
  let nextId = 0
  const request = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    frames.set(++nextId, cb)
    return nextId
  })
  const cancel = jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => { if (id != null) frames.delete(id) })
  const text = 'CHALLENGE DU JOUR'
  function Title({ active }: { active: boolean }) {
    return <Text testID="title">{useFlapText(text, { delay: 260, reduced: !active })}</Text>
  }
  let tree!: ReturnType<typeof create>
  const shown = () => tree.root.findByProps({ testID: 'title' }).props.children as string
  const tick = (time: number) => act(() => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((cb) => cb(time))
  })
  try {
    act(() => { tree = create(<Title active={false} />) })
    expect(shown()).toBe(text)
    act(() => tree.update(<Title active />))
    expect(shown()).toHaveLength(text.length)
    expect(shown()).not.toBe(text)
    tick(0)
    tick(710)
    expect(shown().slice(0, 8)).toBe(text.slice(0, 8))
    expect(shown()).toHaveLength(text.length)
    tick(1160)
    expect(shown()).toBe(text)
    expect(frames.size).toBe(0)
    act(() => tree.update(<Title active={false} />))
    act(() => tree.update(<Title active />))
    expect(shown()).not.toBe(text)
    expect(shown()).toHaveLength(text.length)
    tick(2000)
    act(() => tree.update(<Title active={false} />))
    expect(frames.size).toBe(0)
    expect(shown()).toBe(text)
  } finally {
    act(() => tree?.unmount())
    request.mockRestore()
    cancel.mockRestore()
  }
})
