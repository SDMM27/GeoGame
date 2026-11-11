import { geoArea } from 'd3-geo'

import { landData, landPolygons } from './globeLand'

// geometry.ts builds Skia paths on import: the land only needs the dataset
jest.mock('@shopify/react-native-skia', () => ({ Skia: { Path: { MakeFromSVGString: () => null } } }))

test('no simplified land polygon turns into the rest of the sphere', () => {
  for (const polygon of landPolygons()) {
    // A ring wound the wrong way (or flattened) is read by d3 as its complement: more than a hemisphere
    expect(geoArea({ type: 'Polygon', coordinates: [polygon[0]] })).toBeLessThan(2 * Math.PI)
  }
})

test('the flat land data is consistent: unit vectors, ring offsets, caps that contain their ring', () => {
  const { vertices, starts, caps } = landData()
  const rings = starts.length - 1
  expect(rings).toBeGreaterThan(100)
  expect(vertices.length).toBe(starts[rings] * 3)
  expect(caps.length).toBe(rings * 4)
  for (let k = 0; k < rings; k++) {
    expect(starts[k + 1]).toBeGreaterThan(starts[k])
    const [cx, cy, cz, sin] = [caps[4 * k], caps[4 * k + 1], caps[4 * k + 2], caps[4 * k + 3]]
    for (let i = starts[k]; i < starts[k + 1]; i++) {
      const [x, y, z] = [vertices[3 * i], vertices[3 * i + 1], vertices[3 * i + 2]]
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 4)
      // Every vertex is within the cap radius of its center: cos(angle) >= -sin only matters for caps < 90 degrees
      if (sin < 1) expect(Math.acos(Math.min(1, cx * x + cy * y + cz * z))).toBeLessThanOrEqual(Math.asin(sin) + 1e-3)
    }
  }
})
