import { RING_WIDTH, RING_WIDTH_DOUBLE, ringBorder } from './decorationStyle'

describe('ringBorder', () => {
  it('draws nothing without a frame', () => {
    expect(ringBorder(null)).toBeNull()
  })

  it('draws a solid ring in the frame color', () => {
    expect(ringBorder({ color: '#5FD4F4', style: 'solid' })).toEqual({ borderColor: '#5FD4F4', borderStyle: 'solid', borderWidth: RING_WIDTH })
  })

  it('draws a dashed ring', () => {
    expect(ringBorder({ color: '#3DDC97', style: 'dashed' })?.borderStyle).toBe('dashed')
  })

  it('draws "double" as a thicker solid ring', () => {
    expect(ringBorder({ color: '#F5B83D', style: 'double' })).toEqual({ borderColor: '#F5B83D', borderStyle: 'solid', borderWidth: RING_WIDTH_DOUBLE })
  })
})
