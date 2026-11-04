import { act, create } from 'react-test-renderer'

import { clampAxis, clampScale, EmpireMap, frameOn, stageAt } from './EmpireMap'

/* eslint-disable @typescript-eslint/no-require-imports */
// The mock's shared values forget their content on every render: these keep it, as the real ones do
jest.mock('react-native-reanimated', () => {
  const { useRef } = require('react')
  return {
    ...require('react-native-reanimated/mock'),
    useSharedValue: (init: unknown) => useRef({ value: init, get() { return this.value }, set(next: unknown) { this.value = next } }).current as unknown,
  }
})
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
// Skia does not load in jest: its elements become plain host nodes
jest.mock('@shopify/react-native-skia', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react')
  const host = (name: string) => {
    const Host = (props: Record<string, unknown>) => createElement(name, props)
    Host.displayName = name
    return Host
  }
  return { Canvas: host('mock-canvas'), Group: host('mock-group'), Path: host('mock-path') }
})
// A tap handler the test can call: the tap gesture keeps its onEnd callback
const mockTap: { end?: (event: { x: number; y: number }, success: boolean) => void } = {}
jest.mock('react-native-gesture-handler', () => {
  const chain = (): unknown => new Proxy(() => {}, { get: () => chain(), apply: () => chain() })
  const tap = (): unknown =>
    new Proxy(() => {}, {
      get: (_, name) => (name === 'onEnd' ? (callback: typeof mockTap.end) => ((mockTap.end = callback), tap()) : tap()),
      apply: () => tap(),
    })
  return { Gesture: { Pan: chain, Pinch: chain, Tap: tap, Simultaneous: chain }, GestureDetector: ({ children }: { children: unknown }) => children }
})
// The map space of the mock is the plane itself: x = longitude, y = latitude; a stage "holds" the x range in its name
jest.mock('@/components/map/geometry', () => ({
  BASE_ZOOM: 2,
  WORLD_SIZE: 1024,
  getBaseTiles: () => [],
  getCountryShapes: () => new Map(),
  lodLevel: () => 0,
  project: (lat: number, lng: number) => ({ x: lng, y: lat }),
  featurePath: (feature: { properties: { stage: string } }) => {
    const [from, to] = { a: [0, 35], b: [25, 60] }[feature.properties.stage] as number[]
    return { contains: (x: number) => x >= from && x <= to }
  },
}))
jest.mock('@/components/map/WorldMap', () => ({ BaseTile: () => null }))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'fr' }, t: (key: string) => key }),
}))
const mockLoadText = jest.fn()
jest.mock('@shared/data/empireTexts', () => ({ loadEmpireText: (...args: unknown[]) => mockLoadText(...args) }))
const mockCollection = (...ids: string[]) => ({ default: { features: ids.map((stage) => ({ properties: { stage }, geometry: {} })) } })
jest.mock('@shared/data/empires', () => {
  const stages = [{ id: 'a', color: '#111111' }, { id: 'b', color: '#222222' }]
  return {
    ...jest.requireActual('@shared/data/empires'),
    EMPIRES: {
      grow: { center: [40, 30], zoom: 4, stages, load: () => Promise.resolve(mockCollection('a', 'b')) },
      compare: { center: [40, 30], zoom: 4, cumulative: false, stages, load: () => Promise.resolve(mockCollection('a', 'b')) },
      never: { center: [40, 30], zoom: 4, stages, load: () => new Promise(() => {}) },
    },
  }
})

const TEXTS = {
  stages: { a: { label: 'A1', title: 'Title a', text: 'Text a' }, b: { label: 'B2', title: 'Title b', text: 'Text b' } },
  note: 'Approximate limits.',
}

async function render(id: string) {
  let tree!: ReturnType<typeof create>
  await act(async () => {
    tree = create(<EmpireMap id={id} />)
  })
  const map = tree.root.findByProps({ testID: 'empire-map' })
  act(() => map.props.onLayout({ nativeEvent: { layout: { width: 300, height: 225 } } }))
  return tree
}
const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const stageButton = (tree: ReturnType<typeof create>, id: string) => tree.root.findAll((node) => node.props.testID === `empire-stage-${id}` && typeof node.props.onPress === 'function')[0]
const drawn = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => (node.type as unknown) === 'mock-path').map((node) => node.props.color as string).filter((color) => color !== '#141a2e')

// The mocked scheduleOnRN runs the callback on the next tick
const tap = (event: { x: number; y: number }, success: boolean) => act(async () => { mockTap.end!(event, success); await new Promise<void>((resolve) => setImmediate(() => resolve())) })

beforeEach(() => {
  mockLoadText.mockReset().mockResolvedValue(TEXTS)
  mockTap.end = undefined
})

describe('EmpireMap', () => {
  it('opens on the last stage with every territory up to it, its text and the note', async () => {
    const tree = await render('grow')
    expect(drawn(tree)).toEqual(['#111111', '#222222'])
    const out = text(tree)
    expect(out).toContain('Title b')
    expect(out).toContain('Text b')
    expect(out).toContain('Approximate limits.')
    expect(out).toContain('A1')
    expect(mockLoadText).toHaveBeenCalledWith('grow', 'fr')
  })

  it('shows nothing broken while the data and the texts load', async () => {
    mockLoadText.mockReturnValue(new Promise(() => {}))
    const tree = await render('never')
    expect(drawn(tree)).toEqual([])
    const out = text(tree)
    expect(out).not.toContain('Title')
    expect(out).not.toContain('Approximate limits.')
    // Buttons named by the stage ids until the labels arrive
    expect(stageButton(tree, 'a')).toBeTruthy()
    expect(out).toContain('"a"')
  })

  it('moves through the stages with the buttons', async () => {
    const tree = await render('grow')
    act(() => stageButton(tree, 'a').props.onPress())
    expect(drawn(tree)).toEqual(['#111111'])
    expect(text(tree)).toContain('Title a')
    expect(text(tree)).not.toContain('Title b')
    expect(stageButton(tree, 'a').props.accessibilityState).toEqual({ selected: true })
    act(() => stageButton(tree, 'b').props.onPress())
    expect(drawn(tree)).toEqual(['#111111', '#222222'])
  })

  it('shows only the current stage when the empire is not cumulative', async () => {
    const tree = await render('compare')
    expect(drawn(tree)).toEqual(['#222222'])
    act(() => stageButton(tree, 'a').props.onPress())
    expect(drawn(tree)).toEqual(['#111111'])
  })

  it('selects the stage of the tapped territory, the topmost one where two overlap', async () => {
    const tree = await render('grow')
    // The view is 300 x 225 at scale 4 and held at the world corner: the screen point (x, y) is the map point (x / 4, y / 4)
    await tap({ x: 40, y: 100 }, true)
    expect(text(tree)).toContain('Title a')
    await tap({ x: 120, y: 160 }, true)
    expect(text(tree)).toContain('Title b')
    // Nothing there: the selection stays
    await tap({ x: 280, y: 160 }, true)
    expect(text(tree)).toContain('Title b')
    // A tap that is not one (the finger moved) selects nothing
    await tap({ x: 40, y: 100 }, false)
    expect(text(tree)).toContain('Title b')
    // The selected territory is drawn stronger; a stage button clears it
    await tap({ x: 40, y: 100 }, true)
    const opacities = tree.root.findAll((node) => (node.type as unknown) === 'mock-path' && node.props.color === '#111111').map((node) => node.props.opacity)
    expect(opacities[0]).toBe(0.95)
    act(() => stageButton(tree, 'b').props.onPress())
    expect(text(tree)).toContain('Title b')
  })
})

describe('view maths', () => {
  it('keeps the viewport inside the world', () => {
    expect(clampAxis(50, 300, 4)).toBe(0)
    expect(clampAxis(-99999, 300, 4)).toBe(300 - 1024 * 4)
    expect(clampAxis(-120, 300, 4)).toBe(-120)
    expect(clampScale(0.1)).toBe(2)
    expect(clampScale(999)).toBe(32)
  })

  it('frames the empire centre at the zoom of a Leaflet map', () => {
    // Zoom 6 is 16 map units per point; the centre (lat 40, lon 30) is the mock plane's (30, 40): it lands in the middle
    expect(frameOn([40, 30], 6, 300, 200)).toEqual({ scale: 16, tx: 150 - 30 * 16, ty: 100 - 40 * 16 })
    // Never past the edge of the world, nor out of the zoom limits
    expect(frameOn([0, 0], 4, 300, 200)).toEqual({ scale: 4, tx: 0, ty: 0 })
    expect(frameOn([40, 30], 12, 300, 200).scale).toBe(32)
  })

  it('finds the topmost shown stage at a point', () => {
    const paths = new Map([
      ['a', { contains: (x: number) => x < 10 }],
      ['b', { contains: (x: number) => x < 20 }],
    ])
    expect(stageAt(paths, ['a', 'b'], 5, 0)).toBe('b')
    expect(stageAt(paths, ['a'], 5, 0)).toBe('a')
    expect(stageAt(paths, ['a', 'b'], 15, 0)).toBe('b')
    expect(stageAt(paths, ['a', 'b'], 25, 0)).toBeNull()
    expect(stageAt(paths, [], 5, 0)).toBeNull()
  })
})
