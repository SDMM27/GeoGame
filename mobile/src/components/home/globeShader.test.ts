/// <reference types="node" />

import CanvasKitInit, { type CanvasKit } from 'canvaskit-wasm'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TextDecoder } from 'node:util'

import { viewBasis } from './globeMath'
import { GLOBE_LAND_SHADER } from './globeShader'

let kit: CanvasKit
const decoderDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'TextDecoder')!
beforeAll(async () => {
  // CanvasKit also decodes UTF-16; Expo's test polyfill only implements UTF-8.
  Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, writable: true, value: TextDecoder })
  const options: NonNullable<Parameters<typeof CanvasKitInit>[0]> & { wasmBinary: Uint8Array } = {
    wasmBinary: readFileSync(join(__dirname, '../../../public/canvaskit.wasm')),
  }
  kit = await CanvasKitInit(options)
})
afterAll(() => Object.defineProperty(globalThis, 'TextDecoder', decoderDescriptor))

test('the actual Skia shader projects the mask onto land and ocean in different hemispheres', () => {
  const effect = kit.RuntimeEffect.Make(GLOBE_LAND_SHADER, (error) => { throw new Error(error) })!
  expect(effect).not.toBeNull()
  const image = kit.MakeImageFromEncoded(readFileSync(join(__dirname, '../../../assets/images/globe-mask.png')))!
  const mask = image.makeShaderOptions(kit.TileMode.Repeat, kit.TileMode.Clamp, kit.FilterMode.Linear, kit.MipmapMode.None)
  // Fully opaque land and borders; hide the graticule to test geographic coverage.
  for (const [lon, lat, land] of [[2.35, 48.86, true], [31.2, 30, true], [36.8, -1.3, true], [-150, 0, false], [-30, 0, false]] as const) {
    const uniforms = [170.5, 170.5, 136, ...viewBasis(lon, lat), 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]
    const shader = effect.makeShaderWithChildren(uniforms, [mask])
    const surface = kit.MakeSurface(340, 340)!
    const paint = new kit.Paint()
    paint.setShader(shader)
    surface.getCanvas().drawPaint(paint)
    const snapshot = surface.makeImageSnapshot()
    const pixelInfo = { width: 1, height: 1, colorType: kit.ColorType.RGBA_8888, alphaType: kit.AlphaType.Unpremul, colorSpace: kit.ColorSpace.SRGB }
    const center = snapshot.readPixels(170, 170, pixelInfo)!
    expect(center[3]).toBe(land ? 255 : 0)
    expect(snapshot.readPixels(0, 0, pixelInfo)![3]).toBe(0)
    snapshot.delete()
    paint.delete()
    shader.delete()
    surface.dispose()
  }
  mask.delete()
  image.delete()
  effect.delete()
})
