// Red = land, green = borders, blue = graticule. Colors are applied by the globe shader
// at runtime, so this single texture works with both themes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import CanvasKitInit from 'canvaskit-wasm'
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const width = 2048, height = 1024
const kit = await CanvasKitInit({ wasmBinary: fs.readFileSync(path.join(root, 'public/canvaskit.wasm')) })
const countries = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/countries.json'), 'utf8'))
const projection = geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2])
const outline = kit.Path.MakeFromSVGString(geoPath(projection)(countries))
if (!outline) throw new Error('Could not construct globe mask')
const surface = kit.MakeSurface(width, height)
const canvas = surface.getCanvas()
canvas.clear(kit.TRANSPARENT)
const paint = new kit.Paint()
paint.setAntiAlias(true)
// Add independent coverage channels rather than overwriting one with another.
paint.setBlendMode(kit.BlendMode.Plus)
const grid = kit.Path.MakeFromSVGString(geoPath(projection)(geoGraticule10()))
paint.setStyle(kit.PaintStyle.Stroke)
paint.setStrokeWidth(1.4)
paint.setColor(kit.Color4f(0, 0, 1, 1))
canvas.drawPath(grid, paint)
paint.setStyle(kit.PaintStyle.Fill)
paint.setColor(kit.Color4f(1, 0, 0, 1))
canvas.drawPath(outline, paint)
paint.setStyle(kit.PaintStyle.Stroke)
paint.setStrokeWidth(1.5)
paint.setColor(kit.Color4f(0, 1, 0, 1))
canvas.drawPath(outline, paint)
const image = surface.makeImageSnapshot()
const png = image.encodeToBytes()
fs.writeFileSync(path.join(root, 'assets/images/globe-mask.png'), png)
console.log(`Globe mask: ${width} × ${height}, ${png.length} bytes`)
image.delete()
paint.delete()
outline.delete()
grid.delete()
surface.dispose()
