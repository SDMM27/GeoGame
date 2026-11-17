// Web only (index.web.js). Skia records a new SkPicture on every frame of an animation (a pan, a pinch, the map flying
// to a country) and hands it to the view, which drops the previous one without deleting it. A picture keeps its own
// copy of every path it draws (the whole world, twice, for the game maps) in CanvasKit's WebAssembly memory, which the
// garbage collector does not see: it is only freed whenever a collection happens to run. Safari on iPhone killed the
// tab well before that, and the page reloaded in the middle of the game. So each view's previous picture is deleted
// as soon as a new one replaces it.

type Picture = { dispose?: () => void }
type ViewApi = {
  deferedPictures: Record<string, Picture | undefined>
  setJsiProperty: (nativeId: number | string, name: string, value: unknown) => void
  __releasesPictures?: boolean
}

export function releaseReplacedPictures(api: ViewApi | undefined = (globalThis as { SkiaViewApi?: ViewApi }).SkiaViewApi) {
  if (!api || api.__releasesPictures) return
  api.__releasesPictures = true
  const shown = new Map<string, Picture>()
  const setJsiProperty = api.setJsiProperty.bind(api)
  api.setJsiProperty = (nativeId, name, value) => {
    setJsiProperty(nativeId, name, value)
    if (name !== 'picture' || !value) return
    const key = String(nativeId)
    const previous = shown.get(key)
    shown.set(key, value as Picture)
    if (!previous || previous === value) return
    // A view registered later would otherwise be handed a deleted picture
    if (api.deferedPictures[key] === previous) delete api.deferedPictures[key]
    previous.dispose?.()
  }
}
