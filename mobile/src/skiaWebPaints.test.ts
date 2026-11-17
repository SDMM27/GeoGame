import { releaseFramePaints, type SkiaPaintApi } from './skiaWebPaints'

// A stand-in for Skia's web API: paints wrap a CanvasKit object (`ref`) whose deletion is recorded
function makeSkia() {
  const deleted: CkRef[] = []
  class CkRef {
    delete() {
      deleted.push(this)
    }
  }
  class Paint {
    ref = new CkRef()
    copy() {
      const paint = new Paint()
      return paint
    }
    assign(paint: Paint) {
      void paint
      this.ref = new CkRef()
    }
    reset() {
      this.ref = new CkRef()
    }
  }
  class PictureRecorder {
    ref = new CkRef()
    beginRecording() {
      return {}
    }
    finishRecordingAsPicture() {
      return { picture: true }
    }
  }
  const Skia = { Paint: () => new Paint(), PictureRecorder: () => new PictureRecorder() }
  return { Skia: Skia as unknown as SkiaPaintApi & typeof Skia, deleted }
}

describe('releaseFramePaints', () => {
  it('deletes the paints made while a frame is recorded once its picture is finished', () => {
    const { Skia, deleted } = makeSkia()
    releaseFramePaints(Skia)
    const recorder = Skia.PictureRecorder()
    recorder.beginRecording()
    const base = Skia.Paint()
    const drawn = base.copy()
    expect(deleted).not.toContain(base.ref)
    expect(recorder.finishRecordingAsPicture()).toEqual({ picture: true })
    expect(deleted).toContain(base.ref)
    expect(deleted).toContain(drawn.ref)
  })

  it('keeps the paints made outside a frame', () => {
    const { Skia, deleted } = makeSkia()
    releaseFramePaints(Skia)
    const kept = Skia.Paint()
    const recorder = Skia.PictureRecorder()
    recorder.beginRecording()
    recorder.finishRecordingAsPicture()
    expect(deleted).not.toContain(kept.ref)
  })

  it('keeps a pooled paint written into during a frame, and deletes the object assign replaced', () => {
    const { Skia, deleted } = makeSkia()
    releaseFramePaints(Skia)
    const recorder = Skia.PictureRecorder()
    recorder.beginRecording()
    const pooled = Skia.Paint()
    const before = pooled.ref
    pooled.assign(Skia.Paint())
    recorder.finishRecordingAsPicture()
    expect(deleted).toContain(before)
    expect(deleted).not.toContain(pooled.ref)
  })

  it('deletes the object reset replaced', () => {
    const { Skia, deleted } = makeSkia()
    releaseFramePaints(Skia)
    const paint = Skia.Paint()
    const before = paint.ref
    paint.reset()
    expect(deleted).toContain(before)
    expect(deleted).not.toContain(paint.ref)
  })

  it('waits for the outermost recording of nested ones', () => {
    const { Skia, deleted } = makeSkia()
    releaseFramePaints(Skia)
    const outer = Skia.PictureRecorder()
    const inner = Skia.PictureRecorder()
    outer.beginRecording()
    const paint = Skia.Paint()
    inner.beginRecording()
    inner.finishRecordingAsPicture()
    expect(deleted).not.toContain(paint.ref)
    outer.finishRecordingAsPicture()
    expect(deleted).toContain(paint.ref)
  })

  it('patches the prototypes only once', () => {
    const { Skia } = makeSkia()
    releaseFramePaints(Skia)
    const proto = Object.getPrototypeOf(Skia.Paint())
    const assign = proto.assign
    releaseFramePaints(Skia)
    expect(proto.assign).toBe(assign)
  })
})
