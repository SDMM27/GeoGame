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

function resourceKind(value, host) {
  if (typeof value !== 'string' || !value) return 'unknown'
  if (resourceKinds.has(value)) return value
  try {
    const resource = new URL(value)
    if (resource.protocol === 'data:' || resource.protocol === 'blob:') return resource.protocol
    if (resource.host === host) return 'same-origin'
    if (knownExternalHosts.has(resource.hostname)) return resource.hostname
    if (resource.hostname.endsWith('.basemaps.cartocdn.com')) return 'cartocdn'
    return 'other'
  } catch {
    return 'unknown'
  }
}

function documentKind(value, host) {
  if (typeof value !== 'string') return 'other'
  try {
    const page = new URL(value)
    if (page.host !== host) return 'other'
    if (page.pathname === '/') return 'home'
    if (page.pathname.startsWith('/player/')) return 'player'
    if (page.pathname.startsWith('/multiplayer/room/') || page.pathname.startsWith('/room/')) return 'room'
    return 'other'
  } catch {
    return 'other'
  }
}

export default async function cspReportHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const contentType = req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase()
  const legacy = contentType === 'application/csp-report'
  if (!legacy && contentType !== 'application/reports+json') return res.status(415).end()
  if (Number(req.headers['content-length']) > MAX_BYTES) return res.status(413).end()

  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let text = ''
  let payload
  try {
    // Vercel exposes the raw request stream until its lazy body getter is read.
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      bytes += chunk.byteLength
      if (bytes > MAX_BYTES) {
        req.resume()
        return res.status(413).end()
      }
      text += decoder.decode(chunk, { stream: true })
    }
    payload = JSON.parse(text + decoder.decode())
  } catch {
    return res.status(400).end()
  }

  const reports = legacy ? [payload?.['csp-report']] : payload
  if (!Array.isArray(reports)) return res.status(400).end()

  const host = req.headers.host
  const violations = []
  for (const report of reports.slice(0, MAX_REPORTS)) {
    if (!legacy && report?.type !== 'csp-violation') continue
    const body = legacy ? report : report.body
    const directive = legacy ? body?.['effective-directive'] : body?.effectiveDirective
    if (!directives.has(directive)) continue

    // Browser reports can contain user identifiers, URLs and source code. Log fixed categories only.
    violations.push({
      directive,
      document: documentKind(legacy ? body['document-uri'] : body.documentURL, host),
      resource: resourceKind(legacy ? body['blocked-uri'] : body.blockedURL, host),
    })
  }
  if (violations.length) console.info('[csp-report]', JSON.stringify(violations))
  return res.status(204).end()
}
