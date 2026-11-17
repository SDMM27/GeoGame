// Web only (index.web.js). Skia 2.6's web view creates a new WebGL surface, with its own Skia GPU context, each time it
// is laid out (on iPhone, every time Safari's toolbar shows or hides), and drops the previous one without deleting it.
// Deleting a surface also left its GPU context behind, with the textures and buffers it holds on the GPU, which iOS
// counts against the tab. So: a canvas's previous surface is deleted before a new one is made for it, and a deleted
// surface takes its GPU context with it.

type CkObject = { delete: () => void; isDeleted: () => boolean }
type GpuContext = CkObject & { releaseResourcesAndAbandonContext: () => void }
type Surface = CkObject
export type CanvasKitSurfaces = {
  MakeWebGLContext: (...args: unknown[]) => GpuContext | null
  MakeWebGLCanvasSurface: (canvas: unknown, ...args: unknown[]) => Surface | null
  Surface: { prototype: { delete: (this: Surface) => void } }
}

const PATCHED = Symbol('releasesReplacedSurfaces')

function releaseContext(context: GpuContext) {
  try {
    if (context.isDeleted()) return
    context.releaseResourcesAndAbandonContext()
    context.delete()
  } catch {
    // A lost WebGL context (an unmounted view) has nothing left to free on the GPU
  }
}

export function releaseReplacedSurfaces(ck: CanvasKitSurfaces & { [PATCHED]?: boolean }) {
  if (!ck || ck[PATCHED]) return
  ck[PATCHED] = true

  const contextOf = new WeakMap<Surface, GpuContext>()
  const surfaceOf = new WeakMap<object, Surface>()

  const deleteSurface = ck.Surface.prototype.delete
  ck.Surface.prototype.delete = function (this: Surface) {
    deleteSurface.call(this)
    const context = contextOf.get(this)
    contextOf.delete(this)
    if (context) releaseContext(context)
  }

  // The context made while a surface is being made (MakeWebGLCanvasSurface calls this.MakeWebGLContext)
  let made: GpuContext | null = null
  const makeContext = ck.MakeWebGLContext
  ck.MakeWebGLContext = function (this: unknown, ...args: unknown[]) {
    made = makeContext.apply(this, args)
    return made
  }

  const makeSurface = ck.MakeWebGLCanvasSurface
  ck.MakeWebGLCanvasSurface = function (this: unknown, canvas: unknown, ...args: unknown[]) {
    const isElement = typeof canvas === 'object' && canvas !== null
    // Before making the new one: the new GPU context then starts from a GL state no other context will touch
    const previous = isElement ? surfaceOf.get(canvas) : undefined
    if (previous && !previous.isDeleted()) previous.delete()
    made = null
    const surface = makeSurface.call(this, canvas, ...args)
    if (surface && made) contextOf.set(surface, made)
    if (surface && isElement) surfaceOf.set(canvas, surface)
    made = null
    return surface
  }
}
