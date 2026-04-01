import { describe, it, expect, beforeEach } from 'vitest'

// Helper: builds a fake Leaflet layer with a name and a mutable style
function makeLayer(name, initialStyle = {}) {
  const style = { fillColor: 'transparent', fillOpacity: 1, weight: 0.85, ...initialStyle }
  return {
    feature: { properties: { ADMIN: name } },
    options: style,
    setStyle(newStyle) { Object.assign(this.options, newStyle) },
  }
}

// Simulate the guard logic we are about to implement
function makeHoverGuards(foundSet, shownSet) {
  const COUNTRY_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }
  const onMouseOver = (layer) => {
    const name = layer.feature.properties.ADMIN
    if (foundSet.has(name)) return
    if (shownSet.has(name)) return
    layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
  }
  const onMouseOut = (layer) => {
    const name = layer.feature.properties.ADMIN
    if (foundSet.has(name)) return
    if (shownSet.has(name)) return
    layer.setStyle(COUNTRY_STYLE)
  }
  return { onMouseOver, onMouseOut }
}

describe('hover guards — found countries', () => {
  let foundSet, shownSet, guards

  beforeEach(() => {
    foundSet = new Set()
    shownSet = new Set()
    guards = makeHoverGuards(foundSet, shownSet)
  })

  it('does not change style on mouseover when country is found', () => {
    const layer = makeLayer('France', { fillColor: '#4ade80' })
    foundSet.add('France')
    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
  })

  it('does not reset style on mouseout when country is found', () => {
    const layer = makeLayer('France', { fillColor: '#4ade80' })
    foundSet.add('France')
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
  })

  it('applies hover color on mouseover for normal (unfound) country', () => {
    const layer = makeLayer('Espagne')
    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#7b2ff7')
  })

  it('resets style on mouseout for normal country', () => {
    const layer = makeLayer('Espagne', { fillColor: '#7b2ff7' })
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('transparent')
  })
})

describe('hover guards — shown (red) countries', () => {
  let foundSet, shownSet, guards

  beforeEach(() => {
    foundSet = new Set()
    shownSet = new Set()
    guards = makeHoverGuards(foundSet, shownSet)
  })

  it('does not change style on mouseover when country is shown (red)', () => {
    const layer = makeLayer('Italie', { fillColor: '#ff4d4d' })
    shownSet.add('Italie')
    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#ff4d4d')
  })

  it('does not reset style on mouseout when country is shown (red)', () => {
    const layer = makeLayer('Italie', { fillColor: '#ff4d4d' })
    shownSet.add('Italie')
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('#ff4d4d')
  })
})

describe('hover guards — shown country then found', () => {
  it('once moved from shownSet to foundSet, stays green on hover', () => {
    const foundSet = new Set()
    const shownSet = new Set(['Japon'])
    const guards = makeHoverGuards(foundSet, shownSet)
    const layer = makeLayer('Japon', { fillColor: '#ff4d4d' })

    // Player finally clicks the red country correctly
    shownSet.delete('Japon')
    foundSet.add('Japon')
    layer.setStyle({ fillColor: '#4ade80' })

    guards.onMouseOver(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
    guards.onMouseOut(layer)
    expect(layer.options.fillColor).toBe('#4ade80')
  })
})
