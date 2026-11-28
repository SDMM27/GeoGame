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

function readReportBody(req) {
  // Vercel replays the buffered body through data/end listeners on the incoming request.
  return new Promise((resolve, reject) => {
    const chunks = []
    let bytes = 0
    req.on('error', reject)
    req.on('data', (chunk) => {
      if (bytes > MAX_BYTES) return
      bytes += chunk.byteLength
      if (bytes > MAX_BYTES) {
        chunks.length = 0
        resolve(null)
      } else {
        chunks.push(chunk)
      }
    })
    req.on('end', () => resolve(Buffer.concat(chunks, bytes <= MAX_BYTES ? bytes : 0)))
  })
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

  let payload
  try {
    const body = await readReportBody(req)
    if (body === null) return res.status(413).end()
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body))
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
