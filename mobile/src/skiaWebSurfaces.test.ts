import { releaseReplacedSurfaces, type CanvasKitSurfaces } from './skiaWebSurfaces'

// A stand-in for CanvasKit: surfaces and GPU contexts whose deletion and release are recorded
function makeCanvasKit() {
  const events: string[] = []
  let count = 0
  class Handle {
    deleted = false
    constructor(readonly name: string) {}
    isDeleted() {
      return this.deleted
    }
  }
  class Context extends Handle {
    delete() {
      this.deleted = true
      events.push(`delete ${this.name}`)
    }
    releaseResourcesAndAbandonContext() {
      events.push(`release ${this.name}`)
    }
  }
  class Surface extends Handle {
    delete() {
      this.deleted = true
      events.push(`delete ${this.name}`)
    }
  }
  const ck = {
    MakeWebGLContext(): Context {
      count++
      events.push(`make context${count}`)
      return new Context(`context${count}`)
    },
    MakeWebGLCanvasSurface(this: { MakeWebGLContext: () => Context }, canvas: unknown) {
      void canvas
      this.MakeWebGLContext()
      events.push(`make surface${count}`)
      return new Surface(`surface${count}`)
    },
    Surface,
  }
  return { ck: ck as unknown as CanvasKitSurfaces & typeof ck, events }
}

describe('releaseReplacedSurfaces', () => {
  it("deletes a canvas's previous surface and its GPU context before making the new one", () => {
    const { ck, events } = makeCanvasKit()
    releaseReplacedSurfaces(ck)
    const canvas = {}
    ck.MakeWebGLCanvasSurface(canvas)
    events.length = 0
    ck.MakeWebGLCanvasSurface(canvas)
    expect(events).toEqual([
      'delete surface1',
      'release context1',
      'delete context1',
      'make context2',
      'make surface2',
    ])
  })

  it('keeps the surfaces of other canvases', () => {
    const { ck, events } = makeCanvasKit()
    releaseReplacedSurfaces(ck)
    ck.MakeWebGLCanvasSurface({})
    ck.MakeWebGLCanvasSurface({})
    expect(events.filter((event) => event.startsWith('delete'))).toEqual([])
  })

  it('frees the GPU context of a surface deleted by its view', () => {
    const { ck, events } = makeCanvasKit()
    releaseReplacedSurfaces(ck)
    const surface = ck.MakeWebGLCanvasSurface({}) as unknown as { delete: () => void }
    events.length = 0
    surface.delete()
    expect(events).toEqual(['delete surface1', 'release context1', 'delete context1'])
  })

  it('does not delete again a surface its view already deleted', () => {
    const { ck, events } = makeCanvasKit()
    releaseReplacedSurfaces(ck)
    const canvas = {}
    const surface = ck.MakeWebGLCanvasSurface(canvas) as unknown as { delete: () => void }
    surface.delete()
    events.length = 0
    ck.MakeWebGLCanvasSurface(canvas)
    expect(events).toEqual(['make context2', 'make surface2'])
  })

  it('patches CanvasKit only once', () => {
    const { ck } = makeCanvasKit()
    releaseReplacedSurfaces(ck)
    const make = ck.MakeWebGLCanvasSurface
    releaseReplacedSurfaces(ck)
    expect(ck.MakeWebGLCanvasSurface).toBe(make)
  })
})
