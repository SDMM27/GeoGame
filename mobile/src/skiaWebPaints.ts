// Web only (index.web.js). Skia 2.6's web renderer leaks paints on every frame it draws, in CanvasKit's WebAssembly
// memory, which no garbage collection reclaims:
// - each draw works on a copy of the current paint (`paint.copy()`), never deleted;
// - `assign()` replaces a pooled paint's CanvasKit object with a copy and drops the old one;
// - each frame starts from a new base paint, and some nodes from a fresh one, never deleted either.
// The game map draws ~1500 things a frame: every pan or pinch grew the memory by ~2 MB until Safari on iPhone killed
// the tab. Skia 2.14 fixes this upstream; until the app moves to it (a new native build), the paints made while a
// frame is recorded are deleted once its picture is finished (the picture keeps its own copy of each paint), and
// `assign()` deletes the object it replaces. Pooled paints, which `assign()` writes into, live on to the next frames.

type CkObject = { delete: () => void }
type Paint = { ref: CkObject; copy: () => Paint; assign: (paint: Paint) => void; reset: () => void }
type Recorder = { beginRecording: (...args: unknown[]) => unknown; finishRecordingAsPicture: () => unknown }
export type SkiaPaintApi = { Paint: () => Paint; PictureRecorder: () => Recorder }

const PATCHED = Symbol('releasesFramePaints')

export function releaseFramePaints(Skia: SkiaPaintApi) {
  const sample = Skia.Paint()
  const paintProto = Object.getPrototypeOf(sample) as Paint & { [PATCHED]?: boolean }
  sample.ref.delete()
  if (paintProto[PATCHED]) return
  paintProto[PATCHED] = true

  // Paints made since the outermost recording began
  let depth = 0
  let framePaints = new Set<Paint>()
  const track = (paint: Paint) => {
    if (depth > 0) framePaints.add(paint)
    return paint
  }

  const { assign, reset, copy } = paintProto
  paintProto.assign = function (this: Paint, paint: Paint) {
    const previous = this.ref
    assign.call(this, paint)
    if (previous && previous !== this.ref) previous.delete()
    // Written into: a pooled paint, reused by the next frames
    framePaints.delete(this)
  }
  paintProto.reset = function (this: Paint) {
    const previous = this.ref
    reset.call(this)
    if (previous && previous !== this.ref) previous.delete()
  }
  paintProto.copy = function (this: Paint) {
    return track(copy.call(this))
  }
  const makePaint = Skia.Paint
  Skia.Paint = () => track(makePaint())

  const sampleRecorder = Skia.PictureRecorder()
  const recorderProto = Object.getPrototypeOf(sampleRecorder) as Recorder
  ;(sampleRecorder as unknown as { ref: CkObject }).ref.delete()
  const { beginRecording, finishRecordingAsPicture } = recorderProto
  recorderProto.beginRecording = function (this: Recorder, ...args: unknown[]) {
    depth++
    return beginRecording.apply(this, args)
  }
  recorderProto.finishRecordingAsPicture = function (this: Recorder) {
    const picture = finishRecordingAsPicture.call(this)
    depth = Math.max(0, depth - 1)
    if (depth === 0 && framePaints.size) {
      const done = framePaints
      framePaints = new Set()
      done.forEach((paint) => paint.ref.delete())
    }
    return picture
  }
}
