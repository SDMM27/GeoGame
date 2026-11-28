const MAX_BYTES = 16 * 1024
const MAX_REPORTS = 10

const directives = new Set([
  'base-uri', 'connect-src', 'default-src', 'font-src', 'form-action',
  'frame-ancestors', 'frame-src', 'img-src', 'manifest-src', 'object-src',
  'script-src', 'script-src-attr', 'script-src-elem', 'style-src',
  'style-src-attr', 'style-src-elem', 'worker-src',
])
const resourceKinds = new Set(['inline', 'eval', 'wasm-eval'])
const knownExternalHosts = new Set([
  'accounts.google.com', 'apis.google.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'www.google.com', 'www.gstatic.com', 'recaptcha.google.com', 'recaptchaenterprise.googleapis.com',
  'lh3.googleusercontent.com', 'flagcdn.com', 'firestore.googleapis.com',
  'firebaseappcheck.googleapis.com', 'content-firebaseappcheck.googleapis.com',
  'firebaseinstallations.googleapis.com', 'geogame-sdmm.firebaseapp.com',
  'identitytoolkit.googleapis.com', 'securetoken.googleapis.com',
])

function resourceKind(value, origin) {
  if (typeof value !== 'string' || !value) return 'unknown'
  if (resourceKinds.has(value)) return value
  try {
    const resource = new URL(value)
    if (resource.protocol === 'data:' || resource.protocol === 'blob:') return resource.protocol
    if (resource.origin === origin) return 'same-origin'
    if (knownExternalHosts.has(resource.hostname)) return resource.hostname
    if (resource.hostname.endsWith('.basemaps.cartocdn.com')) return 'cartocdn'
    return 'other'
  } catch {
    return 'unknown'
  }
}

function documentKind(value, origin) {
  if (typeof value !== 'string') return 'other'
  try {
    const page = new URL(value)
    if (page.origin !== origin) return 'other'
    if (page.pathname === '/') return 'home'
    if (page.pathname.startsWith('/player/')) return 'player'
    if (page.pathname.startsWith('/multiplayer/room/') || page.pathname.startsWith('/room/')) return 'room'
    return 'other'
  } catch {
    return 'other'
  }
}

function reply(status, extraHeaders) {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extraHeaders },
  })
}

async function fetch(request) {
  if (request.method !== 'POST') return reply(405, { Allow: 'POST' })

  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  const legacy = contentType === 'application/csp-report'
  if (!legacy && contentType !== 'application/reports+json') return reply(415)
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return reply(413)
  if (!request.body) return reply(400)

  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let text = ''
  let payload
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BYTES) {
        await reader.cancel()
        return reply(413)
      }
      text += decoder.decode(value, { stream: true })
    }
    payload = JSON.parse(text + decoder.decode())
  } catch {
    return reply(400)
  }

  const reports = legacy ? [payload?.['csp-report']] : payload
  if (!Array.isArray(reports)) return reply(400)

  const origin = new URL(request.url).origin
  const violations = []
  for (const report of reports.slice(0, MAX_REPORTS)) {
    if (!legacy && report?.type !== 'csp-violation') continue
    const body = legacy ? report : report.body
    const directive = legacy ? body?.['effective-directive'] : body?.effectiveDirective
    if (!directives.has(directive)) continue

    // Browser reports can contain user identifiers, URLs and source code. Log fixed categories only.
    violations.push({
      directive,
      document: documentKind(legacy ? body['document-uri'] : body.documentURL, origin),
      resource: resourceKind(legacy ? body['blocked-uri'] : body.blockedURL, origin),
    })
  }
  if (violations.length) console.info('[csp-report]', JSON.stringify(violations))
  return reply(204)
}

export default { fetch }
