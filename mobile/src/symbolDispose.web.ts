// Safari (iPhone included) has no Symbol.dispose yet. Skia's web objects free their WebAssembly memory through
// `this[Symbol.dispose]()`, so on Safari every dispose() threw and nothing was ever freed: the pictures of each
// animation frame piled up until CanvasKit hit its 2 GB ceiling and aborted ("Aborted()"), or iOS killed the tab and
// the game started over. Loaded first by index.web.js, before any Skia module defines its classes.
const symbols = Symbol as unknown as Record<'dispose' | 'asyncDispose', symbol | undefined>

if (typeof symbols.dispose !== 'symbol') {
  Object.defineProperty(Symbol, 'dispose', { value: Symbol('Symbol.dispose') })
}
if (typeof symbols.asyncDispose !== 'symbol') {
  Object.defineProperty(Symbol, 'asyncDispose', { value: Symbol('Symbol.asyncDispose') })
}

export {}
