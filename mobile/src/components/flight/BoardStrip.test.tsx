import { act, create } from 'react-test-renderer'

import { BoardStrip } from './BoardStrip'

describe('BoardStrip', () => {
  it('shows each cell label and value, read as « label, value »', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <BoardStrip cells={[{ label: 'ESCALE', value: '04/10' }, { label: 'SCORE', value: '1200' }, { label: 'TEMPS', value: '00:18', color: '#3DDC97' }]} />,
      )
    })
    const json = JSON.stringify(tree.toJSON())
    for (const text of ['ESCALE', '04/10', 'SCORE', '1200', '00:18', 'SCORE, 1200']) expect(json).toContain(text)
  })
})
